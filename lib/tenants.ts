import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getMosqueBySlug(slug: string) {
  const supabase = await createClient(); // Create the server Supabase client for this request.

  const { data: mosque, error } = await supabase
    .from("mosques")
    .select("id, name, slug, logo_url")
    .eq("slug", slug)
    .maybeSingle(); // Try to load the mosque that matches the URL slug.

  if (error || !mosque) {
    notFound(); // Show a 404 page if the mosque does not exist.
  }

  return mosque;
}