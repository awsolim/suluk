"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const avatar = formData.get("avatar");

  if (!slug) {
    return { error: "Missing mosque slug." };
  }

  if (fullName.length < 2) {
    return { error: "Name must be at least 2 characters." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be logged in to update your profile." };
  }

  const { data: currentProfile, error: currentProfileError } = await supabase
    .from("profiles")
    .select("id, avatar_url")
    .eq("id", user.id)
    .single();

  if (currentProfileError || !currentProfile) {
    return { error: "Profile could not be loaded." };
  }

  let nextAvatarPath: string | undefined;

  if (avatar instanceof File && avatar.size > 0) {
    if (!avatar.type.startsWith("image/")) {
      return { error: "Avatar must be an image file." };
    }

    const extension = avatar.type === "image/png" ? "png" : "jpg";
    const avatarPath = `avatars/${user.id}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(avatarPath, avatar, {
        contentType: avatar.type,
        upsert: false,
      });

    if (uploadError) {
      return { error: uploadError.message };
    }

    nextAvatarPath = avatarPath;

    if (
      currentProfile.avatar_url &&
      currentProfile.avatar_url.startsWith(`avatars/${user.id}/`)
    ) {
      await supabase.storage.from("media").remove([currentProfile.avatar_url]);
    }
  }

  const updates: {
    full_name: string;
    avatar_url?: string;
  } = {
    full_name: fullName,
  };

  if (nextAvatarPath) {
    updates.avatar_url = nextAvatarPath;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath(`/m/${slug}/settings`);
  revalidatePath(`/m/${slug}/settings/profile`);
  revalidatePath(`/m/${slug}/programs`);
  revalidatePath(`/m/${slug}/classes`);
  revalidatePath(`/m/${slug}/students`);

  return { success: true };
}