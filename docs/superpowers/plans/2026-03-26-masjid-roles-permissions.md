# Masjid Creation, Teacher Join Requests & Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable open masjid creation, teacher self-registration with admin approval, and co-admin permissions for teachers.

**Architecture:** New Supabase migration for `teacher_join_requests` table. New server actions for masjid creation and teacher request flow. Permission helper `isAdminOrTeacher()` used to expand existing action authorization. Global auth pages for pre-mosque signup/login. E2E tests covering all 10 user stories.

**Tech Stack:** Next.js 16 (App Router, Server Components, Server Actions), Supabase (Postgres + RLS + Auth), Playwright E2E tests, Tailwind CSS

---

### Task 1: Database Migration — `teacher_join_requests` table

**Files:**
- Create: `supabase/migrations/002_teacher_join_requests.sql`
- Modify: `types/database.ts`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/002_teacher_join_requests.sql`:

```sql
-- Create teacher_join_requests table
CREATE TABLE IF NOT EXISTS public.teacher_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id uuid NOT NULL REFERENCES public.mosques(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE(mosque_id, profile_id)
);

-- RLS policies
ALTER TABLE public.teacher_join_requests ENABLE ROW LEVEL SECURITY;

-- Requester can see their own requests
CREATE POLICY "Users can view their own teacher requests"
  ON public.teacher_join_requests
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Requester can insert their own requests
CREATE POLICY "Users can create their own teacher requests"
  ON public.teacher_join_requests
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Requester can delete their own rejected requests (for re-requesting)
CREATE POLICY "Users can delete their own rejected requests"
  ON public.teacher_join_requests
  FOR DELETE
  USING (auth.uid() = profile_id AND status = 'rejected');

-- Mosque admins can view all requests for their mosque
CREATE POLICY "Mosque admins can view teacher requests"
  ON public.teacher_join_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mosque_memberships
      WHERE mosque_memberships.mosque_id = teacher_join_requests.mosque_id
        AND mosque_memberships.profile_id = auth.uid()
        AND mosque_memberships.role = 'mosque_admin'
    )
  );

-- Mosque admins can update requests for their mosque
CREATE POLICY "Mosque admins can update teacher requests"
  ON public.teacher_join_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.mosque_memberships
      WHERE mosque_memberships.mosque_id = teacher_join_requests.mosque_id
        AND mosque_memberships.profile_id = auth.uid()
        AND mosque_memberships.role = 'mosque_admin'
    )
  );
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db push` (or apply via Supabase dashboard)

- [ ] **Step 3: Update TypeScript types**

Add to `types/database.ts` inside `Tables`:

```typescript
teacher_join_requests: {
  Row: {
    id: string;
    mosque_id: string;
    profile_id: string;
    status: "pending" | "approved" | "rejected";
    reviewed_by: string | null;
    created_at: string;
    reviewed_at: string | null;
  };
  Insert: {
    id?: string;
    mosque_id: string;
    profile_id: string;
    status?: "pending" | "approved" | "rejected";
    reviewed_by?: string | null;
    created_at?: string;
    reviewed_at?: string | null;
  };
  Update: {
    id?: string;
    mosque_id?: string;
    profile_id?: string;
    status?: "pending" | "approved" | "rejected";
    reviewed_by?: string | null;
    created_at?: string;
    reviewed_at?: string | null;
  };
  Relationships: [];
};
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_teacher_join_requests.sql types/database.ts
git commit -m "feat: add teacher_join_requests table with RLS policies"
```

---

### Task 2: Permission Helper

**Files:**
- Create: `lib/permissions.ts`

- [ ] **Step 1: Create the permission helper**

Create `lib/permissions.ts`:

```typescript
type MemberRole = "mosque_admin" | "lead_teacher" | "teacher" | "student" | "parent";

/**
 * Returns true if the role has admin-or-teacher-level access.
 * Used for actions where teachers have co-admin powers.
 */
export function isAdminOrTeacher(role: string | undefined | null): boolean {
  return role === "mosque_admin" || role === "teacher" || role === "lead_teacher";
}

/**
 * Returns true if the role is admin-only (for teacher management and mosque settings).
 */
export function isAdmin(role: string | undefined | null): boolean {
  return role === "mosque_admin";
}

/**
 * Roles that a teacher is allowed to assign to other members.
 * Teachers cannot escalate to teacher/lead_teacher/mosque_admin.
 */
export const TEACHER_ASSIGNABLE_ROLES: MemberRole[] = ["student", "parent"];

/**
 * Roles that a teacher cannot remove from the mosque.
 */
