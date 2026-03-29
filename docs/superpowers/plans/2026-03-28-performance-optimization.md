# Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate page load bottlenecks across the entire tenant portal by parallelizing queries, deduplicating requests, fixing N+1 patterns, and optimizing caching/images.

**Architecture:** Bottom-up approach — write unit tests for query functions first (snapshot current behavior), then optimize from highest to lowest impact. Each task is independently deployable. Run E2E suite after each major change category.

**Tech Stack:** Next.js 16 (App Router, Server Components), React 19, Supabase (PostgREST), Stripe, Vitest, Playwright, Netlify

**Spec:** `docs/superpowers/specs/2026-03-28-performance-optimization-design.md`

---

## File Structure

### New files
- `lib/supabase/cached-queries.ts` — React.cache() wrappers for deduplicated query functions
- `tests/queries/core-queries.test.ts` — Unit tests for mosque/profile/membership queries
- `tests/queries/dashboard-queries.test.ts` — Unit tests for dashboard-specific queries
- `tests/queries/admin-queries.test.ts` — Unit tests for admin program card queries
- `tests/queries/parent-queries.test.ts` — Unit tests for parent/child queries

### Modified files
- `lib/supabase/queries.ts` — N+1 fixes, batch functions, select specificity, announcements optimization
- `app/m/[slug]/layout.tsx` — Cached imports, parallelized queries, next/image
- `app/m/[slug]/dashboard/page.tsx` — Cached imports, parallelized queries
- `app/m/[slug]/page.tsx` — Cached imports, next/image
- `app/m/[slug]/settings/page.tsx` — Cached imports, Stripe caching
- `app/m/[slug]/programs/page.tsx` — Cached imports
- `app/m/[slug]/programs/[programId]/page.tsx` — Cached imports
- `app/m/[slug]/classes/page.tsx` — Cached imports
- `app/m/[slug]/classes/[programId]/page.tsx` — Cached imports
- `app/m/[slug]/students/page.tsx` — Cached imports
- `app/m/[slug]/teacher/programs/page.tsx` — Cached imports
- `app/m/[slug]/teacher/programs/[programId]/page.tsx` — Cached imports
- `app/m/[slug]/teacher/programs/[programId]/edit/page.tsx` — Cached imports
- `app/m/[slug]/admin/programs/page.tsx` — Cached imports, adapted to joined query shape
- `app/m/[slug]/admin/programs/new/page.tsx` — Cached imports
- `app/m/[slug]/admin/programs/[programId]/page.tsx` — Cached imports
- `app/m/[slug]/admin/programs/[programId]/edit/page.tsx` — Cached imports
- `app/m/[slug]/admin/teacher-requests/page.tsx` — Cached imports
- `app/m/[slug]/admin/members/page.tsx` — Cached imports
- `app/m/[slug]/choose-role/page.tsx` — Cached imports
- `components/dashboard/ParentDashboard.tsx` — Batch child queries
- `app/actions/applications.ts` — revalidateTag migration
- `app/actions/enrollments.ts` — revalidateTag migration
- `app/actions/profile.ts` — revalidateTag migration
- `app/actions/programs.ts` — revalidateTag migration
- `app/actions/announcements.ts` — revalidateTag migration
- `app/actions/members.ts` — revalidateTag migration
- `app/actions/teacher-requests.ts` — revalidateTag migration
- `app/api/stripe/webhook/route.ts` — Stripe status cache revalidation
- `next.config.ts` — Image remote patterns
- `components/Sidebar.tsx` — next/image
- `components/AppShellClient.tsx` — next/image
- `components/programs/ProgramCard.tsx` — next/image
- `components/dashboard/StudentEnrollmentCard.tsx` — next/image
- `components/dashboard/TeacherProgramCard.tsx` — next/image

---

## Task 1: Unit Tests — Core Query Functions

**Files:**
- Create: `tests/queries/core-queries.test.ts`

- [ ] **Step 1: Create test directory and helper**

```bash
mkdir -p tests/queries
```

- [ ] **Step 2: Write unit tests for getMosqueBySlug, getProfileForCurrentUser, getMosqueMembershipForUser**

