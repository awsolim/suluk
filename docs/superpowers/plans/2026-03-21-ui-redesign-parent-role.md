# UI Redesign & Parent Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Programs Catalog, Login/Signup, and Settings pages with warm mosque-first branding; add tag-based program filtering and a parent role with child management.

**Architecture:** Server-first Next.js 16 App Router with Supabase. New `parent_child_links` table and `tags` column on programs. New server actions for parent-on-behalf enrollment. Visual redesign uses CSS variable shifts and component-level restyling — no new dependencies.

**Tech Stack:** Next.js 16, React 19, Supabase (Postgres + RLS + Auth), Tailwind CSS 4, shadcn/ui (base-nova), Playwright for e2e tests.

**Spec:** `docs/superpowers/specs/2026-03-21-ui-redesign-parent-role-design.md`

---

## File Structure

### New Files
- `supabase/migrations/001_tags_parent_role.sql` — migration for tags, parent_child_links, date_of_birth, FK changes, RLS
- `app/actions/children.ts` — addChild, removeChild server actions
- `app/actions/parent-enrollment.ts` — enrollChildInProgram, applyForChild server actions
- `components/programs/ProgramCard.tsx` — redesigned program card component
- `components/programs/TagFilter.tsx` — client component for tag filter chips
- `components/programs/ProgramSearch.tsx` — client component for search bar
- `components/programs/ChildSelector.tsx` — child selector for parent enrollment
- `components/settings/ProfileCard.tsx` — profile sidebar card
- `components/settings/PersonalInfoForm.tsx` — inline profile edit form (client)
- `components/dashboard/ParentDashboard.tsx` — parent dashboard with child cards
- `components/dashboard/AddChildDialog.tsx` — dialog for adding a child (client)
- `components/dashboard/ChildCard.tsx` — child card showing enrollments
- `components/auth/AuthLayout.tsx` — split-screen layout for login/signup
- `components/auth/RoleSelector.tsx` — student/parent role picker (client)
- `e2e/parent-role.spec.ts` — Playwright tests for parent user stories

### Modified Files
- `app/globals.css` — warm palette CSS variables
- `app/actions/auth.ts:7-55` — drop hard validation, add role param, create membership
- `app/actions/profile.ts:22-31` — loosen age/gender validation
- `app/actions/enrollments.ts:70-75` — add parent to role guard
- `app/actions/applications.ts:58-60` — add parent to role guard
- `app/actions/programs.ts:161-169` — add tags to createProgram
- `app/actions/programs.ts:236-290` — add tags to updateProgram
- `lib/nav.ts:16-65` — add parent branch to getNavItems and getRoleLabel
- `lib/supabase/queries.ts` — add tag query, parent-child queries
- `types/database.ts` — add parent_child_links type, tags to programs, date_of_birth to profiles, parent to role union
- `components/Sidebar.tsx` — mosque-first branding, "Powered by Tareeqah" footer
- `components/BottomNav.tsx:28-64` — add parent nav branch
- `components/BottomNavClient.tsx` — add parent icon
- `app/m/[slug]/programs/page.tsx` — full redesign with search + tags + new cards
- `app/m/[slug]/login/page.tsx` — full redesign with split layout
- `app/m/[slug]/signup/page.tsx` — full redesign with role selector
- `app/m/[slug]/settings/page.tsx` — full redesign with inline profile edit
- `app/m/[slug]/dashboard/page.tsx` — add parent dashboard branch
- `app/m/[slug]/layout.tsx:60` — handle parent role fallback
- `app/m/[slug]/admin/programs/new/page.tsx` — add tags input
- `app/m/[slug]/admin/programs/[id]/page.tsx` — add tags to edit form (if inline editing exists)

### Deleted Files
- `app/m/[slug]/settings/profile/page.tsx` — replaced by inline Settings form
- `app/m/[slug]/settings/profile/EditProfileForm.tsx` — avatar logic moved to ProfileCard

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/001_tags_parent_role.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- 1. Add tags column to programs
ALTER TABLE programs ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- 2. Add date_of_birth column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth date;

-- 3. Drop FK constraint on profiles.id -> auth.users.id (if it exists)
-- This allows child profiles without auth users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_id_fkey'
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
END $$;

-- 4. Add 'parent' to mosque_memberships role check constraint
-- First drop existing constraint, then recreate with parent
ALTER TABLE mosque_memberships DROP CONSTRAINT IF EXISTS mosque_memberships_role_check;
ALTER TABLE mosque_memberships ADD CONSTRAINT mosque_memberships_role_check
  CHECK (role IN ('mosque_admin', 'lead_teacher', 'teacher', 'student', 'parent'));

-- 5. Create parent_child_links table
CREATE TABLE IF NOT EXISTS parent_child_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mosque_id uuid NOT NULL REFERENCES mosques(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_profile_id, child_profile_id, mosque_id)
);

-- 6. RLS for parent_child_links
ALTER TABLE parent_child_links ENABLE ROW LEVEL SECURITY;

-- Parents can see their own links
CREATE POLICY "parents_select_own_links" ON parent_child_links
  FOR SELECT USING (parent_profile_id = auth.uid());

-- Parents can insert their own links
CREATE POLICY "parents_insert_own_links" ON parent_child_links
  FOR INSERT WITH CHECK (parent_profile_id = auth.uid());

-- Parents can delete their own links
CREATE POLICY "parents_delete_own_links" ON parent_child_links
  FOR DELETE USING (parent_profile_id = auth.uid());

-- Admins can see all links for their mosque
CREATE POLICY "admins_select_mosque_links" ON parent_child_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mosque_memberships
      WHERE mosque_memberships.profile_id = auth.uid()
      AND mosque_memberships.mosque_id = parent_child_links.mosque_id
      AND mosque_memberships.role = 'mosque_admin'
    )
  );

-- 7. RLS additions for enrollments — parents can see children's enrollments
CREATE POLICY "parents_select_child_enrollments" ON enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_child_links
      WHERE parent_child_links.parent_profile_id = auth.uid()
      AND parent_child_links.child_profile_id = enrollments.student_profile_id
    )
  );

-- Parents can insert enrollments for their children
CREATE POLICY "parents_insert_child_enrollments" ON enrollments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM parent_child_links
      WHERE parent_child_links.parent_profile_id = auth.uid()
      AND parent_child_links.child_profile_id = enrollments.student_profile_id
    )
  );

