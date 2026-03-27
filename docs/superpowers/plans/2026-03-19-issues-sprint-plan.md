# Suluk Issues Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix bugs (#5, #8, #9), add responsive layout with sidebar nav, migrate to shadcn/ui, add features (#7, #10, #13, #14), add admin/teacher management capabilities, and build comprehensive Playwright test suite covering all user stories across mobile/tablet/desktop viewports.

**Architecture:** Next.js 16 App Router with Server Components/Actions, Supabase PostgreSQL backend, Stripe payments. New `AppShell` layout component replaces `BottomNav` with responsive sidebar (desktop) + bottom nav (mobile). shadcn/ui for all UI primitives. Playwright for E2E testing.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Supabase, Stripe, Tailwind CSS 4, shadcn/ui, Playwright

**Spec:** `docs/superpowers/specs/2026-03-19-issues-sprint-design.md`

---

## File Map

### New files to create
```
lib/utils.ts                                    # cn() utility for shadcn/ui
components/ui/card.tsx                          # shadcn Card
components/ui/badge.tsx                         # shadcn Badge
components/ui/sheet.tsx                         # shadcn Sheet
components/ui/alert-dialog.tsx                  # shadcn AlertDialog
components/ui/dialog.tsx                        # shadcn Dialog
components/ui/table.tsx                         # shadcn Table
components/ui/input.tsx                         # shadcn Input
components/ui/label.tsx                         # shadcn Label
components/ui/textarea.tsx                      # shadcn Textarea
components/ui/select.tsx                        # shadcn Select
components/ui/tabs.tsx                          # shadcn Tabs
components/ui/separator.tsx                     # shadcn Separator
components/ui/avatar.tsx                        # shadcn Avatar
components/ui/dropdown-menu.tsx                 # shadcn DropdownMenu
components/ui/switch.tsx                        # shadcn Switch
components/ui/tooltip.tsx                       # shadcn Tooltip
components/AppShell.tsx                         # Responsive layout (sidebar + bottom nav)
components/AppShellClient.tsx                   # Client-side sidebar toggle logic
components/Sidebar.tsx                          # Desktop/tablet sidebar nav
components/StudentInfoPanel.tsx                 # Student info Sheet (for #9)
components/LeaveProgram.tsx                     # Leave program button + dialog (S-9)
components/RemoveStudent.tsx                    # Remove student button + dialog (#10)
components/PricingEditor.tsx                    # Free/paid toggle + price input (#13)
app/m/[slug]/admin/members/page.tsx             # Admin members list (A-7 thru A-11)
app/actions/members.ts                          # Server actions for member management
docs/user-stories.md                            # User stories with IDs
e2e/global-setup.ts                             # Playwright test data seeding
e2e/global-teardown.ts                          # Playwright test data cleanup
e2e/helpers.ts                                  # Shared test utilities (login, navigate)
e2e/auth.spec.ts                                # S-2, S-8
e2e/programs-browse.spec.ts                     # S-1, S-8, R-5
e2e/enrollment-flow.spec.ts                     # S-3, S-4, S-5, S-6
e2e/student-dashboard.spec.ts                   # S-7, S-9, S-10, S-11
e2e/teacher-dashboard.spec.ts                   # T-1, T-2, T-3, T-4, T-5, T-8
e2e/teacher-programs.spec.ts                    # T-6, T-7
e2e/admin-programs.spec.ts                      # A-1, A-2, A-3, A-6, A-9
e2e/admin-members.spec.ts                       # A-4, A-5, A-7, A-8, A-10, A-11
e2e/responsive.spec.ts                          # R-1, R-2, R-3, R-4
playwright.config.ts                            # Playwright configuration
```

### Files to modify
```
types/database.ts                               # Add all missing tables/columns
package.json                                    # Add shadcn/ui deps, Playwright
tailwind.config.ts (or CSS)                     # shadcn theme variables
app/m/[slug]/layout.tsx                         # Replace BottomNav with AppShell
app/m/[slug]/programs/page.tsx                  # Fix #5 crash, add auth nav links (#7)
app/m/[slug]/programs/[programId]/page.tsx      # Fix #5, enrollment flow UI (#8)
app/m/[slug]/login/page.tsx                     # Add "Browse Programs" link (#7)
app/m/[slug]/signup/page.tsx                    # Add "Browse Programs" link (#7)
app/m/[slug]/dashboard/page.tsx                 # Reorder teacher inbox (#14), responsive
app/m/[slug]/students/page.tsx                  # Student info panel (#9), not redirect
app/m/[slug]/teacher/programs/[programId]/page.tsx  # Remove student (#10), student info (#9)
app/m/[slug]/admin/programs/[programId]/edit/page.tsx  # Pricing editor (#13), assign teacher (A-9)
app/m/[slug]/classes/[programId]/page.tsx       # Leave program (S-9)
app/m/[slug]/settings/page.tsx                  # Responsive polish
app/actions/enrollments.ts                      # Fix withdrawFromProgram to cancel Stripe
app/actions/applications.ts                     # Fix re-apply from rejected
app/actions/programs.ts                         # Add pricing update, delete program
app/actions/announcements.ts                    # Add update/delete announcement
components/BottomNav.tsx                        # Becomes internal to AppShell
components/BottomNavClient.tsx                  # Update for AppShell integration
lib/supabase/queries.ts                         # Add member queries, consolidate getMosqueBySlug
lib/tenants.ts                                  # Remove duplicate getMosqueBySlug
```

