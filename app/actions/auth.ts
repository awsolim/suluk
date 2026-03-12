"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const fullName = String(formData.get("full_name") || "").trim(); // Read the user's full name from the form.
  const email = String(formData.get("email") || "").trim(); // Read the email from the form.
  const password = String(formData.get("password") || ""); // Read the password from the form.
  const slug = String(formData.get("slug") || "").trim(); // Read the tenant slug from the form.

  if (!fullName || !email || !password || !slug) {
    redirect("/"); // Reject incomplete signup submissions.
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName, // Store the full name in auth metadata for the profile trigger.
      },
    },
  });

  if (error) {
    redirect(`/m/${slug}/signup?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/m/${slug}/dashboard`);
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim(); // Read the email from the form.
  const password = String(formData.get("password") || ""); // Read the password from the form.
  const slug = String(formData.get("slug") || "").trim(); // Read the tenant slug from the form.

  if (!email || !password || !slug) {
    redirect("/"); // Reject incomplete login submissions.
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/m/${slug}/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/m/${slug}/dashboard`);
}

export async function logout(formData: FormData) {
  const slug = String(formData.get("slug") || "").trim(); // Read the tenant slug so logout can return to the correct portal.
  const supabase = await createClient();

  await supabase.auth.signOut();

  if (!slug) {
    redirect("/");
  }

  redirect(`/m/${slug}/`);
}