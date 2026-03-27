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