---

## Task 1: Update types/database.ts

**Files:**
- Modify: `types/database.ts`

- [ ] **Step 1: Read current types file**

Read `types/database.ts` to see existing structure.

- [ ] **Step 2: Update types to match actual database**

Add all missing tables and columns. The types must include:

**profiles** — add: `email`, `phone_number`, `avatar_url`, `age` (text), `gender` (text)

**mosques** — add: `primary_color`, `secondary_color`, `stripe_account_id`, `welcome_title`, `welcome_description`, `features` (text[])

**mosque_memberships** — add: `can_manage_programs` (boolean), add `lead_teacher` to role enum

**programs** — add: `is_paid` (boolean), `price_monthly_cents` (number|null), `stripe_product_id` (text|null), `stripe_price_id` (text|null), `audience_gender` (text|null), `age_range_text` (text|null), `schedule` (Json|null), `schedule_timezone` (text|null), `schedule_notes` (text|null), `thumbnail_url` (text|null)

**New tables:**
- `program_applications`: id, program_id, student_profile_id, status (`pending`|`accepted`|`rejected`|`joined`), created_at, reviewed_at, joined_at
- `program_subscriptions`: id, program_id, student_profile_id, stripe_subscription_id, stripe_customer_id, status (`active`|`canceled`|`ended`), created_at, updated_at, ended_at
- `program_announcements`: id, program_id, author_profile_id, message (text), created_at, updated_at

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add types/database.ts
git commit -m "fix: update database types to match actual Supabase schema"
```

---

## Task 2: Install shadcn/ui and dependencies

**Files:**
- Modify: `package.json`
- Create: `lib/utils.ts`
- Create/Modify: `components.json`, CSS files

- [ ] **Step 1: Install shadcn/ui**

Run: `npx shadcn@latest init`

Choose: New York style, Zinc color, CSS variables: yes. This creates `components.json`, `lib/utils.ts` with `cn()`, and updates CSS.

- [ ] **Step 2: Install core shadcn components**

Run each:
```bash
npx shadcn@latest add button card badge sheet alert-dialog dialog table input label textarea select tabs separator avatar dropdown-menu switch tooltip
```

- [ ] **Step 3: Verify build passes**

Run: `npx next build 2>&1 | tail -20`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: install shadcn/ui with core component library"
```

---

## Task 3: Consolidate getMosqueBySlug and fix queries

**Files:**
- Modify: `lib/supabase/queries.ts`
- Modify: `lib/tenants.ts`
- Modify: files that import from `lib/tenants.ts`

- [ ] **Step 1: Read both implementations**

Read `lib/supabase/queries.ts` and `lib/tenants.ts`.

- [ ] **Step 2: Consolidate into queries.ts**

Update `getMosqueBySlug` in `queries.ts` to select `*` (which it already does) and return null on error. Remove the function from `tenants.ts` and re-export from queries:

In `lib/tenants.ts`, replace `getMosqueBySlug` with an import from queries. Keep any other functions in tenants.ts.

- [ ] **Step 3: Update all imports**

