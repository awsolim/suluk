"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phoneNumber = String(formData.get("phone_number") || "").trim();
  const age = Number(formData.get("age") || 0);
  const gender = String(formData.get("gender") || "").trim();
  const password = String(formData.get("password") || "");
  const slug = String(formData.get("slug") || "").trim();

  if (!fullName || !email || !phoneNumber || !password || !slug || !age || !gender) {
    redirect("/");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone_number: phoneNumber,
        age,
        gender,
      },
    },
  });

  if (error) {
    redirect(`/m/${slug}/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user?.id) {
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      full_name: fullName,
      email,
      phone_number: phoneNumber,
      age,
      gender,
    });

    if (profileError) {
      redirect(`/m/${slug}/signup?error=${encodeURIComponent(profileError.message)}`);
    }
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