```ts
// tests/queries/core-queries.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the server client before importing queries
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
} from "@/lib/supabase/queries";

// Helper to build a chainable Supabase mock
function mockSupabaseQuery(resolvedData: any, resolvedError: any = null) {
  const chain: any = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: resolvedData, error: resolvedError }),
    maybeSingle: vi.fn().mockResolvedValue({ data: resolvedData, error: resolvedError }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },
  };
  return chain;
}

describe("getMosqueBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mosque data for valid slug", async () => {
    const mockMosque = {
      id: "mosque-1",
      name: "Test Mosque",
      slug: "test-mosque",
      primary_color: "#111827",
      secondary_color: "#111827",
      logo_url: null,
      stripe_account_id: null,
    };
    const supabase = mockSupabaseQuery(mockMosque);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getMosqueBySlug("test-mosque");

    expect(result).toEqual(mockMosque);
    expect(supabase.from).toHaveBeenCalledWith("mosques");
    expect(supabase.eq).toHaveBeenCalledWith("slug", "test-mosque");
    expect(supabase.single).toHaveBeenCalled();
  });

  it("returns null when mosque not found", async () => {
    const supabase = mockSupabaseQuery(null, { message: "not found" });
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getMosqueBySlug("nonexistent");

    expect(result).toBeNull();
  });
});

describe("getProfileForCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when user is not authenticated", async () => {
    const supabase = mockSupabaseQuery(null);
    supabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: "not authenticated" },
    });
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getProfileForCurrentUser();

    expect(result).toBeNull();
  });

  it("returns profile for authenticated user", async () => {
    const mockProfile = {
      id: "user-1",
      full_name: "Test User",
      email: "test@example.com",
      phone_number: null,
      avatar_url: null,
      gender: null,
      age: null,
    };
    const supabase = mockSupabaseQuery(mockProfile);
    supabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getProfileForCurrentUser();

    expect(result).toEqual(mockProfile);
    expect(supabase.from).toHaveBeenCalledWith("profiles");
    expect(supabase.eq).toHaveBeenCalledWith("id", "user-1");
  });
});

describe("getMosqueMembershipForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns membership when user is a member", async () => {
    const mockMembership = {
      id: "mem-1",
      profile_id: "user-1",
      mosque_id: "mosque-1",
      role: "student",
      can_manage_programs: false,
    };
    const supabase = mockSupabaseQuery(mockMembership);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getMosqueMembershipForUser("user-1", "mosque-1");

    expect(result).toEqual(mockMembership);
    expect(supabase.from).toHaveBeenCalledWith("mosque_memberships");
    expect(supabase.eq).toHaveBeenCalledWith("profile_id", "user-1");
    expect(supabase.eq).toHaveBeenCalledWith("mosque_id", "mosque-1");
  });

  it("returns null when user is not a member", async () => {
    const supabase = mockSupabaseQuery(null);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getMosqueMembershipForUser("user-1", "mosque-1");

    expect(result).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest tests/queries/core-queries.test.ts --run`
Expected: All 5 tests pass

- [ ] **Step 4: Commit**

```bash
git add tests/queries/core-queries.test.ts
git commit -m "test: add unit tests for core query functions (mosque, profile, membership)"
```

---

## Task 2: Unit Tests — Dashboard Query Functions

**Files:**
- Create: `tests/queries/dashboard-queries.test.ts`

- [ ] **Step 1: Write unit tests for dashboard queries**

```ts
// tests/queries/dashboard-queries.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  getEnrollmentsForStudentInMosque,
  getProgramsForTeacherInMosque,
  getStudentProgramApplicationsInMosque,
  getTeacherProgramApplicationsInMosque,
  getTeacherDashboardStats,
  getAdminDashboardStats,
  getLatestAnnouncementsForPrograms,
} from "@/lib/supabase/queries";

// Chainable mock that resolves from the final query method
function mockSupabaseChain(resolvedData: any, resolvedError: any = null) {
  const chain: any = {};
  const methods = ["from", "select", "eq", "in", "order"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Terminal methods
  chain.single = vi.fn().mockResolvedValue({ data: resolvedData, error: resolvedError });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: resolvedData, error: resolvedError });
  // Default: query resolves via the chain itself (for queries without .single())
  chain.then = (resolve: any) => resolve({ data: resolvedData, error: resolvedError });
  // Make it thenable so await works on the chain directly
  Object.defineProperty(chain, "then", {
    value: (resolve: any, reject: any) =>
      Promise.resolve({ data: resolvedData, error: resolvedError }).then(resolve, reject),
    writable: true,
  });
  chain.auth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    }),
  };
  return chain;
}

describe("getEnrollmentsForStudentInMosque", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns mapped enrollments with program data", async () => {
    const mockData = [
      {
        id: "enroll-1",
        program_id: "prog-1",
        programs: {
          id: "prog-1",
          mosque_id: "mosque-1",
          title: "Quran 101",
          description: "Learn Quran",
          is_active: true,
          schedule: [{ day: "monday", start: "09:00:00", end: "10:00:00" }],
          schedule_timezone: "America/Edmonton",
        },
      },
    ];
    const supabase = mockSupabaseChain(mockData);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getEnrollmentsForStudentInMosque("user-1", "mosque-1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("enroll-1");
    expect(result[0].programs?.title).toBe("Quran 101");
    expect(result[0].programs?.schedule).toEqual([{ day: "monday", start: "09:00:00", end: "10:00:00" }]);
  });

  it("returns empty array on no enrollments", async () => {
    const supabase = mockSupabaseChain([]);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getEnrollmentsForStudentInMosque("user-1", "mosque-1");

    expect(result).toEqual([]);
  });
});

describe("getTeacherDashboardStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns zero counts when teacher has no programs", async () => {
    const supabase = mockSupabaseChain([]);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getTeacherDashboardStats("teacher-1", "mosque-1");

    expect(result).toEqual({ class_count: 0, student_count: 0 });
  });
});

describe("getAdminDashboardStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls correct tables for stats", async () => {
    // This is a multi-query function; we need sequential mock results
    // For this test we verify it handles empty data gracefully
    const supabase = mockSupabaseChain([]);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getAdminDashboardStats("mosque-1");

    expect(result).toHaveProperty("total_program_count");
    expect(result).toHaveProperty("active_program_count");
    expect(result).toHaveProperty("teacher_count");
    expect(result).toHaveProperty("student_count");
  });
});

describe("getLatestAnnouncementsForPrograms", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty array for empty program IDs", async () => {
    const result = await getLatestAnnouncementsForPrograms([]);

    expect(result).toEqual([]);
  });

  it("deduplicates to latest announcement per program", async () => {
    const mockData = [
      { id: "ann-2", program_id: "prog-1", message: "Latest", created_at: "2026-03-28T12:00:00Z", author_profile_id: "a-1", profiles: { id: "a-1", full_name: "Teacher", avatar_url: null } },
      { id: "ann-1", program_id: "prog-1", message: "Older", created_at: "2026-03-27T12:00:00Z", author_profile_id: "a-1", profiles: { id: "a-1", full_name: "Teacher", avatar_url: null } },
      { id: "ann-3", program_id: "prog-2", message: "Other", created_at: "2026-03-28T12:00:00Z", author_profile_id: "a-1", profiles: { id: "a-1", full_name: "Teacher", avatar_url: null } },
    ];
    const supabase = mockSupabaseChain(mockData);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getLatestAnnouncementsForPrograms(["prog-1", "prog-2"]);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("ann-2"); // Latest for prog-1
    expect(result[1].id).toBe("ann-3"); // Latest for prog-2
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest tests/queries/dashboard-queries.test.ts --run`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/queries/dashboard-queries.test.ts
git commit -m "test: add unit tests for dashboard query functions"
```

---

## Task 3: Unit Tests — Admin & Parent Query Functions

**Files:**
- Create: `tests/queries/admin-queries.test.ts`
- Create: `tests/queries/parent-queries.test.ts`

- [ ] **Step 1: Write admin program card tests**

```ts
// tests/queries/admin-queries.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getAdminProgramCardsByMosqueId } from "@/lib/supabase/queries";