Find all files importing `getMosqueBySlug` from `tenants.ts` and update to import from `queries.ts`. Files that need `notFound()` behavior should call the function and then check for null themselves.

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/queries.ts lib/tenants.ts app/
git commit -m "refactor: consolidate getMosqueBySlug into single implementation"
```

---

## Task 4: Build AppShell responsive layout

**Files:**
- Create: `components/AppShell.tsx` (server component)
- Create: `components/AppShellClient.tsx` (client component for sidebar toggle)
- Create: `components/Sidebar.tsx` (server component for sidebar content)
- Modify: `app/m/[slug]/layout.tsx`
- Modify: `components/BottomNav.tsx`

- [ ] **Step 1: Create Sidebar component**

Create `components/Sidebar.tsx` — a server component that receives role, mosque, profile props and renders:
- Mosque logo + name
- Role badge
- Navigation links (same logic as BottomNav but vertical with labels)
- User avatar + name + settings link at bottom
- Uses shadcn Badge, Avatar, Separator, Tooltip components
- Navigation items vary by role (same logic as current BottomNav.tsx)

- [ ] **Step 2: Create AppShellClient**

Create `components/AppShellClient.tsx` — handles client-side sidebar toggle for tablet:
- Uses `'use client'`
- State for sidebar expanded/collapsed
- On desktop (lg:): sidebar always visible at 240px
- On tablet (md:): sidebar starts as icon-only (64px), toggle button expands to 240px overlay
- On mobile: no sidebar rendered (hidden via CSS)
- Content area gets `ml-[240px]` on desktop, `ml-[64px]` on tablet, `ml-0` on mobile
- Renders children in main content area with responsive max-width

- [ ] **Step 3: Create AppShell**

Create `components/AppShell.tsx` — server component that:
- Receives role, mosque, profile, children
- Renders `<AppShellClient>` wrapping `<Sidebar>` and children
- Renders `<BottomNav>` only on mobile (hidden md:)
- The overall structure:
```tsx
<AppShellClient sidebar={<Sidebar role={role} mosque={mosque} profile={profile} />}>
  <main className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
    {children}
  </main>
  <div className="md:hidden">
    <BottomNav />
  </div>