-- 8. RLS additions for program_applications — parents can see/create children's applications
CREATE POLICY "parents_select_child_applications" ON program_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_child_links
      WHERE parent_child_links.parent_profile_id = auth.uid()
      AND parent_child_links.child_profile_id = program_applications.student_profile_id
    )
  );

CREATE POLICY "parents_insert_child_applications" ON program_applications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM parent_child_links
      WHERE parent_child_links.parent_profile_id = auth.uid()
      AND parent_child_links.child_profile_id = program_applications.student_profile_id
    )
  );

-- 9. RLS for profiles — parents can see their children's profiles
CREATE POLICY "parents_select_child_profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_child_links
      WHERE parent_child_links.parent_profile_id = auth.uid()
      AND parent_child_links.child_profile_id = profiles.id
    )
  );
```

- [ ] **Step 2: Apply the migration**

Run the SQL in the Supabase Dashboard SQL Editor, or via CLI:
```bash
supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/001_tags_parent_role.sql
git commit -m "feat: add tags, parent_child_links, date_of_birth migration"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `types/database.ts`

- [ ] **Step 1: Add parent to role union, tags to programs, date_of_birth to profiles, new table type**

In `types/database.ts`, make these changes:

1. In the `profiles` Row/Insert/Update types, add:
```typescript
date_of_birth: string | null  // date type maps to string in Supabase JS
```

2. In the `mosque_memberships` role types, add `'parent'` to the union:
```typescript
role: 'mosque_admin' | 'lead_teacher' | 'teacher' | 'student' | 'parent'
```

3. In the `programs` Row/Insert/Update types, add:
```typescript
tags: string[]
```

4. Add new table type for `parent_child_links`:
```typescript
parent_child_links: {
  Row: {
    id: string
    parent_profile_id: string
    child_profile_id: string
    mosque_id: string
    created_at: string
  }
  Insert: {
    id?: string
    parent_profile_id: string
    child_profile_id: string
    mosque_id: string
    created_at?: string
  }
  Update: {
    id?: string
    parent_profile_id?: string
    child_profile_id?: string
    mosque_id?: string
    created_at?: string
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add types/database.ts
git commit -m "feat: update types for tags, parent role, date_of_birth"
```

---

## Task 3: Update Signup Action

**Files:**
- Modify: `app/actions/auth.ts:7-55`

- [ ] **Step 1: Update signup to drop hard validation, add role param, create membership**

Changes to `signup` function in `app/actions/auth.ts`:

0. Add import at top of file: `import { getMosqueBySlug } from "@/lib/supabase/queries";`

1. Remove `phoneNumber`, `age`, `gender` from the required validation guard (line 16). Keep only `fullName`, `email`, `password`, `slug`.

2. Add `role` form field extraction:
```typescript
const role = String(formData.get("role") || "student").trim();
```

3. Remove `phoneNumber`, `age`, `gender` from `supabase.auth.signUp` options data (lines 27-31) — only pass `full_name`.

4. Remove `phone_number`, `age`, `gender` from the profiles upsert (lines 43-46) — only upsert `full_name` and `email`.

5. After the profile upsert succeeds, insert a `mosque_memberships` row:
```typescript
const mosque = await getMosqueBySlug(slug);
if (mosque) {
  await supabase.from("mosque_memberships").upsert({
    mosque_id: mosque.id,
    profile_id: data.user.id,
    role: role === "parent" ? "parent" : "student",
  }, { onConflict: "mosque_id,profile_id" });
}
```

6. Redirect to the mosque dashboard after signup: `redirect(\`/m/\${slug}/dashboard\`)`.

- [ ] **Step 2: Verify the login action still works unchanged**

The `login` function (lines 57-78) should not need changes.

- [ ] **Step 3: Commit**

```bash
git add app/actions/auth.ts
git commit -m "feat: simplify signup, add role param, create membership at signup"
```

---

## Task 4: Update Profile Action

**Files:**
- Modify: `app/actions/profile.ts:22-31`

- [ ] **Step 1: Remove hard validation for age and gender**

In `app/actions/profile.ts`, remove the validation blocks at lines 22-31 that reject when `age` or `gender` are missing. Make them optional — only validate them if they are provided:

```typescript
// Remove these blocks:
// if (!age || age < 1) { return { error: "Valid age is required." }; }
// if (!gender) { return { error: "Gender is required." }; }

// Keep phone as optional too:
// Remove: if (!phoneNumber) { return { error: "Phone number is required." }; }
```

Update the Supabase update call to only include fields that have values:
```typescript
const updateData: Record<string, unknown> = { full_name: fullName };
if (phoneNumber) updateData.phone_number = phoneNumber;
if (age && age > 0) updateData.age = age;
if (gender) updateData.gender = gender;
```

- [ ] **Step 2: Commit**

```bash
git add app/actions/profile.ts
git commit -m "feat: loosen profile validation, make age/gender/phone optional"
```

---

## Task 5: Update Navigation

**Files:**
- Modify: `lib/nav.ts:16-65`

- [ ] **Step 1: Add parent branch to getNavItems**

In `lib/nav.ts`, add a parent branch before the student fallback (around line 50):

```typescript
// Parent
if (role === "parent") {
  return [
    { label: "Home", href: `/m/${slug}/dashboard`, icon: "home" },
    { label: "Programs", href: `/m/${slug}/programs`, icon: "programs" },
    { label: "Settings", href: `/m/${slug}/settings`, icon: "settings" },
  ];
}
```

- [ ] **Step 2: Add parent case to getRoleLabel**

In `getRoleLabel` (line 60-65), add before the final return:

```typescript
if (role === "parent") return "Parent";
```

- [ ] **Step 3: Commit**

```bash
git add lib/nav.ts
git commit -m "feat: add parent role to navigation and role labels"
```

---

## Task 6: Update Enrollment & Application Guards

**Files:**
- Modify: `app/actions/enrollments.ts:70-75`
- Modify: `app/actions/applications.ts:58-60`

- [ ] **Step 1: Add parent to enrollInProgram guard**

In `app/actions/enrollments.ts`, update the role guard (around line 70-75):