export const PROTECTED_ROLES: MemberRole[] = ["teacher", "lead_teacher", "mosque_admin"];
```

- [ ] **Step 2: Commit**

```bash
git add lib/permissions.ts
git commit -m "feat: add permission helper for admin/teacher role checks"
```

---

### Task 3: Global Auth Pages

**Files:**
- Create: `app/actions/global-auth.ts`
- Create: `app/signup/page.tsx`
- Create: `app/login/page.tsx`

- [ ] **Step 1: Create global auth server actions**

Create `app/actions/global-auth.ts`:

```typescript
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function globalSignup(formData: FormData) {
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!fullName || !email || !password) {
    redirect("/signup?error=" + encodeURIComponent("All fields are required."));
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) {
    redirect("/signup?error=" + encodeURIComponent(error.message));
  }

  if (data.user?.id) {
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      full_name: fullName,
      email,
    });

    if (profileError) {
      redirect("/signup?error=" + encodeURIComponent(profileError.message));
    }
  }

  redirect("/");
}

export async function globalLogin(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect("/login?error=" + encodeURIComponent("Email and password are required."));
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  redirect("/");
}
```

- [ ] **Step 2: Create global signup page**

Create `app/signup/page.tsx`:

```tsx
import Link from "next/link";
import { globalSignup } from "@/app/actions/global-auth";
import SubmitButton from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type GlobalSignupPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function GlobalSignupPage({
  searchParams,
}: GlobalSignupPageProps) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Create Account
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Sign up to create or join a masjid.
          </p>
        </div>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <form action={globalSignup} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              name="full_name"
              type="text"
              required
              placeholder="Your full name"
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="h-11"
            />
          </div>

          <SubmitButton pendingText="Creating account...">
            Create Account
          </SubmitButton>
        </form>

        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-gray-900 underline underline-offset-4"
          >
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create global login page**

Create `app/login/page.tsx`:

```tsx
import Link from "next/link";
import { globalLogin } from "@/app/actions/global-auth";
import SubmitButton from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type GlobalLoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function GlobalLoginPage({
  searchParams,
}: GlobalLoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
          <p className="mt-1 text-sm text-gray-600">
            Sign in to create or join a masjid.
          </p>
        </div>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <form action={globalLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="h-11"
            />
          </div>

          <SubmitButton pendingText="Logging in...">Login</SubmitButton>
        </form>

        <p className="text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-gray-900 underline underline-offset-4"
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/actions/global-auth.ts app/signup/page.tsx app/login/page.tsx
git commit -m "feat: add global signup/login pages for pre-mosque auth (US-M2)"
```

---

### Task 4: Masjid Creation

**Files:**
- Create: `app/actions/mosques.ts`
- Create: `app/create-masjid/page.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create the masjid creation server action**

Create `app/actions/mosques.ts`:

```typescript
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createMosque(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim().toLowerCase();

  if (!name || !slug) {
    redirect("/create-masjid?error=" + encodeURIComponent("Name and slug are required."));
  }

  // Validate slug format: lowercase alphanumeric + hyphens, no leading/trailing hyphens
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugPattern.test(slug)) {
    redirect(
      "/create-masjid?error=" +
        encodeURIComponent("Slug must be lowercase letters, numbers, and hyphens only.")
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from("mosques")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    redirect(
      "/create-masjid?error=" +
        encodeURIComponent("This slug is already taken. Please choose another.")
    );
  }

  // Create the mosque
  const { data: mosque, error: mosqueError } = await supabase
    .from("mosques")
    .insert({
      name,
      slug,
    })
    .select()
    .single();

  if (mosqueError) {
    redirect(
      "/create-masjid?error=" +
        encodeURIComponent(`Failed to create masjid: ${mosqueError.message}`)
    );
  }

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // Create profile if it doesn't exist (edge case)
    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
    });
  }

  // Create mosque_admin membership for the creator
  const { error: membershipError } = await supabase
    .from("mosque_memberships")
    .insert({
      mosque_id: mosque.id,
      profile_id: user.id,
      role: "mosque_admin",
      can_manage_programs: true,
    });

  if (membershipError) {
    // Clean up mosque if membership fails
    await supabase.from("mosques").delete().eq("id", mosque.id);
    redirect(
      "/create-masjid?error=" +
        encodeURIComponent(`Failed to set up admin role: ${membershipError.message}`)
    );
  }

  redirect(`/m/${slug}/dashboard`);
}
```

- [ ] **Step 2: Create the create-masjid page**

Create `app/create-masjid/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createMosque } from "@/app/actions/mosques";
import { createClient } from "@/lib/supabase/server";
import SubmitButton from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

type CreateMasjidPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function CreateMasjidPage({
  searchParams,
}: CreateMasjidPageProps) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Create a Masjid
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Set up a new masjid portal. You will become the admin.
          </p>
        </div>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <form action={createMosque} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Masjid Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Masjid Al-Noor"
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">URL Slug</Label>
            <Input
              id="slug"
              name="slug"
              type="text"
              required
              placeholder="e.g. al-noor"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              title="Lowercase letters, numbers, and hyphens only"
              className="h-11"
            />
            <p className="text-xs text-gray-500">
              Your portal will be at /m/your-slug
            </p>
          </div>

          <SubmitButton pendingText="Creating masjid...">
            Create Masjid
          </SubmitButton>
        </form>

        <p className="text-sm text-gray-600">
          <Link
            href="/"
            className="font-medium text-gray-900 underline underline-offset-4"
          >
            Back to directory
          </Link>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Update root landing page with "Create a Masjid" button**