// Multi-step mock: getAdminProgramCardsByMosqueId calls .from() 3 times
function mockMultiQuerySupabase(programsData: any, teacherData: any, enrollmentData: any) {
  let callCount = 0;
  const datasets = [
    { data: programsData, error: null },
    { data: teacherData, error: null },
    { data: enrollmentData, error: null },
  ];

  const chain: any = {};
  const methods = ["select", "eq", "in", "order"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }

  chain.from = vi.fn().mockImplementation(() => {
    const current = datasets[callCount] || { data: [], error: null };
    callCount++;
    const innerChain: any = {};
    for (const m of methods) {
      innerChain[m] = vi.fn().mockReturnValue(innerChain);
    }
    Object.defineProperty(innerChain, "then", {
      value: (resolve: any, reject: any) =>
        Promise.resolve(current).then(resolve, reject),
      writable: true,
    });
    return innerChain;
  });

  return chain;
}

describe("getAdminProgramCardsByMosqueId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty array when no programs exist", async () => {
    const supabase = mockMultiQuerySupabase([], [], []);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getAdminProgramCardsByMosqueId("mosque-1");

    expect(result).toEqual([]);
  });

  it("maps teacher names and enrollment counts onto programs", async () => {
    const programs = [
      { id: "prog-1", title: "Quran 101", teacher_profile_id: "teacher-1", is_active: true },
      { id: "prog-2", title: "Arabic", teacher_profile_id: null, is_active: false },
    ];
    const teachers = [{ id: "teacher-1", full_name: "Ustadh Ali" }];
    const enrollments = [
      { id: "e-1", program_id: "prog-1" },
      { id: "e-2", program_id: "prog-1" },
      { id: "e-3", program_id: "prog-2" },
    ];

    const supabase = mockMultiQuerySupabase(programs, teachers, enrollments);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getAdminProgramCardsByMosqueId("mosque-1");

    expect(result).toHaveLength(2);
    expect(result[0].teacher_name).toBe("Ustadh Ali");
    expect(result[0].enrolled_student_count).toBe(2);
    expect(result[1].teacher_name).toBeNull();
    expect(result[1].enrolled_student_count).toBe(1);
  });
});
```

- [ ] **Step 2: Write parent query tests**

```ts
// tests/queries/parent-queries.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  getChildrenForParent,
  getChildEnrollments,
  getChildApplications,
} from "@/lib/supabase/queries";