</AppShellClient>
```

- [ ] **Step 4: Update tenant layout**

Modify `app/m/[slug]/layout.tsx`:
- Replace the `BottomNav` usage with `AppShell`
- Remove the `max-w-md` constraint on the content wrapper
- Pass mosque, profile, membership data to AppShell
- Keep the header with mosque branding (or integrate into sidebar)
- For unauthenticated users, render without AppShell (just content)

- [ ] **Step 5: Update BottomNav for mobile-only**

Modify `components/BottomNav.tsx` to add `md:hidden` class to the wrapper — it should only show on mobile. The AppShell controls visibility but this is a safety net.

- [ ] **Step 6: Verify responsive layout renders**

Run: `npm run dev` and check at mobile (375px), tablet (768px), and desktop (1280px) widths.

- [ ] **Step 7: Commit**

```bash
git add components/AppShell.tsx components/AppShellClient.tsx components/Sidebar.tsx app/m/[slug]/layout.tsx components/BottomNav.tsx components/BottomNavClient.tsx
git commit -m "feat: add responsive AppShell with sidebar navigation (#2)"
```

---

## Task 5: Fix programs page crash (#5)

**Files:**
- Modify: `app/m/[slug]/programs/page.tsx`
- Modify: `app/m/[slug]/programs/[programId]/page.tsx`

- [ ] **Step 1: Read both program pages**

Read the programs list and detail pages to identify null-unsafe access patterns.

- [ ] **Step 2: Add null safety to programs list page**

For each program in the list:
- `program.teacher_profile?.full_name ?? "No teacher assigned"`
- `program.schedule ? <ScheduleDisplay /> : <span>Schedule TBD</span>`
- `program.price_monthly_cents ? formatPrice(program.price_monthly_cents) : "Free"`
- Guard any `.map()` calls on potentially null arrays
- Guard thumbnail_url rendering

- [ ] **Step 3: Add null safety to program detail page**

Same pattern — guard all optional fields with fallbacks:
- Teacher info section: show "Teacher to be assigned" if null
- Schedule section: show "Schedule coming soon" if null
- Price section: show "Free" if null or not is_paid

- [ ] **Step 4: Verify the fix**

Test with a program that has minimal data (no teacher, no schedule). If As-Siddiq mosque has such programs in the database, navigate to their programs page.

- [ ] **Step 5: Commit**

```bash
git add "app/m/[slug]/programs/"
git commit -m "fix: handle null teacher/schedule/price on programs page (#5)"
```

---

## Task 6: Fix enrollment flow UI (#8)

**Files:**
- Modify: `app/m/[slug]/programs/[programId]/page.tsx`
- Modify: `app/actions/applications.ts`
- Modify: `app/m/[slug]/dashboard/page.tsx`

- [ ] **Step 1: Read enrollment-related files**

Read the program detail page, applications action, and dashboard to understand current flow.

- [ ] **Step 2: Fix re-apply from rejected status**

In `app/actions/applications.ts` `applyToProgram`:
- If `existingApplication` exists and status is `rejected`, update it back to `pending` instead of silently returning.
- Add: `if (existingApplication.status === 'rejected') { update status to 'pending', clear reviewed_at }`

- [ ] **Step 3: Update enrollment status UI on program detail page**

In `app/m/[slug]/programs/[programId]/page.tsx`, render different UI based on application status:
- No application: "Apply Now" button
- `pending`: Badge "Application Pending" + "Your application is being reviewed" message
- `accepted`: Badge "Accepted!" + prominent "Confirm Enrollment" button (free) or "Proceed to Payment" (paid)
- `rejected`: Badge "Not Accepted" + "Apply Again" button
- `joined`: Badge "Enrolled" + "Go to Class" link

Use shadcn Badge for status, Button for actions.

- [ ] **Step 4: Update student dashboard application cards**

In `app/m/[slug]/dashboard/page.tsx`, ensure the student's application inbox shows clear status with appropriate CTAs matching the program detail page.

- [ ] **Step 5: Commit**

```bash
git add "app/m/[slug]/programs/[programId]/page.tsx" app/actions/applications.ts "app/m/[slug]/dashboard/page.tsx"
git commit -m "fix: clarify enrollment flow with proper status UI (#8)"
```

---

## Task 7: Fix student info panel (#9)

**Files:**
- Create: `components/StudentInfoPanel.tsx`
- Modify: `app/m/[slug]/students/page.tsx`
- Modify: `app/m/[slug]/teacher/programs/[programId]/page.tsx`

- [ ] **Step 1: Read teacher student pages**

Read the students list page and teacher program detail page to see how students are currently rendered.

- [ ] **Step 2: Create StudentInfoPanel component**

Create `components/StudentInfoPanel.tsx`:
- Uses `'use client'`
- Uses shadcn Sheet component
- Props: `student` object (name, email, phone, age, gender, enrollment date)
- Displays student details in a clean layout inside the Sheet
- Close button to dismiss
- Uses Avatar for profile image

- [ ] **Step 3: Update students page**

In `app/m/[slug]/students/page.tsx`:
- Replace link/redirect behavior when clicking a student
- Instead, clicking opens `StudentInfoPanel` as a Sheet
- Each student row becomes a clickable element that sets selected student state

- [ ] **Step 4: Update teacher program roster**

In `app/m/[slug]/teacher/programs/[programId]/page.tsx`:
- Same pattern — clicking a student in the roster opens StudentInfoPanel
- No navigation away from the page

- [ ] **Step 5: Commit**

```bash
git add components/StudentInfoPanel.tsx "app/m/[slug]/students/page.tsx" "app/m/[slug]/teacher/programs/[programId]/page.tsx"
git commit -m "fix: show student info panel instead of redirect (#9)"
```

---

## Task 8: Add navigation links (#7)

**Files:**
- Modify: `app/m/[slug]/programs/page.tsx`
- Modify: `app/m/[slug]/login/page.tsx`
- Modify: `app/m/[slug]/signup/page.tsx`

- [ ] **Step 1: Read auth and programs pages**

Read login, signup, and programs pages.

- [ ] **Step 2: Add auth links to programs page**

In programs page, add a header section for unauthenticated users:
```tsx
{!profile && (
  <div className="flex gap-3 justify-end mb-4">
    <Button variant="outline" asChild><Link href={`/m/${slug}/login`}>Log In</Link></Button>
    <Button asChild><Link href={`/m/${slug}/signup`}>Sign Up</Link></Button>
  </div>
)}
```

- [ ] **Step 3: Add "Browse Programs" link to login page**

Add below the form: `<Link href={`/m/${slug}/programs`}>Browse Programs</Link>`

- [ ] **Step 4: Add "Browse Programs" link to signup page**

Same pattern as login.

- [ ] **Step 5: Commit**

```bash
git add "app/m/[slug]/programs/page.tsx" "app/m/[slug]/login/page.tsx" "app/m/[slug]/signup/page.tsx"
git commit -m "feat: add navigation links between programs and auth pages (#7)"
```

---

## Task 9: Move teacher inbox to top (#14)

**Files:**
- Modify: `app/m/[slug]/dashboard/page.tsx`

- [ ] **Step 1: Read teacher dashboard section**

Read the dashboard page, specifically the teacher role rendering.

- [ ] **Step 2: Reorder teacher dashboard**

Move the pending applications section above the "My Classes" section. Ensure:
- Applications section renders first
- Empty state: subtle card with "No pending applications" when count is 0
- Count badge next to section header

- [ ] **Step 3: Commit**

```bash
git add "app/m/[slug]/dashboard/page.tsx"
git commit -m "feat: move applications inbox to top of teacher dashboard (#14)"
```

---

## Task 10: Fix withdrawFromProgram to cancel Stripe subscriptions

**Files:**
- Modify: `app/actions/enrollments.ts`

- [ ] **Step 1: Read current implementation**

Read `app/actions/enrollments.ts` to see existing `withdrawFromProgram`.

- [ ] **Step 2: Add Stripe subscription cancellation**

Before deleting the enrollment, check `program_subscriptions` for an active subscription:
```typescript
// Look up active subscription
const { data: subscription } = await supabase
  .from('program_subscriptions')
  .select('stripe_subscription_id')
  .eq('program_id', programId)
  .eq('student_profile_id', profile.id)
  .eq('status', 'active')
  .single();

