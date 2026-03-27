# UI Redesign & Parent Role — Design Spec

**Date:** 2026-03-21
**Scope:** Visual redesign of Programs Catalog, Login/Signup, and Settings pages; tag-based program filtering; parent role with child management.

## Guiding Principle: Mosque-First Branding

The app must feel like **the mosque's app**, powered by Suluk. Every user-facing surface uses the mosque's name, logo, and accent color as primary branding. "Powered by Suluk" appears only in small text at the bottom of the sidebar.

---

## 1. Visual Foundation

### Warm Base Palette
- Page backgrounds shift from pure white to warm cream/off-white (~`oklch(0.98 0.005 80)`)
- Card backgrounds stay white with slightly warm-tinted borders
- Sidebar gets a subtle warm tint
- Default text stays dark gray/near-black for readability

### Mosque Accent Colors
- CTA buttons (Enroll Now, Apply, Sign In, Create Account) use the mosque's `primary_color`
- Active nav items, badges, and focus rings use `primary_color`
- Each mosque's colors are different — the warm brown/gold in the designs is just one mosque's palette

### Card Styling
- Program cards: image at top, rounded-xl, subtle shadow on hover
- Consistent `rounded-xl` corners throughout
- Lighter border colors with warm undertones

### Sidebar Branding Hierarchy
- **Top:** Mosque logo + Mosque name (large) + "Community Portal" subtitle
- **Bottom (small text):** "Powered by Suluk"

---

## 2. Programs Catalog Redesign

### Page Header
- Title: "Discover Your Path"
- Subtitle: "Expand your knowledge through our curated selection of spiritual and academic programs."
- Search bar below subtitle (search by title, teacher, or topic — client-side filter)

### Tag-Based Filter Chips
- "All Programs" chip (default active) + chips auto-generated from program tags
- Tags come from a new `tags text[]` column on the `programs` table
- Only tags that exist on at least one active program for this mosque are shown
- Horizontally scrollable on mobile

### Program Cards
- **Image area (~60% of card):** Program thumbnail fills top section with overlaid badges:
  - Top-left: audience tags (SISTERS, MIXED, CHILDREN, ADVANCED) — derived from `audience_gender` + age range
  - Bottom-right: price badge ("$120 / Term", "Free", "$80 / Month")
- **Content area below image:**
  - Program title (bold)
  - Teacher name (smaller, muted)
  - Description (2-3 line clamp)
  - Footer: schedule info (clock icon + duration) | CTA button
- **CTA button logic:**
  - "Enroll Now" — open enrollment
  - "Apply" — requires application
  - "Enrolled" (disabled) — already enrolled

### Grid Layout
- 1 column mobile, 2 tablet, 3 desktop