function mockSupabaseChain(resolvedData: any, resolvedError: any = null) {
  const chain: any = {};
  const methods = ["from", "select", "eq", "in", "order"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  Object.defineProperty(chain, "then", {
    value: (resolve: any, reject: any) =>
      Promise.resolve({ data: resolvedData, error: resolvedError }).then(resolve, reject),
    writable: true,
  });
  return chain;
}

describe("getChildrenForParent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns children with profile data", async () => {
    const mockData = [
      {
        id: "link-1",
        child_profile_id: "child-1",
        created_at: "2026-03-28",
        profiles: { id: "child-1", full_name: "Child One", date_of_birth: null, gender: null, avatar_url: null },
      },
    ];
    const supabase = mockSupabaseChain(mockData);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getChildrenForParent("parent-1", "mosque-1");

    expect(result).toHaveLength(1);
    expect(result[0].profiles.full_name).toBe("Child One");
  });

  it("returns empty array when no children", async () => {
    const supabase = mockSupabaseChain(null);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getChildrenForParent("parent-1", "mosque-1");

    expect(result).toEqual([]);
  });
});

describe("getChildEnrollments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters enrollments by mosque_id in JS", async () => {
    const mockData = [
      { id: "e-1", programs: { mosque_id: "mosque-1", title: "Quran" } },
      { id: "e-2", programs: { mosque_id: "other-mosque", title: "Arabic" } },
    ];
    const supabase = mockSupabaseChain(mockData);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getChildEnrollments("child-1", "mosque-1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("e-1");
  });
});

describe("getChildApplications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters applications by mosque_id in JS", async () => {
    const mockData = [
      { id: "a-1", status: "pending", programs: { mosque_id: "mosque-1" } },
      { id: "a-2", status: "pending", programs: { mosque_id: "other-mosque" } },
    ];
    const supabase = mockSupabaseChain(mockData);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getChildApplications("child-1", "mosque-1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a-1");
  });
});
```

- [ ] **Step 3: Run all query tests**

Run: `npx vitest tests/queries/ --run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add tests/queries/admin-queries.test.ts tests/queries/parent-queries.test.ts
git commit -m "test: add unit tests for admin program cards and parent queries"
```

---

## Task 4: React.cache() Deduplication Layer

**Files:**
- Create: `lib/supabase/cached-queries.ts`

- [ ] **Step 1: Create the cached queries module**

```ts
// lib/supabase/cached-queries.ts
import { cache } from "react";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
} from "./queries";

export const getCachedMosqueBySlug = cache(getMosqueBySlug);
export const getCachedProfile = cache(getProfileForCurrentUser);
export const getCachedMembership = cache(getMosqueMembershipForUser);
```

- [ ] **Step 2: Commit**

```bash
git add lib/supabase/cached-queries.ts
git commit -m "feat: add React.cache() deduplication layer for shared queries"
```

---

## Task 5: Update Layout — Cached Imports + Parallel Queries + next/image

**Files:**
- Modify: `app/m/[slug]/layout.tsx`

- [ ] **Step 1: Update layout to use cached queries and parallelize**

Replace the imports and query logic in `app/m/[slug]/layout.tsx`:

Change the import:
```ts
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
} from "@/lib/supabase/queries";
```
to:
```ts
import {
  getCachedMosqueBySlug,
  getCachedProfile,
  getCachedMembership,
} from "@/lib/supabase/cached-queries";
```

Also add the Image import:
```ts
import Image from "next/image";
```

Replace the data-fetching block (lines 33-58) with:
```ts
  const { slug } = await params;

  // Parallelize independent operations
  const [mosque, supabase] = await Promise.all([
    getCachedMosqueBySlug(slug),
    createClient(),
  ]);

  if (!mosque) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mosqueLogoSrc = mosque.logo_url
    ? supabase.storage.from("media").getPublicUrl(mosque.logo_url).data.publicUrl
    : DEFAULT_MOSQUE_LOGO;

  const primaryColor = mosque.primary_color || "#111827";
  const secondaryColor = mosque.secondary_color || "#111827";

  // For authenticated users, load profile and membership for AppShell
  if (user) {
    const profile = await getCachedProfile();
    const membership = profile
      ? await getCachedMembership(profile.id, mosque.id)
      : null;
```

Replace all 3 `<img>` tags in the layout with `<Image>`:
```tsx
<Image
  src={mosqueLogoSrc}
  alt={mosque.name}
  width={40}
  height={40}
  className="h-full w-full object-cover"
  unoptimized={mosqueLogoSrc.startsWith("data:")}
/>
```

Note: `unoptimized` is needed when the src is a data URI (the SVG fallback). For the Supabase storage URLs, next/image will optimize normally.

- [ ] **Step 2: Run build to verify no type errors**

Run: `npx next build 2>&1 | head -30`
Expected: No type errors related to the layout

- [ ] **Step 3: Commit**

```bash
git add app/m/[slug]/layout.tsx
git commit -m "perf: parallelize layout queries and use cached imports + next/image"
```

---

## Task 6: Update All Tenant Pages to Use Cached Imports

**Files:**
- Modify: All 18 pages under `app/m/[slug]/` that import `getMosqueBySlug`, `getProfileForCurrentUser`, or `getMosqueMembershipForUser` from `@/lib/supabase/queries`

- [ ] **Step 1: Update all pages**

For each page that imports any of these three functions from `@/lib/supabase/queries`, change the import to use `@/lib/supabase/cached-queries` instead. The function names change:

| Old import | New import |
|---|---|
| `getMosqueBySlug` from `@/lib/supabase/queries` | `getCachedMosqueBySlug` from `@/lib/supabase/cached-queries` |
| `getProfileForCurrentUser` from `@/lib/supabase/queries` | `getCachedProfile` from `@/lib/supabase/cached-queries` |
| `getMosqueMembershipForUser` from `@/lib/supabase/queries` | `getCachedMembership` from `@/lib/supabase/cached-queries` |

Also update all call sites to use the new function names. Pages that import other functions from `@/lib/supabase/queries` keep those imports — just split the import into two lines.

Example for `app/m/[slug]/dashboard/page.tsx`:
```ts
// Before:
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
  getEnrollmentsForStudentInMosque,
  // ... other imports
} from "@/lib/supabase/queries";

