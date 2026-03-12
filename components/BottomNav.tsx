import Link from "next/link";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
} from "@/lib/supabase/queries";

type Props = {
  slug: string;
};

export default async function BottomNav({ slug }: Props) {
  const mosque = await getMosqueBySlug(slug); // Load the current mosque so nav decisions stay tenant-scoped.

  if (!mosque) {
    return null; // Safely render nothing if the mosque slug is invalid.
  }

  const profile = await getProfileForCurrentUser(); // Load the signed-in profile so we can show the correct nav for this user.

  if (!profile) {
    return null; // Logged-out users should not see the bottom nav.
  }

  const membership = await getMosqueMembershipForUser(profile.id, mosque.id); // Load the user's role for this specific mosque.

  const isMosqueAdmin = membership?.role === "mosque_admin"; // Admin nav takes highest priority.
  const isTeacher = membership?.role === "teacher"; // Teacher nav is used when the user is not an admin.

  const secondLink = isMosqueAdmin
    ? {
        href: `/m/${slug}/admin/programs`, // Admins should jump directly into managing all mosque programs.
        icon: "🗂️",
        label: "All Programs",
      }
    : isTeacher
    ? {
        href: `/m/${slug}/classes`, // Teachers use Classes as their teaching list page.
        icon: "🎓",
        label: "My Classes",
      }
    : {
        href: `/m/${slug}/classes`, // Students use Classes for their enrolled classes.
        icon: "🎓",
        label: "Classes",
      };

  const thirdLink = isMosqueAdmin
    ? {
        href: `/m/${slug}/admin/programs/new`, // Admins should be able to create a new program directly from the nav.
        icon: "➕",
        label: "New Program",
      }
    : isTeacher
    ? {
        href: `/m/${slug}/students`, // Teachers should see a cross-class student list for their assigned programs.
        icon: "🧑‍🎓",
        label: "Students",
      }
    : {
        href: `/m/${slug}/programs`, // Students browse the public program catalog.
        icon: "📚",
        label: "Programs",
      };

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-white">
      <div className="mx-auto flex max-w-md justify-between px-6 py-3 text-sm">
        <Link href={`/m/${slug}/dashboard`} className="flex flex-col items-center">
          <span>🏠</span>
          <span>Home</span>
        </Link>

        <Link href={secondLink.href} className="flex flex-col items-center">
          <span>{secondLink.icon}</span>
          <span>{secondLink.label}</span>
        </Link>

        <Link href={thirdLink.href} className="flex flex-col items-center">
          <span>{thirdLink.icon}</span>
          <span>{thirdLink.label}</span>
        </Link>

        <Link href={`/m/${slug}/settings`} className="flex flex-col items-center">
          <span>⚙️</span>
          <span>Settings</span>
        </Link>
      </div>
    </nav>
  );
}