### Out of Scope
- Event cards (tracked in GitHub issue #19)

---

## 3. Login & Signup Redesign

### Layout
- **Desktop:** Split-screen — left panel (inspirational/branding, ~45%) | right panel (form, ~55%)
- **Mobile:** Form only, inspirational content hidden or collapsed above
- No sidebar — pre-auth pages, AppShell doesn't render

### Login Page

**Left panel:**
- Mosque logo + mosque name
- Headline: "Your gateway to spiritual clarity."
- Subtitle: "[Mosque Name] welcomes you to a digital sanctuary designed for deep learning and community connection."
- Inspirational quote card at the bottom
- Warm background using mosque's secondary color at low opacity

**Right panel (form):**
- "Welcome back" heading + "Enter your credentials to continue."
- Email + Password fields
- "Forgot Password?" link (visible, non-functional — tracked in GH issue #3 comment)
- Sign In button (mosque `primary_color`)
- "Don't have an account? Create account" link
- Footer: Privacy, Terms, Help links

### Signup Page

**Left panel:**
- "BEGIN YOUR JOURNEY" label
- Headline: "The Sanctuary for Spiritual Growth."
- Feature highlights: "Curated Wisdom", "Global Community"
- Mosque branding throughout

**Right panel (form):**
- "Create Account" heading + "Choose your path to start exploring [Mosque Name]."
- **Role selector:** Two cards — Student (graduation cap icon) | Parent (users icon)
  - Selected state: bordered with mosque `primary_color`
  - Sets the `role` in the membership record
- Form fields: Full Name, Email, Password
  - Phone, age, gender removed from signup form
  - The `signup` server action must drop the hard validation for `phoneNumber`, `age`, and `gender` — these become optional profile fields editable in Settings
  - The `updateProfile` server action must also be loosened to allow saving without age/gender (currently hard-requires them)
- "Create Account" button (mosque `primary_color`)
- Terms/Privacy consent text
- "Already have an account? Login" link

---

## 4. Settings Page Redesign

### Layout
- Two-column on desktop (main ~60%, sidebar ~40%), single column on mobile
- Sidebar navigation stays (not top nav)

### Profile Card (right column)
- Mosque-colored background card (primary_color at low opacity)
- User avatar (large, centered)
- Full name, role label, "Joined [date]"
- Role badge

### Personal Information (left column)
- Full Name, Email Address, Phone Number — inline editable fields
- "Save Changes" button
- Wired to existing `updateProfile` server action (which must be updated to make age/gender optional)
- Replaces the separate `/settings/profile` route — delete `/m/[slug]/settings/profile/` directory
- Avatar upload from the existing `EditProfileForm` is moved inline to the profile card (reuse the upload logic, not the whole component)

### Admin Tools (left column, admin only)
- Links to program management, Stripe Connect
- Same as current, restyled

### Logout Button

### What's NOT included
- No 2FA, no password change, no notification preferences, no payment methods, no danger zone
- These are all out of scope

---

## 5. Parent Role System

### Data Model

**New table: `parent_child_links`**
```
parent_child_links
├── id uuid (PK, default gen_random_uuid())
├── parent_profile_id uuid (FK → profiles.id)
├── child_profile_id uuid (FK → profiles.id)
├── mosque_id uuid (FK → mosques.id)
├── created_at timestamptz (default now())
└── UNIQUE(parent_profile_id, child_profile_id, mosque_id)
```

**RLS policies:**
- Parents can SELECT/INSERT/DELETE their own links
- Admins can SELECT all links for their mosque
- Children cannot see or modify the links

### Signup Flow
- Parent selects "Parent" role at signup → the `signup` server action is extended to:
  1. Create the Supabase auth user and profile (existing behavior)
  2. **Insert a `mosque_memberships` row** with `role: 'parent'` for the current mosque
  - Currently, `signup` does NOT create a membership row — it only creates the auth user and upserts a profile. The student flow works because the layout falls back to `role = 'student'` when membership is null. For parents, this fallback would be wrong, so the membership must be explicitly created at signup.
  - This change also benefits students: create a membership row with `role: 'student'` at signup for consistency.
- After signup, parent lands on dashboard with prompt to "Add your first child"
- Add child form: Full Name, Date of Birth, Gender
  - Store `date_of_birth date` instead of `age integer` for children — a static age integer becomes wrong after a year. The `profiles` table should add an optional `date_of_birth` column. Display age is computed from DOB at render time.
- Child gets a `profiles` row but no auth credentials (no `auth.users` row)
- Child's `mosque_memberships` role is `'student'`
- If child wants their own login later, they can sign up independently and be linked

### Parent Dashboard
- Shows each linked child as a card
- Each child card: name, age, enrollments, application statuses, latest announcements
- Parent can tap into a child's enrollment for details
- Action: "Enroll [Child Name]" → opens program catalog scoped to that child

### Enrollment on Behalf
- When parent browses programs, a child selector appears before "Enroll Now" / "Apply"
- **New server actions required** (existing ones auth-gate via `supabase.auth.getUser()` and cannot insert with a different `profile_id`):
  - `enrollChildInProgram(childProfileId, programId, slug)` — verifies the parent-child link via `parent_child_links` before inserting enrollment with `child_profile_id`
  - `applyForChild(childProfileId, programId, slug)` — same pattern for applications
- Parent handles Stripe checkout for paid programs

### RLS Changes for Parent Enrollment
- `enrollments` table needs an additional INSERT/SELECT policy: allow when `auth.uid()` has a matching `parent_child_links` row for the `student_profile_id`
- `program_applications` table needs the same: allow INSERT/SELECT where the `profile_id` is a child linked to `auth.uid()` via `parent_child_links`

### Blocking Parents from Direct Self-Enrollment
- The existing `enrollInProgram` and `applyToProgram` server actions must add `role === 'parent'` to their rejection guards (alongside `teacher` and `mosque_admin`). Parents should only enroll via `enrollChildInProgram` / `applyForChild`, never for themselves.

### Child Profile Creation Without auth.users
- In standard Supabase setups, `profiles.id` is a FK to `auth.users.id`. Child profiles have no auth user, so this FK must be addressed.
- **Approach:** Use the Supabase service role client in the `addChild` server action to insert the child profile with a generated UUID. The `profiles` table FK constraint (`profiles.id → auth.users.id`) must be dropped or made optional to allow child-only profiles.
- The migration must: (1) drop the FK constraint on `profiles.id`, (2) ensure RLS policies still work correctly since child profiles won't have a matching `auth.uid()`.
- Child profiles are identifiable by having no corresponding `auth.users` row. The parent-child link table provides the access control layer instead of auth-based RLS.

### Navigation
- Parent gets: Home, Programs, Settings
- No "Classes" link — parents view classes through children's cards
- **`lib/nav.ts` changes required:**
  - Add `role === 'parent'` branch to `getNavItems()` returning Home, Programs, Settings
  - Add `'parent'` case to `getRoleLabel()` returning "Parent"

### User Stories
1. US-P1: As a parent, I can sign up selecting the "Parent" role
2. US-P2: As a parent, I can add a child to my account
3. US-P3: As a parent, I can view my children's enrollments on my dashboard
4. US-P4: As a parent, I can browse programs and enroll a child
5. US-P5: As a parent, I can apply to a program on behalf of my child
6. US-P6: As a parent, I can view application status for my children

---

## 6. Database Changes Summary

### Programs table
- Add column: `tags text[]` (array of free-form strings)
- Filter chips auto-generated via `SELECT DISTINCT unnest(tags) FROM programs WHERE mosque_id = ? AND is_active = true`
- Admin program create/edit forms get a tags input (multi-select or comma-separated)

### New table: `parent_child_links`
- Schema defined in Section 5
- RLS policies defined in Section 5

### Signup changes
- `signup` server action gets optional `role` parameter (`'student' | 'parent'`)
- Defaults to `'student'` for backward compatibility
- Drops hard validation for `phoneNumber`, `age`, `gender` — these become optional
- **Inserts a `mosque_memberships` row** with the selected role at signup (currently not done)

### Profile changes
- Add optional `date_of_birth date` column to `profiles` (used for child profiles, optional for adults)
- `updateProfile` action loosened to not require age/gender
- Child profiles are regular `profiles` rows without auth credentials

### New server actions
- `addChild(fullName, dateOfBirth, gender, slug)` — creates child profile + membership + parent-child link
- `enrollChildInProgram(childProfileId, programId, slug)` — parent enrolls child, verifies link
- `applyForChild(childProfileId, programId, slug)` — parent applies for child, verifies link
- `removeChild(childProfileId, slug)` — removes parent-child link (does not delete the profile)

### RLS policy changes
- `enrollments`: add INSERT/SELECT policy for parents via `parent_child_links` join
- `program_applications`: add INSERT/SELECT policy for parents via `parent_child_links` join

---

## 7. Related GitHub Issues

- **#19** — Events system for mosques (scoped out, backlog)
- **#3** — OAuth issue, comment added for Forgot Password flow
