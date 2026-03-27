# Suluk Issues Sprint — Design Spec

**Date:** 2026-03-19
**Scope:** Bug fixes (#5, #8, #9), responsive redesign (#2), UI improvements (#7, #14), features (#10, #13), new capabilities (student leave, admin management, teacher permissions), shadcn/ui migration, Playwright test suite

---

## 1. Responsive Layout System

### Breakpoints

| Viewport | Width | Navigation | Content Width |
|----------|-------|-----------|---------------|
| Mobile | < 768px | Bottom nav (4 icons, role-based) | Full width, 16px padding |
| Tablet | 768–1023px | Collapsible sidebar (icon-only 64px, expandable) | max-w-2xl centered |
| Desktop | >= 1024px | Fixed left sidebar (240px) | max-w-4xl |

### Desktop Sidebar

- Mosque logo + name at top
- Navigation links with icons (same items as BottomNav + room for labels)
- Role badge (Student / Teacher / Admin)
- User avatar + name at bottom with settings link
- Mosque `primary_color` as subtle accent on active nav item
- Sticky, full viewport height

### Tablet Sidebar

- Collapsed by default (64px, icons only)
- Hamburger toggle to expand to full 240px overlay
- Same content as desktop sidebar when expanded

### Mobile

- Existing bottom nav preserved
- No sidebar
- Content fills viewport width with padding

### Component: `AppShell`

A new layout wrapper that renders the correct navigation for the viewport:

```
<AppShell role={membership.role} mosque={mosque} profile={profile}>
  {children}
</AppShell>
```

Replaces the current `BottomNav` usage in the tenant layout. `BottomNav` becomes an internal detail of `AppShell`.

---

## 2. shadcn/ui Migration

### Components to install

- **Button** — replace all custom buttons
- **Card, CardHeader, CardContent, CardFooter** — replace custom card divs
- **Sheet** — mobile slide-over panels (student info, sidebar)
- **AlertDialog** — destructive confirmations (remove student, delete program)
- **Dialog** — non-destructive modals
- **Table, TableHeader, TableRow, TableCell** — student roster, admin lists
- **Badge** — status pills (pending, accepted, rejected, active)
- **Input, Label, Textarea** — form fields
- **Select** — dropdowns (role selection, gender filter)
- **Tabs, TabsList, TabsTrigger, TabsContent** — dashboard sections
- **Separator** — visual dividers
- **Avatar** — user profile images
- **DropdownMenu** — action menus on roster rows
- **Switch** — toggles (free/paid, permissions)
- **Tooltip** — icon-only actions

### Theming

- CSS variables mapped from mosque's `primary_color` and `secondary_color`
- Warm, community-oriented feel: soft card backgrounds using `color-mix()`, generous rounded corners (radius-lg), subtle shadows
- Geist Sans for UI text, Geist Mono for data/IDs

---

## 3. Bug Fixes

### #5 — Programs page crash for As-Siddiq mosque

**Root cause:** Null reference when a program has missing teacher, schedule, or other optional fields.

**Fix:**
- Add null-safe access (`?.`) throughout programs list and detail pages
- Add fallback UI: "No teacher assigned", "Schedule TBD" for missing data
- Validate all program fields before rendering schedule calendar

### #9 — Student click redirects to class instead of showing info

**Fix:**
- On teacher student list and program roster: clicking a student opens a Sheet (mobile) or side panel (desktop)
- Panel shows: full name, email, phone, age, gender, enrollment date, application date
- No navigation away from the current page
- Close button to dismiss

### #8 — Enrollment flow: apply → approve → confirm → enroll

**Current flow works but messaging is unclear.**

**Fix:**
- `pending` status: student sees "Application Pending" badge, waiting message
- `accepted` status: student sees "You've been accepted!" with a prominent "Confirm Enrollment" button
  - Free program: confirm creates enrollment directly, status → `joined`
  - Paid program: confirm redirects to Stripe checkout
- `rejected` status: student sees "Application Not Accepted" with option to re-apply
- `joined` status: student sees "Enrolled" badge, link to class

---

## 4. Feature Additions

### #7 — Navigation links between programs and auth pages

- `/m/{slug}/programs` header: "Login" and "Sign Up" links for unauthenticated users
- `/m/{slug}/login` and `/signup`: "Browse Programs" link
- `/m/{slug}` home: clear CTAs for both directions

### #14 — Move inbox to top of teacher dashboard

- Reorder: Pending Applications section above My Classes
- Empty state: "No pending applications" subtle message when count is 0
- Badge on sidebar nav showing pending application count

### #10 — Teacher kick/remove students

- Per-student "Remove" action in program roster (DropdownMenu → "Remove from program")
- AlertDialog confirmation: "Remove [name] from [program]? They will lose access."
- Server action: deletes enrollment, cancels Stripe subscription if paid
- Student can re-apply after removal

### #13 — Admin set/change program pricing

- Program edit form: pricing section
- Switch toggle: Free / Paid
- If paid: Input for monthly price (dollars, stored as cents)
- Server action: creates/updates Stripe product and price
- Validates mosque has Stripe Connect account before allowing paid

### New: Student leave program (S-9)

- On enrolled class page: "Leave Program" button
- AlertDialog: "Leave [program]? You'll lose access to this class."
- Server action: deletes enrollment, cancels Stripe subscription if paid
- Student returns to programs browse page

### New: Admin management (A-4 through A-11)

**Admin members page** (`/m/{slug}/admin/members`):
- Table of all mosque members: name, email, role, joined date
- Actions per member (DropdownMenu):
  - Change role (student ↔ teacher, promote to admin)
  - Toggle `can_manage_programs` for teachers
  - Remove from mosque (AlertDialog confirmation)

**Admin program management enhancements:**
- Assign/change teacher on program edit page (Select dropdown of mosque teachers)
- Delete program (AlertDialog, cascades: removes enrollments, cancels subscriptions)
- Remove individual student from any program

### New: Teacher program management (T-6, T-7)

- Teachers with `can_manage_programs` see "Create Program" in their nav
- Uses same program create/edit forms as admin
- Can edit pricing on their assigned programs
- Cannot delete programs (admin only)

---

## 5. User Stories

### Student

| ID | Story | Issues |
|----|-------|--------|
| S-1 | Browse programs without logging in | #7 |
| S-2 | Sign up and get redirected to dashboard | #7 |
| S-3 | Apply to a program | #8 |
| S-4 | See application status in dashboard | #8 |
| S-5 | Confirm enrollment after acceptance | #8 |
| S-6 | Pay for a paid program after acceptance | #8, #13 |
| S-7 | View enrolled classes and schedule | — |
| S-8 | Navigate between programs and login/signup | #7 |
| S-9 | Leave/unenroll from a program | New |
| S-10 | Edit profile (name, phone, age) | — |
| S-11 | See announcements in enrolled classes | — |

### Teacher

| ID | Story | Issues |
|----|-------|--------|
| T-1 | See pending applications at top of dashboard | #14 |
| T-2 | Accept or reject applications | #8 |
| T-3 | Click student and see info (not redirect) | #9 |
| T-4 | Remove a student from a program | #10 |
| T-5 | View assigned classes and post announcements | — |
| T-6 | Create programs (if admin allows) | New |
| T-7 | Change program pricing (if admin allows) | New |
| T-8 | Edit/delete own announcements | New |

### Admin

| ID | Story | Issues |
|----|-------|--------|
| A-1 | Create a new program | — |
| A-2 | Set program as free or paid with pricing | #13 |
| A-3 | Edit an existing program's pricing | #13 |
| A-4 | Remove a student from any program | New |
| A-5 | Unassign a teacher from a program | New |
| A-6 | Delete a program | New |
| A-7 | Remove a member from the mosque | New |
| A-8 | Toggle teacher's can_manage_programs | New |
| A-9 | Assign a teacher to a program | New |
| A-10 | Change a member's role | New |
| A-11 | View all mosque members with roles | New |

### Responsive / Cross-cutting

| ID | Story | Issues |
|----|-------|--------|
| R-1 | All pages render correctly on mobile (375px) | #2 |
| R-2 | All pages render correctly on tablet (768px) | #2 |
| R-3 | All pages render correctly on desktop (1280px) | #2 |
| R-4 | Desktop shows sidebar, mobile shows bottom nav | #2 |
| R-5 | Programs page does not crash with incomplete data | #5 |

---

## 6. Playwright Testing Strategy

### Setup

- Playwright with 3 projects: mobile (375x667), tablet (768x1024), desktop (1280x720)
- Test against `next dev` on localhost
- Global setup seeds test data via Supabase service role client

### Test Data Seeding (`global-setup.ts`)

Creates:
- Test mosque ("Test Mosque", slug: `test-mosque`)
- Admin user, teacher user (with `can_manage_programs`), student user
- 3 programs: one free, one paid, one with no teacher (for crash test)
- Pre-existing enrollment and application for flow testing

Teardown cleans up all seeded data.

### Test Suites

| File | Stories Covered | Description |
|------|----------------|-------------|
| `auth.spec.ts` | S-2, S-8 | Signup, login, logout, navigation links |
| `programs-browse.spec.ts` | S-1, S-8, R-5 | Browse programs, unauthenticated nav, crash regression |
| `enrollment-flow.spec.ts` | S-3, S-4, S-5, S-6 | Full apply → accept → confirm → enroll flow |
| `student-dashboard.spec.ts` | S-7, S-9, S-10, S-11 | Classes, leave program, settings, announcements |
| `teacher-dashboard.spec.ts` | T-1, T-2, T-3, T-4, T-5, T-8 | Inbox, accept/reject, student info, remove, announcements |
| `teacher-programs.spec.ts` | T-6, T-7 | Create programs, edit pricing (with permission) |
| `admin-programs.spec.ts` | A-1, A-2, A-3, A-6, A-9 | CRUD programs, pricing, assign teacher |
| `admin-members.spec.ts` | A-4, A-5, A-7, A-8, A-10, A-11 | Member management, roles, permissions |
| `responsive.spec.ts` | R-1, R-2, R-3, R-4 | Layout verification at all 3 viewports |

### Each test references story IDs

```typescript
// Covers: S-1, S-8, R-5
test.describe('Programs browsing', () => { ... });
```

---

## 7. Implementation Order

1. **Phase 1 — Foundation:** Install shadcn/ui, create `AppShell` layout, responsive breakpoints
2. **Phase 2 — Bug fixes:** #5 (crash), #9 (student info), #8 (enrollment flow)
3. **Phase 3 — Quick features:** #7 (nav links), #14 (inbox reorder)
4. **Phase 4 — Student features:** S-9 (leave program), S-10/S-11 polish
5. **Phase 5 — Teacher features:** #10 (remove student), T-6/T-7 (create/edit programs), T-8 (announcements)
6. **Phase 6 — Admin features:** #13 (pricing), A-4–A-11 (member management)
7. **Phase 7 — Playwright:** Setup, seed data, write all test suites
8. **Phase 8 — Polish:** Responsive testing, visual QA at all viewports

---

## 8. Prerequisites & Technical Debt (from spec review)

### Types regeneration

`types/database.ts` is severely out of sync with the actual Supabase database. Missing tables: `program_applications`, `program_subscriptions`, `program_announcements`. Missing columns on `programs`: `is_paid`, `price_monthly_cents`, `stripe_product_id`, `stripe_price_id`, `audience_gender`, `age_range_text`, `schedule`, `schedule_timezone`, `schedule_notes`. Missing columns on `profiles`: `email`, `phone_number`, `avatar_url`, `age`, `gender`. Missing on `mosques`: `primary_color`, `secondary_color`, `stripe_account_id`, `welcome_title`, `welcome_description`, `features`. Missing `can_manage_programs` on `mosque_memberships`. Missing `lead_teacher` role value.

**Action:** Regenerate types from Supabase (`supabase gen types typescript`) or manually add all missing definitions before implementation begins.

### New server actions required

| Action | Purpose | Authorization |
|--------|---------|--------------|
| `removeStudentFromProgram` | Teacher/admin kicks student | Teacher (own programs) or admin |
| `deleteProgram` | Admin deletes program + cascades | Admin only |
| `changeMemberRole` | Admin changes student↔teacher↔admin | Admin only |
| `removeMemberFromMosque` | Admin removes member entirely | Admin only |
| `toggleCanManagePrograms` | Admin toggles teacher permission | Admin only |
| `updateAnnouncement` | Teacher edits own announcement | Announcement author |
| `deleteAnnouncement` | Teacher deletes own announcement | Announcement author |

### Existing action fixes

- **`withdrawFromProgram`**: Must be updated to look up and cancel Stripe subscriptions before deleting enrollment
- **`applyToProgram`**: Must handle re-application from rejected status (update existing rejected application back to pending)
- **`updateProgram`**: Must be extended to handle `is_paid`, `price_monthly_cents`, and Stripe product/price management
- **`updateTeacherProgram`**: Must be extended to allow pricing changes when teacher has `can_manage_programs`
- **`enrollInProgram`** (legacy): Review whether this direct-enrollment action should be restricted to only work for free programs without application gates

### Consolidation

- Two `getMosqueBySlug` functions exist (in `queries.ts` and `tenants.ts`) with different error handling. Consolidate into one in `queries.ts` that returns null, and let callers decide whether to call `notFound()`.

### New routes

- `/m/{slug}/admin/members` — entirely new page + server actions for member management

### shadcn/ui setup (Phase 0)

- Run `npx shadcn@latest init` to set up infrastructure
- Installs: `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`
- Creates: `components.json`, `lib/utils.ts` (cn utility)
- Configure CSS variables to map mosque `primary_color`/`secondary_color`

### Edge case: teacher-less programs

Programs with no teacher assigned can still accept applications. These applications are only visible to admins (not in teacher dashboard queries). The admin programs page should show pending application counts for all programs.

---

## Deferred to Future Rounds

- #11 Homework/assignment system
- #12 Email notifications
- #3 Google/Apple OAuth
- #1 Caching/performance