```typescript
const isTeacher = membership?.role === "teacher";
const isMosqueAdmin = membership?.role === "mosque_admin";
const isParent = membership?.role === "parent";

if (isTeacher || isMosqueAdmin || isParent) {
  throw new Error("Only student accounts can enroll in programs.");
}
```

- [ ] **Step 2: Add parent to applyToProgram guard**

In `app/actions/applications.ts`, update the role guard (around line 58-60):

```typescript
const isParent = membership?.role === "parent";
// Add isParent to the existing check
if (isTeacher || isMosqueAdmin || isParent) {
  throw new Error("Only student accounts can apply to programs.");
}
```

- [ ] **Step 3: Commit**

```bash
git add app/actions/enrollments.ts app/actions/applications.ts
git commit -m "feat: block parent role from direct self-enrollment"
```

---

## Task 7: New Database Queries

**Files:**
- Modify: `lib/supabase/queries.ts`

- [ ] **Step 1: Add tag query function**

```typescript
export async function getActiveTagsForMosque(mosqueId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("programs")
    .select("tags")
    .eq("mosque_id", mosqueId)
    .eq("is_active", true);

  if (!data) return [];
  const allTags = data.flatMap((p) => p.tags || []);
  return [...new Set(allTags)].sort();
}
```

- [ ] **Step 2: Add getProgramApplicationForStudent query**

```typescript
export async function getProgramApplicationForStudent(
  studentProfileId: string,
  programId: string
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("program_applications")
    .select("id, status")
    .eq("student_profile_id", studentProfileId)
    .eq("program_id", programId)
    .single();

  return data;
}
```

- [ ] **Step 3: Add parent-child query functions**

```typescript
export async function getChildrenForParent(parentProfileId: string, mosqueId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("parent_child_links")
    .select(`
      id,
      child_profile_id,
      created_at,
      profiles!parent_child_links_child_profile_id_fkey (
        id, full_name, date_of_birth, gender, avatar_url
      )
    `)
    .eq("parent_profile_id", parentProfileId)
    .eq("mosque_id", mosqueId);

  return data || [];
}

export async function getChildEnrollments(childProfileId: string, mosqueId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select(`
      id,
      created_at,
      programs (
        id, title, description, thumbnail_url, schedule, schedule_timezone,
        mosque_id,
        teacher_profile_id,
        profiles!programs_teacher_profile_id_fkey ( full_name, avatar_url )
      )
    `)
    .eq("student_profile_id", childProfileId);

  // PostgREST does not reliably filter parent rows via foreign table dot-notation.
  // Filter in JS instead, following the pattern in getEnrollmentsForStudentInMosque.
  return (data || []).filter((e) => e.programs?.mosque_id === mosqueId);
}

export async function getChildApplications(childProfileId: string, mosqueId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("program_applications")
    .select(`
      id,
      status,
      created_at,
      programs (
        id, title, description, thumbnail_url, mosque_id
      )
    `)
    .eq("student_profile_id", childProfileId)
    .order("created_at", { ascending: false });

  // Filter by mosque in JS — same PostgREST limitation as above.
  return (data || []).filter((a) => a.programs?.mosque_id === mosqueId);
}

export async function verifyParentChildLink(
  parentProfileId: string,
  childProfileId: string,
  mosqueId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("parent_child_links")
    .select("id")
    .eq("parent_profile_id", parentProfileId)
    .eq("child_profile_id", childProfileId)
    .eq("mosque_id", mosqueId)
    .single();

  return !!data;
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/queries.ts
git commit -m "feat: add tag and parent-child query functions"
```

---

## Task 8: Parent Server Actions

**Files:**
- Create: `app/actions/children.ts`
- Create: `app/actions/parent-enrollment.ts`

- [ ] **Step 1: Create addChild and removeChild actions**

Create `app/actions/children.ts`:

```typescript
"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { getMosqueBySlug, getMosqueMembershipForUser } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

export async function addChild(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const slug = String(formData.get("slug") || "").trim();
  const fullName = String(formData.get("full_name") || "").trim();
  const dateOfBirth = String(formData.get("date_of_birth") || "").trim();
  const gender = String(formData.get("gender") || "").trim();

  if (!fullName || !slug) {
    return { error: "Full name is required." };
  }

  const mosque = await getMosqueBySlug(slug);
  if (!mosque) return { error: "Mosque not found." };

  const membership = await getMosqueMembershipForUser(user.id, mosque.id);
  if (membership?.role !== "parent") {
    return { error: "Only parent accounts can add children." };
  }

  // Use service client to bypass RLS — child has no auth user
  const serviceClient = createServiceClient();
  const childId = randomUUID();

  // Create child profile
  const { error: profileError } = await serviceClient
    .from("profiles")
    .insert({
      id: childId,
      full_name: fullName,
      date_of_birth: dateOfBirth || null,
      gender: gender || null,
    });

  if (profileError) return { error: "Failed to create child profile." };

  // Create child membership
  const { error: membershipError } = await serviceClient
    .from("mosque_memberships")
    .insert({
      mosque_id: mosque.id,
      profile_id: childId,
      role: "student",
    });

  if (membershipError) return { error: "Failed to create child membership." };

  // Create parent-child link
  const { error: linkError } = await supabase
    .from("parent_child_links")
    .insert({
      parent_profile_id: user.id,
      child_profile_id: childId,
      mosque_id: mosque.id,
    });

  if (linkError) return { error: "Failed to link child to parent." };

  return { success: true };
}

export async function removeChild(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const slug = String(formData.get("slug") || "").trim();
  const childProfileId = String(formData.get("child_profile_id") || "").trim();

  if (!childProfileId || !slug) return { error: "Missing required fields." };

  const mosque = await getMosqueBySlug(slug);
  if (!mosque) return { error: "Mosque not found." };

  // Delete the link only (not the child profile)
  const { error } = await supabase
    .from("parent_child_links")
    .delete()
    .eq("parent_profile_id", user.id)
    .eq("child_profile_id", childProfileId)
    .eq("mosque_id", mosque.id);

  if (error) return { error: "Failed to remove child link." };
  return { success: true };
}
```

- [ ] **Step 2: Create enrollChildInProgram and applyForChild actions**