// After:
import {
  getCachedMosqueBySlug,
  getCachedProfile,
  getCachedMembership,
} from "@/lib/supabase/cached-queries";
import {
  getEnrollmentsForStudentInMosque,
  // ... other imports
} from "@/lib/supabase/queries";
```

Then replace call sites: `getMosqueBySlug(slug)` → `getCachedMosqueBySlug(slug)`, `getProfileForCurrentUser()` → `getCachedProfile()`, `getMosqueMembershipForUser(...)` → `getCachedMembership(...)`.

Full list of pages to update:
1. `app/m/[slug]/dashboard/page.tsx`
2. `app/m/[slug]/page.tsx`
3. `app/m/[slug]/settings/page.tsx`
4. `app/m/[slug]/programs/page.tsx`
5. `app/m/[slug]/programs/[programId]/page.tsx`
6. `app/m/[slug]/classes/page.tsx`
7. `app/m/[slug]/classes/[programId]/page.tsx`
8. `app/m/[slug]/students/page.tsx`
9. `app/m/[slug]/teacher/programs/page.tsx`
10. `app/m/[slug]/teacher/programs/[programId]/page.tsx`
11. `app/m/[slug]/teacher/programs/[programId]/edit/page.tsx`
12. `app/m/[slug]/admin/programs/page.tsx`
13. `app/m/[slug]/admin/programs/new/page.tsx`
14. `app/m/[slug]/admin/programs/[programId]/page.tsx`
15. `app/m/[slug]/admin/programs/[programId]/edit/page.tsx`
16. `app/m/[slug]/admin/teacher-requests/page.tsx`
17. `app/m/[slug]/admin/members/page.tsx`
18. `app/m/[slug]/choose-role/page.tsx`
19. `app/m/[slug]/login/page.tsx` (only if it imports getMosqueBySlug)
20. `app/m/[slug]/signup/page.tsx` (only if it imports getMosqueBySlug)

- [ ] **Step 2: Run build to verify**

Run: `npx next build 2>&1 | head -30`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add app/m/
git commit -m "perf: migrate all tenant pages to cached query imports"
```

- [ ] **Step 4: Run E2E to verify no regressions**

Run: `npx playwright test --reporter=list 2>&1 | tail -20`
Expected: All tests pass

---

## Task 7: Dashboard Query Parallelization

**Files:**
- Modify: `app/m/[slug]/dashboard/page.tsx`

- [ ] **Step 1: Parallelize the 6 conditional queries**

In `app/m/[slug]/dashboard/page.tsx`, replace the sequential conditional queries (lines 77-99) with:

```ts
  const [enrollments, teachingPrograms, studentApplications, teacherApplications, teacherStats, adminStats] =
    await Promise.all([
      isStudentOnly ? getEnrollmentsForStudentInMosque(profile.id, mosque.id) : Promise.resolve([]),
      isTeacherLike ? getProgramsForTeacherInMosque(profile.id, mosque.id) : Promise.resolve([]),
      isStudentOnly ? getStudentProgramApplicationsInMosque(profile.id, mosque.id) : Promise.resolve([]),
      isTeacherLike ? getTeacherProgramApplicationsInMosque(profile.id, mosque.id) : Promise.resolve([]),
      isTeacherLike ? getTeacherDashboardStats(profile.id, mosque.id) : Promise.resolve(null),
      canManagePrograms ? getAdminDashboardStats(mosque.id) : Promise.resolve(null),
    ]);
```

The `getLatestAnnouncementsForPrograms` call remains sequential after this block since it depends on `relevantProgramIds`.

- [ ] **Step 2: Run build**

Run: `npx next build 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/m/[slug]/dashboard/page.tsx
git commit -m "perf: parallelize dashboard conditional queries with Promise.all()"
```

- [ ] **Step 4: Run E2E**

Run: `npx playwright test e2e/student-dashboard.spec.ts e2e/teacher-dashboard.spec.ts e2e/parent-role.spec.ts --reporter=list 2>&1 | tail -20`
Expected: All dashboard tests pass

---

## Task 8: Fix N+1 — Admin Program Cards

**Files:**
- Modify: `lib/supabase/queries.ts` (function `getAdminProgramCardsByMosqueId`)

- [ ] **Step 1: Rewrite getAdminProgramCardsByMosqueId as a single joined query**

