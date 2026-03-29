# Performance Optimization Design

## Problem

The website is painfully slow. Every page under `/m/[slug]/` feels uniformly sluggish, with initial loads being the worst. Root causes identified through code audit:

1. **Layout waterfall**: 5 sequential `await` calls in the tenant layout run on every single page (~200-400ms wasted)
2. **No request deduplication**: Pages re-fetch the same data the layout already fetched (mosque, profile, membership)
3. **Sequential dashboard queries**: 6+ conditional queries run one after another instead of in parallel
4. **N+1 query patterns**: Admin programs page (3 queries + JS loop), parent dashboard (1 + 2N queries per child)
5. **Inefficient cache invalidation**: ~20+ `revalidatePath()` calls across server actions instead of surgical tag-based revalidation
6. **External API on every load**: Stripe `accounts.retrieve()` called on every settings page visit
7. **Over-fetching**: `select *` queries transfer unnecessary columns; client-side filtering instead of DB-side
8. **No image optimization**: Raw `<img>` tags instead of `next/image`; empty `next.config.ts`

## Approach

Bottom-up: write unit tests for query functions first (snapshot current behavior), then optimize from highest to lowest impact. Run E2E suite after each major change category.

## Section 1: React.cache() Deduplication Layer

### What

Create cached wrappers for the most-reused query functions so that within a single server render pass, the second call returns instantly.

### Design

New file `lib/supabase/cached-queries.ts`:

```ts
import { cache } from "react";
import { getMosqueBySlug, getProfileForCurrentUser, getMosqueMembershipForUser } from "./queries";

export const getCachedMosqueBySlug = cache(getMosqueBySlug);
export const getCachedProfile = cache(getProfileForCurrentUser);
export const getCachedMembership = cache(getMosqueMembershipForUser);
```

Update imports in `app/m/[slug]/layout.tsx` and all pages under `app/m/[slug]/` to use cached versions.

### Files touched

- New: `lib/supabase/cached-queries.ts`
- Modified: `app/m/[slug]/layout.tsx`, all pages under `app/m/[slug]/`

### Expected impact

Eliminates duplicate queries between layout and child pages. Saves ~150-300ms per page load.

## Section 2: Layout Waterfall Fix

### What

Parallelize independent queries in `app/m/[slug]/layout.tsx` where the dependency chain allows.

### Design

Current sequential chain:
```
getMosqueBySlug(slug)        → ~50-100ms
createClient()               → ~10ms
supabase.auth.getUser()      → ~50-100ms
getProfileForCurrentUser()   → ~50-100ms
getMosqueMembershipForUser() → ~50-100ms (needs profile.id + mosque.id)
```

Optimized:
```ts
// Step 1: mosque + supabase client in parallel
const [mosque, supabase] = await Promise.all([
  getCachedMosqueBySlug(slug),
  createClient(),
]);
if (!mosque) notFound();

// Step 2: auth check
const { data: { user } } = await supabase.auth.getUser();

if (user) {
  // Step 3: profile (needs auth internally)
  const profile = await getCachedProfile();
  // Step 4: membership (needs profile.id + mosque.id)
  const membership = profile
    ? await getCachedMembership(profile.id, mosque.id)
    : null;
}
```

### Files touched

- `app/m/[slug]/layout.tsx`

### Expected impact

~50-100ms saved from parallelizing mosque + client. Combined with Section 1's cache dedup, pages save ~200-400ms total.

## Section 3: Dashboard Query Parallelization

### What

Parallelize the 6 conditional queries in `app/m/[slug]/dashboard/page.tsx` that currently run sequentially.

### Design

Replace sequential conditional awaits with `Promise.all()`:

```ts
const [enrollments, teachingPrograms, studentApplications, teacherApplications, teacherStats, adminStats] =
  await Promise.all([
    isStudentOnly ? getEnrollmentsForStudentInMosque(profile.id, mosque.id) : [],
    isTeacherLike ? getProgramsForTeacherInMosque(profile.id, mosque.id) : [],
    isStudentOnly ? getStudentProgramApplicationsInMosque(profile.id, mosque.id) : [],
    isTeacherLike ? getTeacherProgramApplicationsInMosque(profile.id, mosque.id) : [],
    isTeacherLike ? getTeacherDashboardStats(profile.id, mosque.id) : null,
    canManagePrograms ? getAdminDashboardStats(mosque.id) : null,
  ]);
```

`getLatestAnnouncementsForPrograms` stays sequential since it depends on program IDs from the results above.

Also replace `getMosqueBySlug`, `getProfileForCurrentUser`, `getMosqueMembershipForUser` with cached versions from Section 1.

### Files touched

- `app/m/[slug]/dashboard/page.tsx`

### Expected impact

~200-400ms saved. Six sequential DB round trips become one parallel batch.

## Section 4: N+1 Query Fixes

### 4a: Admin Programs Page

**Current** (`queries.ts:526-601`): Three separate queries (programs, teacher profiles via `.in()`, enrollments) plus a JS loop to count enrollments per program.

**Fix**: Collapse into a single query using Supabase joins:
```ts
const { data } = await supabase
  .from("programs")
  .select("*, teacher:profiles!teacher_profile_id(id, full_name), enrollments(count)")
  .eq("mosque_id", mosqueId);
```

This gets programs with teacher names and enrollment counts in one round trip. Note: the `enrollments(count)` aggregate syntax depends on PostgREST support — verify during implementation and fall back to a `.rpc()` call if needed.

### 4b: Parent Dashboard

