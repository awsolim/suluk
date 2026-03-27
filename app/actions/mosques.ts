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