Create `app/actions/parent-enrollment.ts`:

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getMosqueBySlug,
  getMosqueMembershipForUser,
  verifyParentChildLink,
  getEnrollmentForStudent,
  getProgramApplicationForStudent,
  getProgramByIdForMosque,
} from "@/lib/supabase/queries";
import { redirect } from "next/navigation";

export async function enrollChildInProgram(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const slug = String(formData.get("slug") || "").trim();
  const childProfileId = String(formData.get("child_profile_id") || "").trim();
  const programId = String(formData.get("program_id") || "").trim();

  if (!slug || !childProfileId || !programId) {
    return { error: "Missing required fields." };
  }

  const mosque = await getMosqueBySlug(slug);
  if (!mosque) return { error: "Mosque not found." };

  // Verify parent role
  const membership = await getMosqueMembershipForUser(user.id, mosque.id);
  if (membership?.role !== "parent") {
    return { error: "Only parent accounts can enroll children." };
  }

  // Verify parent-child link
  const isLinked = await verifyParentChildLink(user.id, childProfileId, mosque.id);
  if (!isLinked) {
    return { error: "This child is not linked to your account." };
  }

  // Check program exists and is active
  const program = await getProgramByIdForMosque(programId, mosque.id);
  if (!program) return { error: "Program not found." };

  // Check not already enrolled
  const existing = await getEnrollmentForStudent(programId, childProfileId);
  if (existing) return { error: "Child is already enrolled in this program." };

  // Check if paid program — redirect to Stripe
  if (program.is_paid) {
    return { error: "Paid enrollment requires checkout. Use the checkout flow." };
  }

  // Enroll the child
  const { error } = await supabase
    .from("enrollments")
    .insert({
      program_id: programId,
      student_profile_id: childProfileId,
    });

  if (error) return { error: "Failed to enroll child." };
  return { success: true };
}

export async function applyForChild(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const slug = String(formData.get("slug") || "").trim();
  const childProfileId = String(formData.get("child_profile_id") || "").trim();
  const programId = String(formData.get("program_id") || "").trim();

  if (!slug || !childProfileId || !programId) {
    return { error: "Missing required fields." };
  }

  const mosque = await getMosqueBySlug(slug);
  if (!mosque) return { error: "Mosque not found." };

  // Verify parent role
  const membership = await getMosqueMembershipForUser(user.id, mosque.id);
  if (membership?.role !== "parent") {
    return { error: "Only parent accounts can apply on behalf of children." };
  }

  // Verify parent-child link
  const isLinked = await verifyParentChildLink(user.id, childProfileId, mosque.id);
  if (!isLinked) {
    return { error: "This child is not linked to your account." };
  }

  // Check not already applied
  const existing = await getProgramApplicationForStudent(childProfileId, programId);
  if (existing) return { error: "An application already exists for this child." };

  // Create application
  const { error } = await supabase
    .from("program_applications")
    .insert({
      program_id: programId,
      student_profile_id: childProfileId,
      status: "pending",
    });

  if (error) return { error: "Failed to submit application." };
  return { success: true };
}
```

- [ ] **Step 3: Commit**

```bash
git add app/actions/children.ts app/actions/parent-enrollment.ts
git commit -m "feat: add parent server actions for child management and enrollment"
```

---

## Task 9: Warm Palette CSS

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Update CSS variables for warm base palette**

In `app/globals.css`, update the `:root` light theme variables to shift from pure neutral to warm tones:

```css
/* Key changes — warm undertones */
--background: oklch(0.98 0.005 80);      /* warm cream instead of pure white */
--card: oklch(1 0 0);                     /* cards stay white for contrast */
--card-foreground: oklch(0.145 0 0);
--border: oklch(0.91 0.008 80);           /* warm-tinted border */
--input: oklch(0.91 0.008 80);
--muted: oklch(0.96 0.005 80);            /* warm muted */
--secondary: oklch(0.96 0.005 80);
--accent: oklch(0.96 0.005 80);
--sidebar: oklch(0.975 0.005 80);         /* slightly warm sidebar */
--sidebar-border: oklch(0.91 0.008 80);
--sidebar-accent: oklch(0.96 0.005 80);
```

Leave the dark theme unchanged.

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "style: shift to warm cream base palette"
```

---

## Task 10: Sidebar Branding

**Files:**
- Modify: `components/Sidebar.tsx`

- [ ] **Step 1: Update sidebar to mosque-first branding**

In `components/Sidebar.tsx`, restructure the sidebar header:

1. **Top section:** Mosque logo (existing) + Mosque name in large text + "Community Portal" subtitle below it
2. **Bottom of sidebar (new):** Small "Powered by Tareeqah" text with muted styling

The sidebar already receives `mosqueName` and `mosqueLogoSrc` as props. Update the JSX:

- Replace any "Tareeqah" branding with the mosque name
- Add a small footer div at the bottom with `text-xs text-muted-foreground` showing "Powered by Tareeqah"
- Keep the nav items and profile section as-is

- [ ] **Step 2: Commit**

```bash
git add components/Sidebar.tsx
git commit -m "style: mosque-first sidebar branding with 'Powered by Tareeqah' footer"
```

---

## Task 11: Program Card Component

**Files:**
- Create: `components/programs/ProgramCard.tsx`

- [ ] **Step 1: Create the redesigned program card**

Create `components/programs/ProgramCard.tsx` — a server component:

```typescript
import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProgramCardProps {
  program: {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    audience_gender: string | null;
    age_range_text: string | null;
    is_paid: boolean;
    price_monthly_cents: number | null;
    schedule: unknown;
    tags: string[];
    profiles: { full_name: string; avatar_url: string | null } | null;
  };
  slug: string;
  isEnrolled: boolean;
  hasApplication: boolean;
  primaryColor: string;
}

export function ProgramCard({
  program,
  slug,
  isEnrolled,
  hasApplication,
  primaryColor,
}: ProgramCardProps) {
  // Derive audience label
  const audienceLabel = program.audience_gender === "female"
    ? "SISTERS"
    : program.audience_gender === "male"
    ? "BROTHERS"
    : program.audience_gender === "mixed"
    ? "MIXED"
    : null;

  const ageLabel = program.age_range_text
    ? program.age_range_text.toUpperCase()
    : null;

  // Price display
  const priceLabel = !program.is_paid
    ? "Free"
    : program.price_monthly_cents
    ? `$${(program.price_monthly_cents / 100).toFixed(0)} / Month`
    : null;

  // CTA
  const ctaLabel = isEnrolled
    ? "Enrolled"
    : hasApplication
    ? "Applied"
    : program.is_paid
    ? "Enroll Now"
    : "Enroll Now";

  const isDisabled = isEnrolled || hasApplication;

  return (
    <Link
      href={`/m/${slug}/programs/${program.id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {program.thumbnail_url ? (
          <img
            src={program.thumbnail_url}
            alt={program.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <span className="text-4xl text-muted-foreground/30">📚</span>
          </div>
        )}

        {/* Audience badges - top left */}
        <div className="absolute left-2 top-2 flex gap-1">
          {audienceLabel && (
            <span className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-foreground">
              {audienceLabel}
            </span>
          )}
          {ageLabel && (
            <span className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-foreground">
              {ageLabel}
            </span>
          )}
        </div>

        {/* Price badge - bottom right */}
        {priceLabel && (
          <span
            className="absolute bottom-2 right-2 rounded px-2 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {priceLabel}
          </span>
        )}
      </div>

      {/* Content area */}
      <div className="flex flex-col gap-2 p-4">
        <h3 className="text-base font-semibold text-foreground line-clamp-1">
          {program.title}
        </h3>
        {program.profiles && (
          <p className="text-sm text-muted-foreground">
            {program.profiles.full_name}
          </p>
        )}
        {program.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {program.description}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Ongoing</span>
          </div>
          <span
            className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-white"
            style={{
              backgroundColor: isDisabled ? "#9ca3af" : primaryColor,
            }}
          >
            {ctaLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/programs/ProgramCard.tsx
git commit -m "feat: create redesigned ProgramCard component"
```

---

## Task 12: Tag Filter & Search Components

**Files:**
- Create: `components/programs/TagFilter.tsx`
- Create: `components/programs/ProgramSearch.tsx`

- [ ] **Step 1: Create TagFilter client component**

Create `components/programs/TagFilter.tsx`:

```typescript
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface TagFilterProps {
  tags: string[];
  slug: string;
  primaryColor: string;
}

export function TagFilter({ tags, slug, primaryColor }: TagFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTag = searchParams.get("tag") || "";

  const handleTagClick = useCallback(
    (tag: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tag === "") {
        params.delete("tag");
      } else {
        params.set("tag", tag);
      }
      router.push(`/m/${slug}/programs?${params.toString()}`);
    },
    [router, searchParams, slug],
  );

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      <button
        onClick={() => handleTagClick("")}
        className="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
        style={
          activeTag === ""
            ? { backgroundColor: primaryColor, color: "white" }
            : { backgroundColor: "var(--muted)", color: "var(--foreground)" }
        }
      >
        All Programs
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => handleTagClick(tag)}
          className="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
          style={
            activeTag === tag
              ? { backgroundColor: primaryColor, color: "white" }
              : { backgroundColor: "var(--muted)", color: "var(--foreground)" }
          }
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create ProgramSearch client component**

Create `components/programs/ProgramSearch.tsx`:

```typescript
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ProgramSearchProps {
  slug: string;
}

export function ProgramSearch({ slug }: ProgramSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = useCallback(
    (value: string) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
          params.set("q", value);
        } else {
          params.delete("q");
        }
        router.push(`/m/${slug}/programs?${params.toString()}`);
      }, 300); // 300ms debounce to avoid hammering server on every keystroke
    },
    [router, searchParams, slug],
  );

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search by title, teacher, or topic..."
        defaultValue={query}
        onChange={(e) => handleSearch(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/programs/TagFilter.tsx components/programs/ProgramSearch.tsx
git commit -m "feat: create TagFilter and ProgramSearch client components"
```

---

## Task 13: Programs Catalog Page Redesign

**Files:**
- Modify: `app/m/[slug]/programs/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the programs catalog page**

Rewrite `app/m/[slug]/programs/page.tsx` to use the new components:

1. Import `ProgramCard`, `TagFilter`, `ProgramSearch`, and query functions
2. Fetch programs, tags, enrollment status, and application status
3. Apply server-side filtering by tag (from `searchParams.tag`) and search query (`searchParams.q`)
4. Render:
   - Page header: "Discover Your Path" + subtitle
   - `<ProgramSearch>` below header
   - `<TagFilter>` with tags from `getActiveTagsForMosque()`
   - Grid of `<ProgramCard>` components (1/2/3 column responsive)
   - Guest banner for unauthenticated users

Key filter logic (server-side):
```typescript
let filteredPrograms = programs;
if (tag) {
  filteredPrograms = filteredPrograms.filter((p) =>
    p.tags?.includes(tag)
  );
}
if (q) {
  const lower = q.toLowerCase();
  filteredPrograms = filteredPrograms.filter(
    (p) =>
      p.title.toLowerCase().includes(lower) ||
      p.description?.toLowerCase().includes(lower) ||
      p.profiles?.full_name?.toLowerCase().includes(lower)
  );
}

// IMPORTANT: For parents, skip enrollment/application lookups.
// Parents don't enroll themselves — they use ChildSelector on the detail page.
// Set enrollments = [] and applications = [] when role === 'parent'.
const isParent = membership?.role === "parent";
const enrollments = isParent ? [] : await getEnrollmentsForStudentInMosque(profile.id, mosque.id);
const applications = isParent ? [] : await getStudentProgramApplicationsInMosque(profile.id, mosque.id);
```

- [ ] **Step 2: Commit**

```bash
git add app/m/[slug]/programs/page.tsx
git commit -m "feat: redesign programs catalog with search, tags, and new cards"
```

---

## Task 14: Login Page Redesign

**Files:**
- Modify: `app/m/[slug]/login/page.tsx` (full rewrite)
- Create: `components/auth/AuthLayout.tsx`

- [ ] **Step 1: Create shared AuthLayout component**

Create `components/auth/AuthLayout.tsx` — the split-screen layout used by both login and signup:

```typescript
interface AuthLayoutProps {
  mosque: { name: string; logo_url: string | null; secondary_color: string | null };
  leftContent: React.ReactNode;
  children: React.ReactNode;
}

export function AuthLayout({ mosque, leftContent, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — hidden on mobile */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10"
        style={{
          backgroundColor: mosque.secondary_color
            ? `${mosque.secondary_color}15`
            : "oklch(0.96 0.005 80)",
        }}
      >
        {leftContent}
      </div>
      {/* Right panel — form */}
      <div className="flex w-full items-center justify-center p-6 lg:w-[55%]">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite login page with split layout**

Rewrite `app/m/[slug]/login/page.tsx`:

- Fetch mosque data for branding
- Use `AuthLayout` with left panel showing mosque name, tagline, inspirational quote
- Right panel: "Welcome back" heading, email/password form, "Forgot Password?" link (non-functional), Sign In button styled with `primaryColor`, "Don't have an account? Create account" link
- Error display from query params

- [ ] **Step 3: Commit**

```bash
git add components/auth/AuthLayout.tsx app/m/[slug]/login/page.tsx
git commit -m "feat: redesign login page with split-screen mosque branding"
```

---

## Task 15: Signup Page Redesign

**Files:**
- Modify: `app/m/[slug]/signup/page.tsx` (full rewrite)
- Create: `components/auth/RoleSelector.tsx`

- [ ] **Step 1: Create RoleSelector client component**

Create `components/auth/RoleSelector.tsx`:

```typescript
"use client";

import { useState } from "react";
import { GraduationCap, Users } from "lucide-react";

interface RoleSelectorProps {
  primaryColor: string;
}

export function RoleSelector({ primaryColor }: RoleSelectorProps) {
  const [role, setRole] = useState<"student" | "parent">("student");

  return (
    <>
      <input type="hidden" name="role" value={role} />
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setRole("student")}
          className="flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors"
          style={{
            borderColor: role === "student" ? primaryColor : "var(--border)",
            backgroundColor:
              role === "student" ? `${primaryColor}08` : "transparent",
          }}
        >
          <GraduationCap
            className="h-6 w-6"
            style={{ color: role === "student" ? primaryColor : undefined }}
          />
          <span className="text-sm font-medium">STUDENT</span>
        </button>
        <button
          type="button"
          onClick={() => setRole("parent")}
          className="flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors"
          style={{
            borderColor: role === "parent" ? primaryColor : "var(--border)",
            backgroundColor:
              role === "parent" ? `${primaryColor}08` : "transparent",
          }}
        >
          <Users
            className="h-6 w-6"
            style={{ color: role === "parent" ? primaryColor : undefined }}
          />
          <span className="text-sm font-medium">PARENT</span>
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Rewrite signup page**

Rewrite `app/m/[slug]/signup/page.tsx`:

- Use `AuthLayout` with left panel: "BEGIN YOUR JOURNEY", headline, feature highlights
- Right panel: "Create Account" heading, `RoleSelector`, Full Name / Email / Password fields (simplified from 6 fields), "Create Account" button, terms text, "Already have an account? Login" link
- Hidden `slug` input
- Error display from query params

- [ ] **Step 3: Commit**

```bash
git add components/auth/RoleSelector.tsx app/m/[slug]/signup/page.tsx
git commit -m "feat: redesign signup with role selector and split layout"
```

---

## Task 16: Settings Page Redesign

**Files:**
- Modify: `app/m/[slug]/settings/page.tsx` (full rewrite)
- Create: `components/settings/ProfileCard.tsx`
- Create: `components/settings/PersonalInfoForm.tsx`
- Delete: `app/m/[slug]/settings/profile/page.tsx`
- Delete: `app/m/[slug]/settings/profile/EditProfileForm.tsx`

- [ ] **Step 1: Create ProfileCard server component**

Create `components/settings/ProfileCard.tsx`:

```typescript
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ProfileCardProps {
  profile: {
    full_name: string;
    avatar_url: string | null;
    created_at?: string;
  };
  roleLabel: string;
  primaryColor: string;
}

export function ProfileCard({ profile, roleLabel, primaryColor }: ProfileCardProps) {
  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const joinDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl p-6"
      style={{ backgroundColor: `${primaryColor}12` }}
    >
      <div className="h-20 w-20">
        <Avatar className="h-full w-full">
          <AvatarImage src={profile.avatar_url || undefined} />
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold">{profile.full_name}</p>
        <p className="text-sm text-muted-foreground">
          {roleLabel}
          {joinDate && ` · Joined ${joinDate}`}
        </p>
      </div>
      <Badge variant="outline" className="uppercase">
        {roleLabel}
      </Badge>
    </div>
  );
}
```

- [ ] **Step 2: Create PersonalInfoForm client component**

Create `components/settings/PersonalInfoForm.tsx`:

A client component with form fields for Full Name, Email (read-only), Phone Number, and a "Save Changes" submit button. Uses the existing `updateProfile` server action. Reuse avatar upload logic from the old `EditProfileForm` (crop + upload to Supabase storage).

- [ ] **Step 3: Rewrite settings page**

Rewrite `app/m/[slug]/settings/page.tsx`:

- Two-column layout on desktop: left (PersonalInfoForm + Admin Tools), right (ProfileCard)
- Single column on mobile (ProfileCard on top, form below)
- Admin Tools section (same links, restyled with cards)
- Logout button at bottom

- [ ] **Step 4: Delete the old /settings/profile route**

```bash
rm app/m/\[slug\]/settings/profile/page.tsx
rm app/m/\[slug\]/settings/profile/EditProfileForm.tsx
rmdir app/m/\[slug\]/settings/profile/
```

- [ ] **Step 5: Commit**

```bash
git add components/settings/ app/m/\[slug\]/settings/
git add -u  # stage deletions
git commit -m "feat: redesign settings page, remove separate profile route"
```

---

## Task 17: Admin Program Form — Tags Input

**Files:**
- Modify: `app/actions/programs.ts:161-169` — add tags handling to createProgram
- Modify: `app/actions/programs.ts:236-290` — add tags handling to updateProgram
- Modify: `app/m/[slug]/admin/programs/new/page.tsx` — add tags input field

- [ ] **Step 1: Update createProgram to save tags**

In `app/actions/programs.ts`, in the `createProgram` function, extract tags from formData:

```typescript
const tagsRaw = String(formData.get("tags") || "").trim();
const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];
```

Add `tags` to the program insert object.

- [ ] **Step 2: Update updateProgram to save tags**

Same pattern in `updateProgram` — extract tags and include in the update object.

- [ ] **Step 3: Add tags input to the admin create program form**

In `app/m/[slug]/admin/programs/new/page.tsx`, add a text input for tags:

```html
<Label htmlFor="tags">Tags (comma-separated)</Label>
<Input
  id="tags"
  name="tags"
  placeholder="Quran & Tajweed, Sisters Only, Youth"
/>
```

Do the same for the edit form if it has inline editing.

- [ ] **Step 4: Commit**

```bash
git add app/actions/programs.ts app/m/\[slug\]/admin/programs/
git commit -m "feat: add tags support to program create/edit forms"
```

---

## Task 18: BottomNav Parent Branch

**Files:**
- Modify: `components/BottomNav.tsx:28-64`
- Modify: `components/BottomNavClient.tsx`

- [ ] **Step 1: Add parent branch to BottomNav**

In `components/BottomNav.tsx`, add a parent role branch (before the student fallback):

```typescript
// Parent
if (role === "parent") {
  secondItem = { label: "Programs", href: `/${slug}/programs`, icon: "programs" };
  // No third item — parents only get Home, Programs, Settings
}
```

Adjust the items array to handle 3 items for parents (Home, Programs, Settings) instead of 4.

- [ ] **Step 2: Commit**

```bash
git add components/BottomNav.tsx components/BottomNavClient.tsx
git commit -m "feat: add parent role to bottom navigation"
```

---

## Task 19: Parent Dashboard

**Files:**
- Modify: `app/m/[slug]/dashboard/page.tsx`
- Create: `components/dashboard/ParentDashboard.tsx`
- Create: `components/dashboard/ChildCard.tsx`

- [ ] **Step 1: Create ChildCard component**

Create `components/dashboard/ChildCard.tsx`:

A card showing a child's name, computed age (from date_of_birth), gender, enrollment count, and latest application statuses. Includes an "Enroll [Child Name]" link to `/m/[slug]/programs?child=[childId]`.

```typescript
interface ChildCardProps {
  child: {
    id: string;
    full_name: string;
    date_of_birth: string | null;
    gender: string | null;
  };
  enrollments: Array<{ programs: { title: string } }>;
  applications: Array<{ status: string; programs: { title: string } }>;
  slug: string;
  primaryColor: string;
}
```

- [ ] **Step 2: Create ParentDashboard component**

Create `components/dashboard/ParentDashboard.tsx`:

Server component that:
1. Calls `getChildrenForParent()` to get linked children
2. For each child, calls `getChildEnrollments()` and `getChildApplications()`
3. If no children, shows a prompt to "Add your first child" with AddChildDialog
4. Otherwise renders a grid of `ChildCard` components
5. "Add Child" button at top right opens the AddChildDialog

- [ ] **Step 3: Add parent branch to dashboard page**

In `app/m/[slug]/dashboard/page.tsx`, add a condition for `role === "parent"`:

```typescript
if (role === "parent") {
  return <ParentDashboard profileId={profile.id} mosqueId={mosque.id} slug={slug} primaryColor={primaryColor} />;
}
```

Place this before the existing student dashboard code.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/ChildCard.tsx components/dashboard/ParentDashboard.tsx app/m/\[slug\]/dashboard/page.tsx
git commit -m "feat: add parent dashboard with child cards"
```

---

## Task 20: Add Child Dialog

**Files:**
- Create: `components/dashboard/AddChildDialog.tsx`

- [ ] **Step 1: Create AddChildDialog client component**

Create `components/dashboard/AddChildDialog.tsx`:

A client component using the `Dialog` component from shadcn:
- Trigger: "Add Child" button
- Form fields: Full Name (required), Date of Birth (date input), Gender (select: male/female)
- Hidden `slug` input
- Submit calls the `addChild` server action
- On success, close dialog and refresh (using `useRouter().refresh()`)
- On error, display error message

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addChild } from "@/app/actions/children";
import { Plus } from "lucide-react";
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/AddChildDialog.tsx
git commit -m "feat: create AddChildDialog for parent role"
```

---

## Task 21: Child Enrollment Selector

**Files:**
- Create: `components/programs/ChildSelector.tsx`
- Modify: `app/m/[slug]/programs/[programId]/page.tsx`

- [ ] **Step 1: Create ChildSelector client component**

Create `components/programs/ChildSelector.tsx`:

A client component that shows when a parent views a program detail page. Displays a dropdown/radio list of linked children. When a child is selected and "Enroll" or "Apply" is clicked, it calls `enrollChildInProgram` or `applyForChild` instead of the normal enrollment actions.

- [ ] **Step 2: Update program detail page**

In `app/m/[slug]/programs/[programId]/page.tsx`, add a condition for parent role:

- If user is a parent, show `ChildSelector` instead of the normal "Enroll Now" / "Apply" buttons
- Pass the list of children (from `getChildrenForParent()`) to the selector
- Each child shows their enrollment/application status for this specific program

- [ ] **Step 3: Commit**

```bash
git add components/programs/ChildSelector.tsx app/m/\[slug\]/programs/\[programId\]/page.tsx
git commit -m "feat: add child selector for parent enrollment on program detail"
```

---

## Task 22: Layout Parent Role Handling

**Files:**
- Modify: `app/m/[slug]/layout.tsx:60`

- [ ] **Step 1: Ensure layout handles parent role**

In `app/m/[slug]/layout.tsx`, the layout falls back to `role = "student"` when membership is null (around line 60). This is fine for the fallback, but verify that when a parent has a membership, the role `"parent"` flows correctly through to:
- `AppShell` (which passes role to `Sidebar` and `BottomNav`)
- The `--primary-color` CSS variable injection

No code change needed if the existing flow reads role from membership correctly — just verify.

- [ ] **Step 2: Commit (if changes needed)**

```bash
git add app/m/\[slug\]/layout.tsx
git commit -m "fix: ensure layout handles parent role correctly"
```

---

## Task 23: Parent User Story E2E Tests

**Files:**
- Modify: `e2e/helpers.ts` — add parent test constants and seed helper
- Modify: `e2e/global-setup.ts` — add parent user seeding
- Create: `e2e/parent-role.spec.ts`

Note: The project already has Playwright configured with a root `playwright.config.ts` that discovers tests in `e2e/`. Do NOT create a second config file. The existing `global-setup.ts` handles test data seeding.

- [ ] **Step 1: Add parent test user to helpers and global-setup**

In `e2e/helpers.ts`, add:
```typescript
export const TEST_PARENT = {
  email: "parent-e2e@test.tareeqah.dev",
  password: "TestPassword123!",
  full_name: "Test Parent",
};
```

In `e2e/global-setup.ts`, add seeding for the parent user:
- Create auth user via Supabase admin API
- Create profile row
- Create mosque_membership with `role: 'parent'`
- Create a child profile + parent_child_link
- Enroll the child in one program (for US-P3/US-P6 tests)
- Create a pending application for the child on another program

- [ ] **Step 2: Write parent user story tests**

Create `e2e/parent-role.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { TEST_PARENT } from "./helpers";

const SLUG = "test-mosque"; // Must exist in test database

// Covers: US-P1, US-P2, US-P3, US-P4, US-P5, US-P6
test.describe("Parent role", () => {

  // US-P1: As a parent, I can sign up selecting the "Parent" role
  test("US-P1: parent signup with role selection", async ({ page }) => {
    await page.goto(`/m/${SLUG}/signup`);
    await page.click('[data-testid="role-parent"]');
    await page.fill('[name="full_name"]', "New Test Parent");
    await page.fill('[name="email"]', `parent-${Date.now()}@test.com`);
    await page.fill('[name="password"]', "TestPassword123!");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(new RegExp(`/m/${SLUG}/dashboard`));
  });

  // US-P2: As a parent, I can add a child to my account
  test("US-P2: parent adds a child", async ({ page }) => {
    await page.goto(`/m/${SLUG}/login`);
    await page.fill('[name="email"]', TEST_PARENT.email);
    await page.fill('[name="password"]', TEST_PARENT.password);
    await page.click('button[type="submit"]');

    await page.click('[data-testid="add-child-button"]');
    await page.fill('[name="full_name"]', "New Child");
    await page.fill('[name="date_of_birth"]', "2018-05-15");
    // Use ARIA selectors for base-ui Select (not native <select>)
    await page.getByRole("combobox", { name: /gender/i }).click();
    await page.getByRole("option", { name: /male/i }).click();
    await page.click('[data-testid="submit-add-child"]');

    await expect(page.locator('[data-testid="child-card"]').last()).toContainText("New Child");
  });

  // US-P3: As a parent, I can view my children's enrollments on my dashboard
  test("US-P3: parent views children enrollments", async ({ page }) => {
    await page.goto(`/m/${SLUG}/login`);
    await page.fill('[name="email"]', TEST_PARENT.email);
    await page.fill('[name="password"]', TEST_PARENT.password);
    await page.click('button[type="submit"]');

    // Dashboard should show seeded child with enrollment info
    await expect(page.locator('[data-testid="child-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="enrollment-info"]')).toBeVisible();
  });

  // US-P4: As a parent, I can browse programs and enroll a child
  test("US-P4: parent enrolls child in program", async ({ page }) => {
    await page.goto(`/m/${SLUG}/login`);
    await page.fill('[name="email"]', TEST_PARENT.email);
    await page.fill('[name="password"]', TEST_PARENT.password);
    await page.click('button[type="submit"]');

    await page.click('a[href*="/programs"]');
    await page.click('[data-testid="program-card"]:first-child');
    await page.click('[data-testid="child-selector"]');
    await page.click('[data-testid="child-option"]:first-child');
    await page.click('[data-testid="enroll-child-button"]');
    await expect(page.locator("text=enrolled")).toBeVisible();
  });

  // US-P5: As a parent, I can apply to a program on behalf of my child
  test("US-P5: parent applies for child", async ({ page }) => {
    await page.goto(`/m/${SLUG}/login`);
    await page.fill('[name="email"]', TEST_PARENT.email);
    await page.fill('[name="password"]', TEST_PARENT.password);
    await page.click('button[type="submit"]');

    await page.click('a[href*="/programs"]');
    await page.click('[data-testid="program-card-requires-application"]');
    await page.click('[data-testid="child-selector"]');
    await page.click('[data-testid="child-option"]:first-child');
    await page.click('[data-testid="apply-child-button"]');
    await expect(page.locator("text=pending")).toBeVisible();
  });

  // US-P6: As a parent, I can view application status for my children
  test("US-P6: parent views application status", async ({ page }) => {
    await page.goto(`/m/${SLUG}/login`);
    await page.fill('[name="email"]', TEST_PARENT.email);
    await page.fill('[name="password"]', TEST_PARENT.password);
    await page.click('button[type="submit"]');

    await expect(page.locator('[data-testid="child-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="application-status"]')).toBeVisible();
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add e2e/parent-role.spec.ts e2e/helpers.ts e2e/global-setup.ts
git commit -m "test: add parent role e2e tests (US-P1 through US-P6)"
```

---

## Task Order & Dependencies

```
Task 1  (migration)          → independent, do first
Task 2  (types)              → after Task 1
Task 3  (signup action)      → after Task 2
Task 4  (profile action)     → after Task 2
Task 5  (nav.ts)             → after Task 2
Task 6  (enrollment guards)  → after Task 2
Task 7  (queries)            → after Task 2
Task 8  (parent actions)     → after Task 7
Task 9  (CSS palette)        → independent
Task 10 (sidebar branding)   → after Task 9
Task 11 (ProgramCard)        → after Task 9
Task 12 (TagFilter/Search)   → after Task 2 (needs tags type)
Task 13 (programs page)      → after Tasks 7, 11, 12
Task 14 (login page)         → after Task 9
Task 15 (signup page)        → after Tasks 3, 14
Task 16 (settings page)      → after Task 4
Task 17 (admin tags)         → after Task 2
Task 18 (bottom nav)         → after Task 5
Task 19 (parent dashboard)   → after Tasks 7, 8
Task 20 (add child dialog)   → after Task 8
Task 21 (child selector)     → after Task 8
Task 22 (layout check)       → after Task 5
Task 23 (Playwright tests)   → after all other tasks
```

**Parallelizable groups:**
- Group A (independent): Tasks 3, 4, 5, 6, 7 (all after Task 2)
- Group B (after Task 2): Tasks 9, 12, 17
- Group C (after backend done): Tasks 11, 14
- Group D (parent UI): Tasks 19, 20, 21 (after Task 8)