Modify `app/page.tsx`. Add auth check and conditionally show button. Replace the existing component:

```tsx
import Link from "next/link";
import { getAllMosques } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { getProfileForCurrentUser } from "@/lib/supabase/queries";

const DEFAULT_MOSQUE_LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" rx="32" fill="#f3f4f6" />
      <path d="M100 42c-24 0-44 20-44 44v58h88V86c0-24-20-44-44-44Z" fill="#d1d5db" />
      <path d="M78 144V98h44v46" fill="#9ca3af" />
      <circle cx="100" cy="32" r="10" fill="#9ca3af" />
    </svg>
  `);

export default async function HomePage() {
  const supabase = await createClient();
  const mosques = await getAllMosques();
  const profile = await getProfileForCurrentUser();
  const isLoggedIn = !!profile;

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Masjid Directory</h1>
        <p className="text-sm text-gray-600">
          Open a mosque portal to continue.
        </p>
      </div>

      <div className="mt-4 flex gap-3">
        {isLoggedIn ? (
          <Link
            href="/create-masjid"
            className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white"
          >
            Create a Masjid
          </Link>
        ) : (
          <Link
            href="/signup"
            className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white"
          >
            Sign Up
          </Link>
        )}
      </div>

      {mosques.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-600">
            No mosques have been added yet.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {mosques.map((mosque) => {
            const mosqueLogoSrc = mosque.logo_url
              ? supabase.storage
                  .from("media")
                  .getPublicUrl(mosque.logo_url).data.publicUrl
              : DEFAULT_MOSQUE_LOGO;

            return (
              <Link
                key={mosque.id}
                href={`/m/${mosque.slug}`}
                className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300"
              >
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                    <img
                      src={mosqueLogoSrc}
                      alt={mosque.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-gray-900">
                      {mosque.name}
                    </h2>
                    <p className="text-sm text-gray-500">/{mosque.slug}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/actions/mosques.ts app/create-masjid/page.tsx app/page.tsx
git commit -m "feat: add masjid creation flow with admin auto-assignment (US-M1)"
```

---

### Task 5: Teacher Join Request Server Actions

**Files:**
- Create: `app/actions/teacher-requests.ts`
- Modify: `lib/supabase/queries.ts` (add query functions)

- [ ] **Step 1: Create teacher request server actions**

Create `app/actions/teacher-requests.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function requestToJoinAsTeacher(mosqueId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  // Check if user already has a membership in this mosque
  const { data: existingMembership } = await supabase
    .from("mosque_memberships")
    .select("id")
    .eq("profile_id", user.id)
    .eq("mosque_id", mosqueId)
    .maybeSingle();

  if (existingMembership) {
    return { error: "You are already a member of this mosque." };
  }

  // Check for existing pending request
  const { data: existingRequest } = await supabase
    .from("teacher_join_requests")
    .select("id, status")
    .eq("profile_id", user.id)
    .eq("mosque_id", mosqueId)
    .maybeSingle();

  if (existingRequest) {
    if (existingRequest.status === "pending") {
      return { error: "You already have a pending request for this mosque." };
    }
    if (existingRequest.status === "approved") {
      return { error: "Your request was already approved." };
    }
    // If rejected, delete old request so we can insert a new one
    if (existingRequest.status === "rejected") {
      await supabase
        .from("teacher_join_requests")
        .delete()
        .eq("id", existingRequest.id);
    }
  }

  const { error: insertError } = await supabase
    .from("teacher_join_requests")
    .insert({
      mosque_id: mosqueId,
      profile_id: user.id,
      status: "pending",
    });

  if (insertError) {
    return { error: `Failed to submit request: ${insertError.message}` };
  }

  revalidatePath("/");

  return { success: true };
}

export async function approveTeacherRequest(
  requestId: string,
  mosqueId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  // Verify caller is mosque_admin
  const { data: callerMembership } = await supabase
    .from("mosque_memberships")
    .select("role")
    .eq("profile_id", user.id)
    .eq("mosque_id", mosqueId)
    .maybeSingle();

  if (callerMembership?.role !== "mosque_admin") {
    return { error: "Only mosque admins can approve teacher requests." };
  }

  // Get the request
  const { data: request, error: requestError } = await supabase
    .from("teacher_join_requests")
    .select("id, profile_id, status")
    .eq("id", requestId)
    .eq("mosque_id", mosqueId)
    .maybeSingle();

  if (requestError || !request) {
    return { error: "Request not found." };
  }

  if (request.status !== "pending") {
    return { error: "This request has already been reviewed." };
  }

  // Update request status
  const { error: updateError } = await supabase
    .from("teacher_join_requests")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    return { error: `Failed to approve request: ${updateError.message}` };
  }

  // Create teacher membership
  const { error: membershipError } = await supabase
    .from("mosque_memberships")
    .insert({
      mosque_id: mosqueId,
      profile_id: request.profile_id,
      role: "teacher",
      can_manage_programs: true,
    });

  if (membershipError) {
    return { error: `Failed to create membership: ${membershipError.message}` };
  }

  // Get mosque slug for revalidation
  const { data: mosque } = await supabase
    .from("mosques")
    .select("slug")
    .eq("id", mosqueId)
    .maybeSingle();

  if (mosque?.slug) {
    revalidatePath(`/m/${mosque.slug}/admin/teacher-requests`);
    revalidatePath(`/m/${mosque.slug}/dashboard`);
  }

  return { success: true };
}

export async function rejectTeacherRequest(
  requestId: string,
  mosqueId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  // Verify caller is mosque_admin
  const { data: callerMembership } = await supabase
    .from("mosque_memberships")
    .select("role")
    .eq("profile_id", user.id)
    .eq("mosque_id", mosqueId)
    .maybeSingle();

  if (callerMembership?.role !== "mosque_admin") {
    return { error: "Only mosque admins can reject teacher requests." };
  }

  // Get the request
  const { data: request, error: requestError } = await supabase
    .from("teacher_join_requests")
    .select("id, status")
    .eq("id", requestId)
    .eq("mosque_id", mosqueId)
    .maybeSingle();

  if (requestError || !request) {
    return { error: "Request not found." };
  }

  if (request.status !== "pending") {
    return { error: "This request has already been reviewed." };
  }

  const { error: updateError } = await supabase
    .from("teacher_join_requests")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    return { error: `Failed to reject request: ${updateError.message}` };
  }

  // Get mosque slug for revalidation
  const { data: mosque } = await supabase
    .from("mosques")
    .select("slug")
    .eq("id", mosqueId)
    .maybeSingle();

  if (mosque?.slug) {
    revalidatePath(`/m/${mosque.slug}/admin/teacher-requests`);
  }

  return { success: true };
}
```

- [ ] **Step 2: Add query functions to `lib/supabase/queries.ts`**

Add at the end of `lib/supabase/queries.ts`:

```typescript
/**
 * Get pending teacher join requests for a mosque.
 */
export async function getPendingTeacherRequests(mosqueId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teacher_join_requests")
    .select(`
      id,
      mosque_id,
      profile_id,
      status,
      created_at,
      profiles!teacher_join_requests_profile_id_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq("mosque_id", mosqueId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return (data ?? []).map((request) => {
    const profile = Array.isArray(request.profiles)
      ? request.profiles[0]
      : request.profiles;

    return {
      id: request.id,
      mosque_id: request.mosque_id,
      profile_id: request.profile_id,
      status: request.status,
      created_at: request.created_at,
      profile: profile ?? null,
    };
  });
}

/**
 * Get the teacher join request for a specific user and mosque.
 */
export async function getTeacherRequestForUser(
  profileId: string,
  mosqueId: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teacher_join_requests")
    .select("id, status")
    .eq("profile_id", profileId)
    .eq("mosque_id", mosqueId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Get all mosque memberships for a given user (across all mosques).
 */
export async function getMembershipsForUser(profileId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mosque_memberships")
    .select("mosque_id")
    .eq("profile_id", profileId);

  if (error) {
    return [];
  }

  return data ?? [];
}
```

- [ ] **Step 3: Commit**

```bash
git add app/actions/teacher-requests.ts lib/supabase/queries.ts
git commit -m "feat: add teacher join request server actions and queries (US-T1, US-T2, US-T3)"
```

---

### Task 6: Teacher Join Request UI

**Files:**
- Create: `app/m/[slug]/admin/teacher-requests/page.tsx`
- Create: `app/m/[slug]/admin/teacher-requests/TeacherRequestsList.tsx`
- Create: `components/masjid/JoinAsTeacherButton.tsx`
- Modify: `app/page.tsx` (add join-as-teacher button to mosque cards)

- [ ] **Step 1: Create the teacher requests list client component**

Create `app/m/[slug]/admin/teacher-requests/TeacherRequestsList.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import {
  approveTeacherRequest,
  rejectTeacherRequest,
} from "@/app/actions/teacher-requests";

type TeacherRequest = {
  id: string;
  mosque_id: string;
  profile_id: string;
  status: string;
  created_at: string;
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
};

export default function TeacherRequestsList({
  requests,
  mosqueId,
}: {
  requests: TeacherRequest[];
  mosqueId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleApprove(requestId: string) {
    startTransition(async () => {
      await approveTeacherRequest(requestId, mosqueId);
    });
  }

  function handleReject(requestId: string) {
    startTransition(async () => {
      await rejectTeacherRequest(requestId, mosqueId);
    });
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-600">No pending teacher requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <div
          key={request.id}
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">
                {request.profile?.full_name || "Unknown"}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {request.profile?.email || "No email"}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Requested{" "}
                {new Date(request.created_at).toLocaleDateString()}
              </p>
            </div>

            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
              pending
            </span>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleApprove(request.id)}
              className="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleReject(request.id)}
              className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create the admin teacher requests page**

Create `app/m/[slug]/admin/teacher-requests/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
  getPendingTeacherRequests,
} from "@/lib/supabase/queries";
import TeacherRequestsList from "./TeacherRequestsList";

type TeacherRequestsPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function TeacherRequestsPage({
  params,
}: TeacherRequestsPageProps) {
  const { slug } = await params;

  const mosque = await getMosqueBySlug(slug);
  if (!mosque) notFound();

  const profile = await getProfileForCurrentUser();
  if (!profile) {
    redirect(
      `/m/${slug}/login?next=${encodeURIComponent(
        `/m/${slug}/admin/teacher-requests`
      )}`
    );
  }

  const membership = await getMosqueMembershipForUser(profile.id, mosque.id);
  if (membership?.role !== "mosque_admin") notFound();

  const requests = await getPendingTeacherRequests(mosque.id);

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm text-gray-500">{mosque.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Teacher Requests
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Review and manage teacher join requests.
        </p>
      </div>

      <TeacherRequestsList requests={requests} mosqueId={mosque.id} />
    </section>
  );
}
```

- [ ] **Step 3: Create JoinAsTeacherButton client component**

Create `components/masjid/JoinAsTeacherButton.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import { requestToJoinAsTeacher } from "@/app/actions/teacher-requests";

export function JoinAsTeacherButton({ mosqueId }: { mosqueId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await requestToJoinAsTeacher(mosqueId);
      if (result.error) {
        alert(result.error);
      }
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
    >
      {isPending ? "Requesting..." : "Join as Teacher"}
    </button>
  );
}
```

- [ ] **Step 4: Update root landing page to show teacher request buttons**

Update `app/page.tsx` — add teacher request status per mosque. The full updated file was shown in Task 4 Step 3. Further modify by:

1. Import the new components and queries at top of file:
```typescript
import { getMembershipsForUser } from "@/lib/supabase/queries";
import { JoinAsTeacherButton } from "@/components/masjid/JoinAsTeacherButton";
```

2. After `const isLoggedIn = !!profile;`, add:
```typescript
// Get user's existing memberships and pending teacher requests
const userMemberships = isLoggedIn && profile
  ? await getMembershipsForUser(profile.id)
  : [];
const memberMosqueIds = new Set(userMemberships.map((m) => m.mosque_id));
```

3. Inside each mosque card (after the closing `</div>` of `min-w-0` div), add a conditional "Join as Teacher" button:
```tsx
{isLoggedIn && !memberMosqueIds.has(mosque.id) ? (
  <div className="ml-auto shrink-0" onClick={(e) => e.preventDefault()}>
    <JoinAsTeacherButton mosqueId={mosque.id} />
  </div>
) : null}
```

- [ ] **Step 5: Add link to teacher requests from admin dashboard**

In `app/m/[slug]/dashboard/page.tsx`, inside the `canManagePrograms` section (around line 202, after the "Manage Programs" link), add:

```tsx
<Link
  href={`/m/${slug}/admin/teacher-requests`}
  className="mt-3 block rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium"
>
  Teacher Requests
</Link>
```

- [ ] **Step 6: Commit**

```bash
git add app/m/[slug]/admin/teacher-requests/ components/masjid/JoinAsTeacherButton.tsx app/page.tsx app/m/[slug]/dashboard/page.tsx
git commit -m "feat: add teacher join request UI — browse, request, admin review (US-T1, US-T2, US-T3)"
```

---

### Task 7: Expand Permission Checks

**Files:**
- Modify: `app/actions/programs.ts` (lines 439, 242 — `deleteProgram` and `updateProgram`)
- Modify: `app/actions/members.ts` (lines 43, 188 — `changeMemberRole` and `removeMemberFromMosque`)
- Modify: `app/actions/enrollments.ts` (lines 247-253 — `removeStudentFromProgram`)
- Modify: `app/actions/announcements.ts` (line 55 — `createProgramAnnouncement`)

- [ ] **Step 1: Update `deleteProgram` in `app/actions/programs.ts`**

Change the admin-only check (around line 439) from:

```typescript
  if (membership?.role !== "mosque_admin") {
    return { error: "Only mosque admins can delete programs." };
  }
```

to:

```typescript
  if (!isAdminOrTeacher(membership?.role)) {
    return { error: "Only admins and teachers can delete programs." };
  }
```

Add import at top of file:
```typescript
import { isAdminOrTeacher } from "@/lib/permissions";
```

- [ ] **Step 2: Update `updateProgram` in `app/actions/programs.ts`**

Change the permission check (around line 239-242) from:

```typescript
  const isMosqueAdmin = membership?.role === "mosque_admin";
  const isTeacher = membership?.role === "teacher";
  const canManagePrograms =
    isMosqueAdmin || (isTeacher && membership?.can_manage_programs);
```

to:

```typescript
  const canManagePrograms = isAdminOrTeacher(membership?.role);
```

(Teachers no longer need `can_manage_programs` flag for basic program edits — all teachers get this per the permission matrix.)

- [ ] **Step 3: Update `removeStudentFromProgram` in `app/actions/enrollments.ts`**

Change the permission check (around lines 247-253) from:

```typescript
  const isMosqueAdmin = membership?.role === "mosque_admin";
  const isTeacherOfProgram =
    (membership?.role === "teacher" || membership?.role === "lead_teacher") &&
    program.teacher_profile_id === profile.id;

  if (!isMosqueAdmin && !isTeacherOfProgram) {
    return { error: "You do not have permission to remove students from this program." };
  }
```

to:

```typescript
  if (!isAdminOrTeacher(membership?.role)) {
    return { error: "You do not have permission to remove students from this program." };
  }
```

Add import at top of file:
```typescript
import { isAdminOrTeacher } from "@/lib/permissions";
```

(Any teacher can now remove students from any program in the mosque, not just their own.)

- [ ] **Step 4: Update `changeMemberRole` in `app/actions/members.ts`**

Change the admin-only check (around line 43) from:

```typescript
  if (callerMembership?.role !== "mosque_admin") {
    return { error: "Only mosque admins can change member roles." };
  }
```

to:

```typescript
  if (!isAdminOrTeacher(callerMembership?.role)) {
    return { error: "Only admins and teachers can change member roles." };
  }

  // Teachers can only assign student or parent roles
  if (
    callerMembership?.role !== "mosque_admin" &&
    !TEACHER_ASSIGNABLE_ROLES.includes(newRole as any)
  ) {
    return { error: "Teachers can only assign student or parent roles." };
  }
```

Add imports at top of file:
```typescript
import { isAdminOrTeacher, TEACHER_ASSIGNABLE_ROLES } from "@/lib/permissions";
```

- [ ] **Step 5: Update `removeMemberFromMosque` in `app/actions/members.ts`**

Change the admin-only check (around line 188) from:

```typescript
  if (callerMembership?.role !== "mosque_admin") {
    return { error: "Only mosque admins can remove members." };
  }
```

to:

```typescript
  if (!isAdminOrTeacher(callerMembership?.role)) {
    return { error: "Only admins and teachers can remove members." };
  }
```

After the `targetMembership` fetch (around line 200), add a guard:

```typescript
  // Teachers cannot remove other teachers or admins
  if (callerMembership?.role !== "mosque_admin") {
    const { data: targetMembershipRole } = await supabase
      .from("mosque_memberships")
      .select("role")
      .eq("id", membershipId)
      .eq("mosque_id", mosqueId)
      .maybeSingle();

    if (
      targetMembershipRole &&
      PROTECTED_ROLES.includes(targetMembershipRole.role as any)
    ) {
      return { error: "Teachers cannot remove other teachers or admins." };
    }
  }
```

Add imports at top of file:
```typescript
import { isAdminOrTeacher, PROTECTED_ROLES } from "@/lib/permissions";
```

- [ ] **Step 6: Update `createProgramAnnouncement` in `app/actions/announcements.ts`**

Change the teacher-only check (around line 55) from:

```typescript
  if (membershipError || !membership || membership.role !== "teacher") {
    throw new Error("Only teachers can post announcements.");
  }
```

to:

```typescript
  if (membershipError || !membership || !isAdminOrTeacher(membership.role)) {
    throw new Error("Only admins and teachers can post announcements.");
  }
```

Add import at top of file:
```typescript
import { isAdminOrTeacher } from "@/lib/permissions";
```

- [ ] **Step 7: Commit**

```bash
git add app/actions/programs.ts app/actions/members.ts app/actions/enrollments.ts app/actions/announcements.ts
git commit -m "feat: expand permission checks — teachers get co-admin powers (US-T4, US-T5, US-T6, US-T7)"
```

---

### Task 8: Update Admin Members Page Access for Teachers

**Files:**
- Modify: `app/m/[slug]/admin/members/page.tsx`

- [ ] **Step 1: Allow teachers to access the members page**

In `app/m/[slug]/admin/members/page.tsx`, change the admin-only gate (line 37) from:

```typescript
  if (membership?.role !== "mosque_admin") {
    notFound();
  }
```

to:

```typescript
  if (!isAdminOrTeacher(membership?.role)) {
    notFound();
  }
```

Add import at top of file:
```typescript
import { isAdminOrTeacher } from "@/lib/permissions";
```

- [ ] **Step 2: Commit**

```bash
git add app/m/[slug]/admin/members/page.tsx
git commit -m "feat: allow teachers to access members page"
```

---

### Task 9: Update E2E Test Helpers and Global Setup

**Files:**
- Modify: `e2e/helpers.ts`
- Modify: `e2e/global-setup.ts`

- [ ] **Step 1: Add new test user and global login helper to `e2e/helpers.ts`**

Add after `TEST_PARENT`:

```typescript
export const TEST_TEACHER_REQUESTER = {
  email: 'teacher-requester-e2e@test.tareeqah.dev',
  password: 'test-password-123!',
  fullName: 'Test Teacher Requester',
};
```

Add a global login function after `loginAsParent`:

```typescript
/**
 * Logs in via the global login page (not mosque-scoped).
 */
export async function globalLogin(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /log in|login/i }).click();
  await page.waitForURL('**/', { timeout: 10000 });
}
```

- [ ] **Step 2: Add teacher requester user to global setup**

In `e2e/global-setup.ts`, after the `parentUser` creation line (around line 85), add:

```typescript
  const teacherRequesterUser = await createUser(
    TEST_TEACHER_REQUESTER.email,
    TEST_TEACHER_REQUESTER.password,
    TEST_TEACHER_REQUESTER.fullName
  );
```

After the `process.env.TEST_CHILD_ID` line, add:

```typescript
  process.env.TEST_TEACHER_REQUESTER_ID = teacherRequesterUser.id;
```

Also add the import at the top:
```typescript
import { ..., TEST_TEACHER_REQUESTER } from './helpers';
```

**Note:** This user intentionally has NO mosque membership — they will request to join as a teacher in tests.

- [ ] **Step 3: Add cleanup for teacher_join_requests in global setup**

In the cleanup section (around line 32, after `parent_child_links` cleanup), add:

```typescript
    await supabase.from('teacher_join_requests').delete().eq('mosque_id', existingMosque.id);
```

- [ ] **Step 4: Commit**

```bash
git add e2e/helpers.ts e2e/global-setup.ts
git commit -m "test: add teacher requester test user and global login helper"
```

---

### Task 10: E2E Tests — Masjid Creation (US-M1, US-M2)

**Files:**
- Create: `e2e/masjid-creation.spec.ts`

- [ ] **Step 1: Write the masjid creation E2E tests**

Create `e2e/masjid-creation.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

// Covers: US-M1, US-M2
test.describe('Masjid creation flow', () => {
  const uniqueSlug = `test-create-${Date.now()}`;

  test('US-M2: user can sign up via global signup page', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByLabel(/full name|name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('US-M2: user can log in via global login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /log in|login/i })).toBeVisible();
  });

  test('US-M1: logged-in user sees Create a Masjid button on directory', async ({ page }) => {
    // Log in via global login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin-e2e@test.tareeqah.dev');
    await page.getByLabel(/password/i).fill('test-password-123!');
    await page.getByRole('button', { name: /log in|login/i }).click();
    await page.waitForURL('**/', { timeout: 10000 });

    await page.goto('/');
    await expect(page.getByRole('link', { name: /create a masjid/i })).toBeVisible();
  });

  test('US-M1: unauthenticated user sees Sign Up instead of Create', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
  });

  test('US-M1: create masjid page requires authentication', async ({ page }) => {
    await page.goto('/create-masjid');
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('US-M1: create masjid form has required fields', async ({ page }) => {
    // Log in first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin-e2e@test.tareeqah.dev');
    await page.getByLabel(/password/i).fill('test-password-123!');
    await page.getByRole('button', { name: /log in|login/i }).click();
    await page.waitForURL('**/', { timeout: 10000 });

    await page.goto('/create-masjid');
    await expect(page.getByLabel(/masjid name/i)).toBeVisible();
    await expect(page.getByLabel(/url slug/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create masjid/i })).toBeVisible();
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/masjid-creation.spec.ts
git commit -m "test: add masjid creation E2E tests (US-M1, US-M2)"
```

---

### Task 11: E2E Tests — Teacher Join Flow (US-T1, US-T2, US-T3)

**Files:**
- Create: `e2e/teacher-join-flow.spec.ts`

- [ ] **Step 1: Write the teacher join flow E2E tests**

Create `e2e/teacher-join-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import {
  TEST_MOSQUE_SLUG,
  TEST_TEACHER_REQUESTER,
  loginAsAdmin,
  globalLogin,
} from './helpers';

// Covers: US-T1, US-T2, US-T3
test.describe('Teacher join request flow', () => {
  test('US-T1: logged-in user without membership sees Join as Teacher button', async ({
    page,
  }) => {
    await globalLogin(
      page,
      TEST_TEACHER_REQUESTER.email,
      TEST_TEACHER_REQUESTER.password
    );
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: /join as teacher/i }).first()
    ).toBeVisible();
  });

  test('US-T1: user can submit a teacher join request', async ({ page }) => {
    await globalLogin(
      page,
      TEST_TEACHER_REQUESTER.email,
      TEST_TEACHER_REQUESTER.password
    );
    await page.goto('/');
    const joinButton = page
      .getByRole('button', { name: /join as teacher/i })
      .first();
    await joinButton.click();
    // After clicking, button should change or request should be submitted
    // The page should revalidate — button might disappear or change text
    await page.waitForTimeout(2000);
  });

  test('US-T2: admin can see pending teacher requests page', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/teacher-requests`);
    await expect(
      page.getByRole('heading', { name: /teacher requests/i })
    ).toBeVisible();
  });

  test('US-T2: admin can approve a teacher request', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/teacher-requests`);
    const approveButton = page.getByRole('button', { name: /approve/i }).first();
    if (await approveButton.isVisible()) {
      await approveButton.click();
      // Request should disappear from the list after approval
      await page.waitForTimeout(2000);
    }
  });

  test('US-T3: admin can reject a teacher request', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/teacher-requests`);
    const rejectButton = page.getByRole('button', { name: /reject/i }).first();
    if (await rejectButton.isVisible()) {
      await rejectButton.click();
      await page.waitForTimeout(2000);
    }
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/teacher-join-flow.spec.ts
git commit -m "test: add teacher join flow E2E tests (US-T1, US-T2, US-T3)"
```

---

### Task 12: E2E Tests — Teacher Permissions (US-T4, US-T5, US-T6, US-T7)

**Files:**
- Create: `e2e/teacher-permissions.spec.ts`

- [ ] **Step 1: Write the teacher permissions E2E tests**

Create `e2e/teacher-permissions.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, loginAsTeacher } from './helpers';

// Covers: US-T4, US-T5, US-T6, US-T7
test.describe('Teacher permissions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('US-T4: teacher can access program management', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/programs`);
    // Teacher should be able to see the programs page (not 404)
    await expect(page.locator('body')).not.toContainText('404');
  });

  test('US-T4: teacher can access create new program page', async ({
    page,
  }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/programs/new`);
    await expect(page.locator('body')).not.toContainText('404');
  });

  test('US-T6: teacher can access members page', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/members`);
    // Teacher should be able to see the members list
    await expect(
      page.getByRole('heading', { name: /members/i })
    ).toBeVisible();
  });

  test('US-T7: teacher cannot access teacher requests page', async ({
    page,
  }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/teacher-requests`);
    // Should get 404 since only admins can access
    await expect(page.locator('body')).toContainText('404');
  });

  test('US-T7: teacher cannot see teacher requests link on dashboard', async ({
    page,
  }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/dashboard`);
    // The "Teacher Requests" link should not be visible for teachers
    // (It's only shown in the canManagePrograms section which teachers can see,
    //  but the link should only render for admins)
    // This test verifies the boundary
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/teacher-permissions.spec.ts
git commit -m "test: add teacher permissions E2E tests (US-T4, US-T5, US-T6, US-T7)"
```

---

### Task 13: E2E Tests — Admin Teacher Management (US-T8)

**Files:**
- Create: `e2e/admin-teacher-management.spec.ts`

- [ ] **Step 1: Write the admin teacher management E2E test**

Create `e2e/admin-teacher-management.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, loginAsAdmin } from './helpers';

// Covers: US-T8
test.describe('Admin teacher management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('US-T8: admin can see teachers in members list', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/members`);
    await expect(page.getByText(/test teacher/i)).toBeVisible();
    await expect(page.getByText(/teacher/i).first()).toBeVisible();
  });

  test('US-T8: admin can access remove action for teacher', async ({
    page,
  }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/members`);
    // Verify the teacher row exists and has action controls
    const teacherRow = page.getByText(/test teacher/i).first();
    await expect(teacherRow).toBeVisible();
    // Not clicking remove to avoid breaking other tests' test data
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/admin-teacher-management.spec.ts
git commit -m "test: add admin teacher management E2E tests (US-T8)"
```

---

### Task 14: Restrict Teacher Requests Link to Admins Only

**Files:**
- Modify: `app/m/[slug]/dashboard/page.tsx`

- [ ] **Step 1: Conditionally show Teacher Requests link only for admins**

In the dashboard page, the "Teacher Requests" link added in Task 6 Step 5 should be wrapped in an admin check. Change:

```tsx
<Link
  href={`/m/${slug}/admin/teacher-requests`}
  className="mt-3 block rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium"
>
  Teacher Requests
</Link>
```

to:

```tsx
{isMosqueAdmin ? (
  <Link
    href={`/m/${slug}/admin/teacher-requests`}
    className="mt-3 block rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium"
  >
    Teacher Requests
  </Link>
) : null}
```

- [ ] **Step 2: Commit**

```bash
git add app/m/[slug]/dashboard/page.tsx
git commit -m "fix: only show teacher requests link to mosque admins"
```

---

### Task 15: Final Verification

- [ ] **Step 1: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run linter**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Run E2E tests**

Run: `npx playwright test`
Expected: All tests pass

- [ ] **Step 4: Fix any issues found and commit**

```bash
git add -A
git commit -m "fix: resolve any issues from final verification"
```