Replace the entire `getAdminProgramCardsByMosqueId` function (lines 526-601 of `lib/supabase/queries.ts`) with:

```ts
export async function getAdminProgramCardsByMosqueId(mosqueId: string) {
  const supabase = await createClient();

  const { data: programs, error: programsError } = await supabase
    .from("programs")
    .select(`
      id,
      mosque_id,
      teacher_profile_id,
      title,
      description,
      is_active,
      is_paid,
      price_monthly_cents,
      created_at,
      updated_at,
      teacher:profiles!programs_teacher_profile_id_fkey (
        id,
        full_name
      ),
      enrollments (
        id
      )
    `)
    .eq("mosque_id", mosqueId)
    .order("title", { ascending: true });

  if (programsError) {
    throw new Error(`Failed to load admin program cards: ${programsError.message}`);
  }

  return (programs ?? []).map((program) => {
    const teacher = Array.isArray(program.teacher)
      ? program.teacher[0]
      : program.teacher;
    const enrollmentCount = Array.isArray(program.enrollments)
      ? program.enrollments.length
      : 0;

    return {
      ...program,
      teacher: undefined,
      enrollments: undefined,
      teacher_name: teacher?.full_name?.trim() || null,
      enrolled_student_count: enrollmentCount,
    };
  });
}
```

This collapses 3 queries into 1. The `enrollments` relation returns all enrollment rows as an array — we count them in JS with `.length` (PostgREST `count` aggregates are not always reliable for embedded resources).

- [ ] **Step 2: Run query unit tests**

Run: `npx vitest tests/queries/admin-queries.test.ts --run`
Expected: Tests may need updating since the mock shape changed. Update the mock to match the new single-query pattern if needed.

- [ ] **Step 3: Update admin-queries test for new single-query pattern**

Replace the `mockMultiQuerySupabase` with a simpler single-chain mock and update test expectations to match the new return shape (the function still returns `teacher_name` and `enrolled_student_count` fields).

- [ ] **Step 4: Run tests again**