// Cancel Stripe subscription if exists
if (subscription?.stripe_subscription_id) {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
  // Update local record
  await supabase
    .from('program_subscriptions')
    .update({ status: 'canceled', ended_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscription.stripe_subscription_id);
}
```

- [ ] **Step 3: Commit**

```bash
git add app/actions/enrollments.ts
git commit -m "fix: cancel Stripe subscription when withdrawing from program"
```

---

## Task 11: Add remove student action and UI (#10)

**Files:**
- Create: `components/RemoveStudent.tsx`
- Modify: `app/actions/enrollments.ts`
- Modify: `app/m/[slug]/teacher/programs/[programId]/page.tsx`

- [ ] **Step 1: Add removeStudentFromProgram server action**

In `app/actions/enrollments.ts`, add:
```typescript
export async function removeStudentFromProgram(programId: string, studentProfileId: string)
```
- Verify caller is teacher of this program or mosque admin
- Cancel Stripe subscription if exists (reuse logic from Task 10)
- Delete enrollment
- Delete/update program_application to allow re-application
- Return success/error

- [ ] **Step 2: Create RemoveStudent component**

Create `components/RemoveStudent.tsx`:
- `'use client'`
- Props: studentName, programId, studentProfileId, programTitle
- Renders a DropdownMenu item or Button that triggers AlertDialog
- AlertDialog: "Remove {studentName} from {programTitle}? They will lose access to this class."
- On confirm, calls `removeStudentFromProgram` action
- Shows loading state during removal

- [ ] **Step 3: Add RemoveStudent to teacher program roster**

In teacher program detail page, add RemoveStudent component to each student row in the roster.

- [ ] **Step 4: Commit**

```bash
git add components/RemoveStudent.tsx app/actions/enrollments.ts "app/m/[slug]/teacher/programs/[programId]/page.tsx"
git commit -m "feat: allow teachers to remove students from programs (#10)"
```

---

## Task 12: Add student leave program (S-9)

**Files:**
- Create: `components/LeaveProgram.tsx`
- Modify: `app/m/[slug]/classes/[programId]/page.tsx`

- [ ] **Step 1: Create LeaveProgram component**

Create `components/LeaveProgram.tsx`:
- `'use client'`
- Props: programId, programTitle, mosqueSlug
- Button "Leave Program" that triggers AlertDialog
- AlertDialog: "Leave {programTitle}? You'll lose access to this class."
- On confirm, calls existing `withdrawFromProgram` action (now fixed with Stripe cancellation)
- Redirects to `/m/{slug}/programs` after success

- [ ] **Step 2: Add LeaveProgram to class detail page**

In `app/m/[slug]/classes/[programId]/page.tsx`, add the LeaveProgram button at the bottom of the page or in a settings section.

- [ ] **Step 3: Commit**

```bash
git add components/LeaveProgram.tsx "app/m/[slug]/classes/[programId]/page.tsx"
git commit -m "feat: allow students to leave programs (S-9)"
```

---

## Task 13: Add pricing editor (#13)

**Files:**
- Create: `components/PricingEditor.tsx`
- Modify: `app/actions/programs.ts`
- Modify: `app/m/[slug]/admin/programs/[programId]/edit/page.tsx`

- [ ] **Step 1: Read program edit page and actions**

Read the admin program edit page and `updateProgram` action.

- [ ] **Step 2: Extend updateProgram action**

In `app/actions/programs.ts`, extend `updateProgram` to handle:
- `is_paid` boolean toggle
- `price_monthly_cents` (convert from dollars input to cents)
- When toggling to paid: create Stripe product + price if they don't exist
- When changing price: create new Stripe price (Stripe prices are immutable, archive old)
- Validate mosque has `stripe_account_id` before allowing paid
- Also extend `updateTeacherProgram` with same pricing logic (gated by `can_manage_programs`)

- [ ] **Step 3: Create PricingEditor component**

Create `components/PricingEditor.tsx`:
- `'use client'`
- Switch for Free/Paid
- When paid: Input for price in dollars
- Displays current price if already paid
- Warning if mosque has no Stripe account

- [ ] **Step 4: Add PricingEditor to admin edit page**

Add the PricingEditor component to the admin program edit form.

- [ ] **Step 5: Commit**

```bash
git add components/PricingEditor.tsx app/actions/programs.ts "app/m/[slug]/admin/programs/[programId]/edit/page.tsx"
git commit -m "feat: add pricing editor for programs (#13)"
```

---

## Task 14: Add admin members page (A-4 through A-11)

**Files:**
- Create: `app/actions/members.ts`
- Create: `app/m/[slug]/admin/members/page.tsx`
- Modify: `lib/supabase/queries.ts`

- [ ] **Step 1: Add member queries**

In `lib/supabase/queries.ts`, add:
- `getMosqueMembers(mosqueId)`: returns all members with profile info (name, email, role, can_manage_programs, joined date)
- `getMosqueTeachers(mosqueId)`: returns only teachers (for program assignment dropdown)

- [ ] **Step 2: Create member management server actions**

Create `app/actions/members.ts`:
- `changeMemberRole(membershipId, newRole)` — validates caller is admin, updates role
- `toggleCanManagePrograms(membershipId)` — validates caller is admin, toggles boolean
- `removeMemberFromMosque(membershipId)` — validates caller is admin, deletes membership + cascades (remove enrollments, unassign from programs)

- [ ] **Step 3: Create admin members page**

Create `app/m/[slug]/admin/members/page.tsx`:
- Table of all mosque members using shadcn Table
- Columns: Avatar, Name, Email, Role (Badge), Joined Date, Actions
- DropdownMenu per row with:
  - Change Role → Dialog with role Select
  - Toggle Program Management (for teachers only) → Switch
  - Remove from Mosque → AlertDialog

- [ ] **Step 4: Add admin members to navigation**

Update `components/Sidebar.tsx` and `components/BottomNav.tsx` to include "Members" link for admin role.

- [ ] **Step 5: Commit**

```bash
git add app/actions/members.ts "app/m/[slug]/admin/members/page.tsx" lib/supabase/queries.ts components/Sidebar.tsx components/BottomNav.tsx
git commit -m "feat: add admin members management page (A-4 through A-11)"
```

---

## Task 15: Add teacher program creation and pricing (T-6, T-7)

**Files:**
- Modify: `app/m/[slug]/teacher/programs/[programId]/page.tsx`
- Modify: `components/Sidebar.tsx`
- Modify: `components/BottomNav.tsx`

- [ ] **Step 1: Read teacher program pages**

Read teacher program pages and the `createProgram` / `updateTeacherProgram` actions.

- [ ] **Step 2: Add "Create Program" nav for teachers with permission**

In Sidebar and BottomNav, show "Create Program" (or "New Program") link for teachers whose membership has `can_manage_programs: true`. Link to `/m/{slug}/admin/programs/new` (reuse admin form).

- [ ] **Step 3: Ensure teacher can access program creation**

The admin program creation page needs to check for either admin role OR teacher with `can_manage_programs`. Read and update the authorization check on `/m/{slug}/admin/programs/new/page.tsx`.

- [ ] **Step 4: Add PricingEditor to teacher program edit**

If teacher has `can_manage_programs`, show PricingEditor on their program edit page (reuse component from Task 13).

- [ ] **Step 5: Commit**

```bash
git add components/Sidebar.tsx components/BottomNav.tsx "app/m/[slug]/admin/programs/new/page.tsx" "app/m/[slug]/teacher/programs/[programId]/page.tsx"
git commit -m "feat: allow teachers with permission to create programs and edit pricing (T-6, T-7)"
```

---

## Task 16: Add announcement edit/delete (T-8)

**Files:**
- Modify: `app/actions/announcements.ts`
- Modify: `app/m/[slug]/teacher/programs/[programId]/page.tsx`

- [ ] **Step 1: Read announcements action and UI**

Read `app/actions/announcements.ts` and teacher program page.

- [ ] **Step 2: Add update and delete actions**

In `app/actions/announcements.ts`:
- `updateAnnouncement(announcementId, message)` — verify caller is author
- `deleteAnnouncement(announcementId)` — verify caller is author, delete row

- [ ] **Step 3: Add edit/delete UI to announcements**

On teacher program page, for each announcement authored by the current teacher:
- DropdownMenu with "Edit" and "Delete" options
- Edit: inline text area that replaces the message, save button
- Delete: AlertDialog confirmation

- [ ] **Step 4: Commit**

```bash
git add app/actions/announcements.ts "app/m/[slug]/teacher/programs/[programId]/page.tsx"
git commit -m "feat: allow teachers to edit and delete their announcements (T-8)"
```

---

## Task 17: Add program deletion and teacher assignment (A-6, A-5, A-9)

**Files:**
- Modify: `app/actions/programs.ts`
- Modify: `app/m/[slug]/admin/programs/[programId]/page.tsx`
- Modify: `app/m/[slug]/admin/programs/[programId]/edit/page.tsx`

- [ ] **Step 1: Add deleteProgram action**

In `app/actions/programs.ts`:
- `deleteProgram(programId)` — verify admin, cancel all active Stripe subscriptions, delete program_subscriptions, program_applications, enrollments, program_announcements, then delete program
- Redirect to programs list after deletion

- [ ] **Step 2: Add delete button to admin program page**

On admin program detail page, add "Delete Program" button with AlertDialog.

- [ ] **Step 3: Add teacher assignment to program edit**

On admin program edit page, add a Select dropdown populated with mosque teachers (from `getMosqueTeachers` query). Updates `teacher_profile_id` on save.

- [ ] **Step 4: Commit**

```bash
git add app/actions/programs.ts "app/m/[slug]/admin/programs/[programId]/page.tsx" "app/m/[slug]/admin/programs/[programId]/edit/page.tsx"
git commit -m "feat: add program deletion and teacher assignment (A-5, A-6, A-9)"
```

---

## Task 18: Responsive polish across all pages

**Files:**
- Modify: All page files under `app/m/[slug]/`

- [ ] **Step 1: Audit all pages for responsive layout**

Read each page and identify elements that need responsive adjustments:
- Replace `max-w-md` or `max-w-[28rem]` with responsive classes
- Add responsive grid/flex layouts where cards can go side-by-side on desktop
- Ensure forms don't stretch too wide on desktop (max-w-lg)
- Tables get horizontal scroll on mobile
- Cards can go 2-column on tablet, 3-column on desktop where appropriate

- [ ] **Step 2: Update dashboard pages**

- Student dashboard: cards in a grid on desktop (2 columns)
- Teacher dashboard: applications + classes side by side on desktop
- Admin dashboard: stats + programs side by side

- [ ] **Step 3: Update programs browse page**

- Program cards in a responsive grid: 1 col mobile, 2 col tablet, 3 col desktop
- Better spacing and card sizing

- [ ] **Step 4: Update settings and profile pages**

- Center form at max-w-lg on desktop
- Adequate padding

- [ ] **Step 5: Commit**

```bash
git add "app/m/[slug]/"
git commit -m "feat: responsive polish across all pages (#2)"
```

---

## Task 19: Write user stories document

**Files:**
- Create: `docs/user-stories.md`

- [ ] **Step 1: Write complete user stories**

Create `docs/user-stories.md` with all stories from the design spec, organized by role (Student, Teacher, Admin, Cross-cutting). Include the full ID, story text, and related issue numbers.

- [ ] **Step 2: Commit**

```bash
git add docs/user-stories.md
git commit -m "docs: add user stories with IDs for test traceability"
```

---

## Task 20: Install and configure Playwright

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`
- Create: `e2e/helpers.ts`

- [ ] **Step 1: Install Playwright**

```bash
npm init playwright@latest -- --quiet
```

Or manually:
```bash
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Configure Playwright**

Create `playwright.config.ts`:
- 3 projects: mobile (375x667), tablet (768x1024), desktop (1280x720)
- baseURL: `http://localhost:3000`
- webServer: starts `npm run dev` automatically
- Global setup/teardown files
- Test directory: `e2e/`
- Retries: 1 on CI, 0 locally

- [ ] **Step 3: Create test helpers**

Create `e2e/helpers.ts`:
- `login(page, email, password, mosqueSlug)` — navigates to login page, fills form, submits
- `createSupabaseServiceClient()` — creates a Supabase client with service role key for seeding
- `waitForNavigation(page)` — helper for page transitions
- Viewport constants

- [ ] **Step 4: Create global setup**

Create `e2e/global-setup.ts`:
- Uses Supabase service client to seed:
  - Test mosque with slug `test-mosque`, primary_color, etc.
  - Admin user (admin@test.com)
  - Teacher user (teacher@test.com) with `can_manage_programs: true`
  - Student user (student@test.com)
  - 3 programs: free (with teacher), paid (with teacher), incomplete (no teacher, no schedule)
  - Pre-existing enrollment (student in free program)
  - Pre-existing application (student applied to paid program, status: pending)

- [ ] **Step 5: Create global teardown**

Create `e2e/global-teardown.ts`:
- Deletes all test data by mosque_id (cascade)

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts e2e/ package.json package-lock.json
git commit -m "feat: install and configure Playwright with test helpers and seed data"
```

---

## Task 21: Write auth tests (S-2, S-8)

**Files:**
- Create: `e2e/auth.spec.ts`

- [ ] **Step 1: Write test suite**

```typescript
// Covers: S-2, S-8
test.describe('Authentication flows', () => {
  test('S-2: student can sign up and reach dashboard', ...);
  test('S-8: login page has Browse Programs link', ...);
  test('S-8: signup page has Browse Programs link', ...);
  test('S-2: student can log in and reach dashboard', ...);
});
```

- [ ] **Step 2: Run tests**

```bash
npx playwright test e2e/auth.spec.ts
```

- [ ] **Step 3: Commit**

```bash
git add e2e/auth.spec.ts
git commit -m "test: add auth flow tests (S-2, S-8)"
```

---

## Task 22: Write programs browse tests (S-1, S-8, R-5)

**Files:**
- Create: `e2e/programs-browse.spec.ts`

- [ ] **Step 1: Write test suite**

```typescript
// Covers: S-1, S-8, R-5
test.describe('Programs browsing', () => {
  test('S-1: can browse programs without logging in', ...);
  test('S-8: programs page shows login/signup links for unauthenticated users', ...);
  test('R-5: programs page does not crash with incomplete program data', ...);
});
```

- [ ] **Step 2: Run and commit**

---

## Task 23: Write enrollment flow tests (S-3, S-4, S-5, S-6)

**Files:**
- Create: `e2e/enrollment-flow.spec.ts`

- [ ] **Step 1: Write test suite**

Test the full flow: apply → see pending status → teacher accepts → student confirms → enrolled.

- [ ] **Step 2: Run and commit**

---

## Task 24: Write student dashboard tests (S-7, S-9, S-10, S-11)

**Files:**
- Create: `e2e/student-dashboard.spec.ts`

- [ ] **Step 1: Write test suite**

Test: view enrolled classes, leave program, edit profile, see announcements.

- [ ] **Step 2: Run and commit**

---

## Task 25: Write teacher dashboard tests (T-1, T-2, T-3, T-4, T-5, T-8)

**Files:**
- Create: `e2e/teacher-dashboard.spec.ts`

- [ ] **Step 1: Write test suite**

Test: inbox at top, accept/reject, student info panel, remove student, announcements CRUD.

- [ ] **Step 2: Run and commit**

---

## Task 26: Write teacher programs tests (T-6, T-7)

**Files:**
- Create: `e2e/teacher-programs.spec.ts`

- [ ] **Step 1: Write test suite**

Test: teacher with permission can create programs and edit pricing.

- [ ] **Step 2: Run and commit**

---

## Task 27: Write admin programs tests (A-1, A-2, A-3, A-6, A-9)

**Files:**
- Create: `e2e/admin-programs.spec.ts`

- [ ] **Step 1: Write test suite**

Test: create program, set pricing, edit pricing, delete program, assign teacher.

- [ ] **Step 2: Run and commit**

---

## Task 28: Write admin members tests (A-4, A-5, A-7, A-8, A-10, A-11)

**Files:**
- Create: `e2e/admin-members.spec.ts`

- [ ] **Step 1: Write test suite**

Test: view members, change role, toggle permissions, remove member.

- [ ] **Step 2: Run and commit**

---

## Task 29: Write responsive layout tests (R-1, R-2, R-3, R-4)

**Files:**
- Create: `e2e/responsive.spec.ts`

- [ ] **Step 1: Write test suite**

Test at each viewport:
- R-1: mobile renders correctly (bottom nav visible, no sidebar)
- R-2: tablet renders correctly (collapsible sidebar)
- R-3: desktop renders correctly (fixed sidebar)
- R-4: correct navigation component per viewport

- [ ] **Step 2: Run and commit**

---

## Task 30: Final integration test run and polish

- [ ] **Step 1: Run all tests**

```bash
npx playwright test
```

- [ ] **Step 2: Fix any failures**

Address test failures iteratively.

- [ ] **Step 3: Run build to verify no errors**

```bash
npm run build
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "test: complete Playwright test suite for all user stories"
```

- [ ] **Step 5: Push and create PR**

```bash
git push origin claude-automations
gh pr create --title "Issues sprint: bug fixes, responsive redesign, features, tests" --body "..."
```