**Current** (`ParentDashboard.tsx`): Fetches children, then per-child fetches enrollments + applications (1 + 2N queries).

**Fix**: Fetch all children first, collect child IDs, then batch:
```ts
const childIds = children.map(c => c.child_profile_id);
const [allEnrollments, allApplications] = await Promise.all([
  getChildEnrollmentsBatch(childIds, mosqueId),
  getChildApplicationsBatch(childIds, mosqueId),
]);
```

New batch query functions use `.in("student_profile_id", childIds)` instead of per-child queries.

### 4c: Announcements

**Current** (`queries.ts:752-789`): Fetches all announcements then filters in JS for latest per program.

**Fix**: Use `.in("program_id", programIds)` with `.order("created_at", { ascending: false })` and deduplicate at query level.

### Files touched

- `lib/supabase/queries.ts` (refactor 3 query functions, add 2 batch functions)
- `components/dashboard/ParentDashboard.tsx`
- `app/m/[slug]/admin/programs/page.tsx` (adapt to new data shape if needed)

### Expected impact

Admin programs: 3 queries to 1. Parent dashboard: 1+2N to 3. Announcements: eliminates JS filtering.

## Section 5: Caching & Revalidation

### 5a: Tag-Based Revalidation

**Current**: ~20+ `revalidatePath()` calls scattered across server action files. Each invalidates entire route caches.

**Fix**: Tag queries with logical names and use `revalidateTag()` for surgical invalidation.

Tags:
- `mosque-programs` — program list/detail queries
- `enrollments` — enrollment queries
- `applications` — application queries
- `profile` — profile queries
- `announcements` — announcement queries
- `admin-stats` — dashboard stat queries

Server actions call `revalidateTag("enrollments")` instead of invalidating 4-5 paths.

Query functions use `unstable_cache` (or its stable equivalent in Next.js 16 if renamed) with appropriate tags, or Next.js fetch-level tagging where applicable. Verify the exact API during implementation.

### 5b: Stripe Status Caching

**Current**: `stripe.accounts.retrieve()` called on every settings page load for admins (~200-500ms).

**Fix**: Cache `charges_enabled` status. Options:
- Store in `mosques` table as `stripe_charges_enabled` boolean, updated via Stripe webhook
- Or use `unstable_cache` with a `stripe-status` tag and revalidate on webhook

Prefer the webhook approach since Stripe Connect status changes are event-driven. Listen for the `account.updated` webhook event to refresh the cached status.

### 5c: Select Specificity

Replace `select("*")` with explicit column lists on the heaviest queries:
- `getMosqueBySlug` — exclude `welcome_description`, `features` on list views
- `getAdminProgramCardsByMosqueId` — only columns needed for cards
- `getProgramsByMosqueIdIncludingInactive` — only columns needed for list

### Files touched

- All files in `app/actions/` (revalidatePath to revalidateTag)
- `lib/supabase/queries.ts` (add cache tags, select specificity)
- `app/m/[slug]/settings/page.tsx` (Stripe caching)
- Possibly `app/api/stripe/webhook/route.ts` (update cached status)

### Expected impact

Faster cache invalidation, fewer unnecessary rebuilds. Stripe settings page saves ~200-500ms.

## Section 6: Images & Config

### 6a: next/image Migration

Replace raw `<img>` tags with `next/image` in:
- `app/m/[slug]/layout.tsx` (mosque logo — 3 instances)
- `app/m/[slug]/page.tsx` (mosque logo)
- Any other pages rendering user avatars or images

Benefits: automatic WebP/AVIF conversion, lazy loading, responsive sizing, layout shift prevention.

### 6b: next.config.ts

Add image optimization config:
```ts
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};
```

### Files touched

- `next.config.ts`
- `app/m/[slug]/layout.tsx`
- `app/m/[slug]/page.tsx`
- Any components with `<img>` tags for dynamic content

### Expected impact

Smaller image payloads, faster rendering, better Core Web Vitals (LCP, CLS).

## Section 7: Unit Tests for Query Functions

### What

Write Vitest unit tests for query functions before refactoring them. Tests mock the Supabase client and assert returned data shapes.

### Functions to test

- `getMosqueBySlug`
- `getProfileForCurrentUser`
- `getMosqueMembershipForUser`
- `getEnrollmentsForStudentInMosque`
- `getAdminProgramCardsByMosqueId`
- `getChildrenForParent`
- `getChildEnrollments`
- `getChildApplications`
- `getLatestAnnouncementsForPrograms`
- `getProgramsForTeacherInMosque`
- `getStudentProgramApplicationsInMosque`
- `getTeacherProgramApplicationsInMosque`
- `getTeacherDashboardStats`
- `getAdminDashboardStats`

### Test approach

- Mock `createClient()` to return a chainable Supabase mock
- Assert return value shape and key fields
- Test error cases (not found, auth failure)
- These tests snapshot current behavior so refactors are safe

### Files touched

- New: `tests/queries.test.ts` (or split into `tests/queries/*.test.ts` by domain)

## Implementation Order

1. **Write query unit tests** (Section 7)
2. **React.cache() layer** (Section 1) — run E2E
3. **Layout waterfall fix** (Section 2) — run E2E
4. **Dashboard parallelization** (Section 3) — run E2E
5. **N+1 query fixes** (Section 4) — run unit tests + E2E
6. **Caching & revalidation** (Section 5) — run E2E
7. **Images & config** (Section 6) — run E2E

Each step is independently deployable. If any step causes regressions, it can be reverted without affecting the others.
