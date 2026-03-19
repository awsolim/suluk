---
name: new-action
description: Create a new server action file in app/actions/ with Supabase client setup, auth checks, and error handling following project conventions
---

# New Server Action

Create a new server action in `app/actions/` following this project's conventions.

## Rules

1. **Always start with `"use server"`** at the top of the file
2. **Accept `FormData`** as the parameter — extract fields with `formData.get()`
3. **Trim and validate** all form inputs, redirect on missing required fields
4. **Auth check** — always call `supabase.auth.getUser()` and redirect to login if not authenticated
5. **Tenant-scoped** — load the mosque by slug and verify membership before mutating data
6. **Error handling** — throw descriptive errors on failures, never silently fail
7. **Redirect after mutation** — use `redirect()` from `next/navigation` after success
8. **Revalidate affected paths** — call `revalidatePath()` for any pages that display the mutated data

## Template

```ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function actionName(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  // Extract other fields...

  if (!slug) {
    redirect("/");
  }

  const supabase = await createClient();

  // 1. Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/...`)}`);
  }

  // 2. Load profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Could not load profile.");
  }

  // 3. Load mosque and verify membership
  const { data: mosque, error: mosqueError } = await supabase
    .from("mosques")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (mosqueError || !mosque) {
    throw new Error("Could not load mosque.");
  }

  // 4. Perform the mutation
  // ...

  // 5. Revalidate affected paths
  revalidatePath(`/m/${slug}/...`);

  // 6. Redirect
  redirect(`/m/${slug}/...`);
}
```

## Checklist

- [ ] `"use server"` directive at top
- [ ] FormData parameter with trimmed string extraction
- [ ] Auth check with login redirect
- [ ] Profile loaded from `profiles` table
- [ ] Mosque loaded by slug, membership verified
- [ ] Role check if action is role-restricted
- [ ] Descriptive error messages on failure
- [ ] `revalidatePath()` for all affected routes
- [ ] `redirect()` after success