Run: `npx vitest tests/queries/admin-queries.test.ts --run`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/queries.ts tests/queries/admin-queries.test.ts
git commit -m "perf: collapse admin program cards N+1 into single joined query"
```

---

## Task 9: Fix N+1 — Parent Dashboard Batch Queries

**Files:**
- Modify: `lib/supabase/queries.ts` (add batch functions)
- Modify: `components/dashboard/ParentDashboard.tsx`

- [ ] **Step 1: Add batch query functions to queries.ts**

Add these two functions after `getChildApplications` in `lib/supabase/queries.ts`:

```ts
export async function getChildEnrollmentsBatch(childProfileIds: string[], mosqueId: string) {
  if (childProfileIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select(`
      id,
      student_profile_id,
      created_at,
      programs (
        id, title, description, thumbnail_url, schedule, schedule_timezone,
        mosque_id,
        teacher_profile_id,
        profiles!programs_teacher_profile_id_fkey ( full_name, avatar_url )
      )
    `)
    .in("student_profile_id", childProfileIds);

  return (data || []).filter((e: any) => e.programs?.mosque_id === mosqueId);
}

export async function getChildApplicationsBatch(childProfileIds: string[], mosqueId: string) {
  if (childProfileIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("program_applications")
    .select(`
      id,
      status,
      student_profile_id,
      created_at,
      programs (
        id, title, description, thumbnail_url, mosque_id
      )
    `)
    .in("student_profile_id", childProfileIds)
    .order("created_at", { ascending: false });

  return (data || []).filter((a: any) => a.programs?.mosque_id === mosqueId);
}
```

- [ ] **Step 2: Update ParentDashboard to use batch queries**

Replace the content of `components/dashboard/ParentDashboard.tsx`:

```tsx
import { getChildrenForParent, getChildEnrollmentsBatch, getChildApplicationsBatch } from "@/lib/supabase/queries";
import { ChildCard } from "./ChildCard";
import { AddChildDialog } from "./AddChildDialog";

interface ParentDashboardProps {
  profileId: string;
  mosqueId: string;
  slug: string;
  primaryColor: string;
}

export async function ParentDashboard({ profileId, mosqueId, slug, primaryColor }: ParentDashboardProps) {
  const children = await getChildrenForParent(profileId, mosqueId);

  const childProfiles = children
    .map((link: any) => link.profiles)
    .filter(Boolean);

  const childIds = childProfiles.map((p: any) => p.id);

  // Batch: 2 queries instead of 2N
  const [allEnrollments, allApplications] = await Promise.all([
    getChildEnrollmentsBatch(childIds, mosqueId),
    getChildApplicationsBatch(childIds, mosqueId),
  ]);

  const validChildren = childProfiles.map((childProfile: any) => ({
    child: childProfile,
    enrollments: allEnrollments.filter((e: any) => e.student_profile_id === childProfile.id),
    applications: allApplications.filter((a: any) => a.student_profile_id === childProfile.id),
  }));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Children</h1>
          <p className="text-muted-foreground">
            Manage your children&apos;s enrollments and applications.
          </p>
        </div>
        <AddChildDialog slug={slug} primaryColor={primaryColor} />
      </div>

      {validChildren.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">No children added yet.</p>
          <AddChildDialog slug={slug} primaryColor={primaryColor} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {validChildren.map((data: any) => (
            <ChildCard
              key={data.child.id}
              child={data.child}
              enrollments={data.enrollments}
              applications={data.applications}
              slug={slug}
              primaryColor={primaryColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run parent query tests**

Run: `npx vitest tests/queries/parent-queries.test.ts --run`
Expected: Pass (existing per-child functions unchanged; new batch functions need separate tests if desired)

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/queries.ts components/dashboard/ParentDashboard.tsx
git commit -m "perf: batch parent dashboard child queries (1+2N → 3 queries)"
```

- [ ] **Step 5: Run E2E**

Run: `npx playwright test e2e/parent-role.spec.ts --reporter=list 2>&1 | tail -20`
Expected: All parent tests pass

---

## Spec Notes: Deferred Items

- **Section 4c (Announcements)**: `getLatestAnnouncementsForPrograms` already queries with `.in("program_id", programIds).order("created_at", { ascending: false })` and deduplicates with an O(n) Map. Already efficient — no task needed.
- **Section 5c (Select specificity)**: Partially addressed in Task 8 (admin program cards now use explicit columns). `getMosqueBySlug` uses `select("*")` but is shared across the landing page (needs `welcome_description`, `features`) and other pages. Splitting into two variants adds complexity for marginal gain — deferred.

---

## Task 10: Revalidation Migration — revalidatePath to revalidateTag

**Files:**
- Modify: `app/actions/applications.ts`
- Modify: `app/actions/enrollments.ts`
- Modify: `app/actions/profile.ts`
- Modify: `app/actions/programs.ts`
- Modify: `app/actions/announcements.ts`
- Modify: `app/actions/members.ts`
- Modify: `app/actions/teacher-requests.ts`

- [ ] **Step 1: Replace all revalidatePath calls with revalidateTag**

In each action file, change the import:
```ts
import { revalidatePath } from "next/cache";
```
to:
```ts
import { revalidateTag } from "next/cache";
```

Then replace each group of `revalidatePath` calls with the appropriate tag(s):

**`app/actions/applications.ts`:**
- `applyToProgram`: replace 4 `revalidatePath` calls with `revalidateTag("applications"); revalidateTag("mosque-programs");`
- `acceptProgramApplication`: replace `revalidatePath` with `revalidateTag("applications");`
- `rejectProgramApplication`: replace `revalidatePath` with `revalidateTag("applications");`
- `joinApprovedFreeProgram`: replace 5 `revalidatePath` calls with `revalidateTag("applications"); revalidateTag("enrollments"); revalidateTag("mosque-programs");`

**`app/actions/enrollments.ts`:**
- `enrollInProgram`: replace 5 `revalidatePath` calls with `revalidateTag("enrollments"); revalidateTag("mosque-programs");`
- `withdrawFromProgram` (both locations): replace with `revalidateTag("enrollments"); revalidateTag("mosque-programs");`
- `removeStudentFromProgram`: replace 3 `revalidatePath` calls with `revalidateTag("enrollments"); revalidateTag("applications"); revalidateTag("mosque-programs");`

**`app/actions/profile.ts`:**
- `updateProfile`: replace 6 `revalidatePath` calls with `revalidateTag("profile");`

**`app/actions/programs.ts`:**
- `createProgram`: no revalidatePath currently (uses redirect), but add `revalidateTag("mosque-programs");` before redirect
- `updateProgram`: add `revalidateTag("mosque-programs");` before redirect
- `updateTeacherProgram`: add `revalidateTag("mosque-programs");` before redirect
- `deleteProgram`: replace `revalidatePath` with `revalidateTag("mosque-programs"); revalidateTag("enrollments");`

**`app/actions/announcements.ts`:**
- `createProgramAnnouncement`: no revalidatePath (uses redirect). Add `revalidateTag("announcements");` before redirect
- `updateAnnouncement`: add `revalidateTag("announcements");` before return
- `deleteAnnouncement`: add `revalidateTag("announcements");` before return

**`app/actions/members.ts`:**
- `changeMemberRole`: replace `revalidatePath` with `revalidateTag("members");`
- `toggleCanManagePrograms`: replace `revalidatePath` with `revalidateTag("members");`
- `removeMemberFromMosque`: replace `revalidatePath` with `revalidateTag("members"); revalidateTag("enrollments");`

**`app/actions/teacher-requests.ts`:**
- `requestToJoinAsTeacher`: replace `revalidatePath("/")` with `revalidateTag("teacher-requests");`
- `approveTeacherRequest`: replace 2 `revalidatePath` calls with `revalidateTag("teacher-requests"); revalidateTag("members");`
- `rejectTeacherRequest`: replace `revalidatePath` with `revalidateTag("teacher-requests");`

- [ ] **Step 2: Run build**

Run: `npx next build 2>&1 | head -30`
Expected: No errors (revalidateTag is a drop-in for revalidatePath in terms of API)

- [ ] **Step 3: Commit**

```bash
git add app/actions/
git commit -m "perf: migrate all server actions from revalidatePath to revalidateTag"
```

- [ ] **Step 4: Run full E2E**

Run: `npx playwright test --reporter=list 2>&1 | tail -30`
Expected: All tests pass. Note: revalidateTag requires tagged caches on the query side to work. Without `unstable_cache` wrapping the queries, `revalidateTag` is effectively a no-op but also harmless. The migration is forward-compatible — when we add caching wrappers later, the tags will activate.

---

## Task 11: Stripe Status Caching

**Files:**
- Modify: `app/m/[slug]/settings/page.tsx`
- Modify: `app/api/stripe/webhook/route.ts`

- [ ] **Step 1: Cache Stripe status with unstable_cache**

In `app/m/[slug]/settings/page.tsx`, replace the Stripe check block (lines 41-50) with a cached version:

```ts
import { unstable_cache, revalidateTag } from "next/cache";

// At module level, outside the component:
const getCachedStripeStatus = unstable_cache(
  async (stripeAccountId: string) => {
    const { stripe } = await import("@/lib/stripe");
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId);
      return account.charges_enabled ? "connected" as const : "pending" as const;
    } catch {
      return "not_started" as const;
    }
  },
  ["stripe-status"],
  { tags: ["stripe-status"], revalidate: 3600 } // Revalidate every hour or on webhook
);
```

Then in the component, replace lines 41-50 with:
```ts
  let stripeStatus: "not_started" | "pending" | "connected" = "not_started";
  if (role === "mosque_admin" && mosque.stripe_account_id) {
    stripeStatus = await getCachedStripeStatus(mosque.stripe_account_id);
  }
```

Remove the top-level `import { stripe } from "@/lib/stripe"` since it's now dynamically imported inside the cache function. This also eliminates the module-level Stripe SDK initialization for non-admin pages.

- [ ] **Step 2: Add account.updated webhook handler**

In `app/api/stripe/webhook/route.ts`, add a case for `account.updated` in the switch statement:

```ts
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        // Revalidate the cached Stripe status
        const { revalidateTag } = await import("next/cache");
        revalidateTag("stripe-status");
        break;
      }
```

- [ ] **Step 3: Run build**

Run: `npx next build 2>&1 | head -30`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/m/[slug]/settings/page.tsx app/api/stripe/webhook/route.ts
git commit -m "perf: cache Stripe account status, revalidate on webhook"
```

---

## Task 12: next.config.ts — Image Optimization

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Add image remote patterns**

Replace `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

export default nextConfig;
```

- [ ] **Step 2: Commit**

```bash
git add next.config.ts
git commit -m "feat: configure next/image remote patterns for Supabase storage"
```

---

## Task 13: Migrate Remaining `<img>` Tags to next/image

**Files:**
- Modify: `app/m/[slug]/page.tsx`
- Modify: `components/Sidebar.tsx`
- Modify: `components/AppShellClient.tsx`
- Modify: `components/programs/ProgramCard.tsx`
- Modify: `components/dashboard/StudentEnrollmentCard.tsx`
- Modify: `components/dashboard/TeacherProgramCard.tsx`
- Modify: `app/m/[slug]/programs/[programId]/page.tsx`
- Modify: `app/m/[slug]/classes/[programId]/page.tsx`
- Modify: `app/m/[slug]/teacher/programs/[programId]/page.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Add `import Image from "next/image"` to each file and replace `<img>` tags**

For each file, the pattern is:

1. Add `import Image from "next/image";` at the top
2. Replace `<img src={...} alt={...} className="h-full w-full object-cover" />` with:
```tsx
<Image
  src={imageUrl}
  alt={altText}
  width={40}
  height={40}
  className="h-full w-full object-cover"
  unoptimized={imageUrl.startsWith("data:")}
/>
```

Adjust `width` and `height` based on the container size:
- Mosque logos in headers: `width={40} height={40}`
- Mosque logo on landing page: `width={96} height={96}`
- Program thumbnails: `width={200} height={200}` or use `fill` with a sized container
- Avatar images: `width={32} height={32}` or `width={40} height={40}`

Use `unoptimized` prop when the src could be a data URI (SVG fallbacks). For Supabase storage URLs, next/image will optimize automatically via the remote pattern configured in Task 12.

- [ ] **Step 2: Run build**

Run: `npx next build 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/ components/
git commit -m "perf: migrate all img tags to next/image for automatic optimization"
```

- [ ] **Step 4: Run full E2E suite**

Run: `npx playwright test --reporter=list 2>&1 | tail -30`
Expected: All tests pass

---

## Task 14: Final Verification

- [ ] **Step 1: Run all unit tests**

Run: `npx vitest --run`
Expected: All tests pass

- [ ] **Step 2: Run full E2E suite**

Run: `npx playwright test --reporter=list`
Expected: All tests pass

- [ ] **Step 3: Run build**

Run: `npx next build`
Expected: Clean build with no errors or warnings

- [ ] **Step 4: Clean up test artifacts**

```bash
rm -rf playwright-report/ test-results/
```
