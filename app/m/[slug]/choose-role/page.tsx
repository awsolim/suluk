import { redirect, notFound } from "next/navigation";
import { getMosqueBySlug, getMosqueMembershipForUser } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { ChooseRoleForm } from "./ChooseRoleForm";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ChooseRolePage({ params }: PageProps) {
  const { slug } = await params;
  const mosque = await getMosqueBySlug(slug);
  if (!mosque) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/m/${slug}/login`);
  }

  // If user already has a membership, skip to dashboard
  const membership = await getMosqueMembershipForUser(user.id, mosque.id);
  if (membership) {
    redirect(`/m/${slug}/dashboard`);
  }

  const primaryColor = mosque.primary_color ?? "#111827";

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to {mosque.name}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            How would you like to join?
          </p>
        </div>

        <ChooseRoleForm
          slug={slug}
          mosqueId={mosque.id}
          primaryColor={primaryColor}
        />
      </div>
    </main>
  );
}
