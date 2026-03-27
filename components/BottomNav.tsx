import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
} from "@/lib/supabase/queries";
import BottomNavClient from "@/components/BottomNavClient";

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
  const isParent = membership?.role === "parent"; // Parent nav shows programs but not classes.

  const homeLink = {
    href: `/m/${slug}/dashboard`,
    icon: "home" as const,
    label: "Home",
  };

  const settingsLink = {
    href: `/m/${slug}/settings`,
    icon: "settings" as const,
    label: "Settings",
  };

  // Parents get a 3-item nav: Home, Programs, Settings.
  if (isParent) {
    const items = [
      homeLink,
      {
        href: `/m/${slug}/programs`, // Parents browse the public program catalog to find classes for their children.
        icon: "programs" as const,
        label: "Programs",
      },
      settingsLink,
    ];

    return <BottomNavClient items={items} />;
  }

  const secondLink = isMosqueAdmin
    ? {
        href: `/m/${slug}/admin/programs`, // Admins should jump directly into managing all mosque programs.
        icon: "programs" as const,
        label: "Programs",
      }
    : isTeacher
    ? {
        href: `/m/${slug}/classes`, // Teachers use Classes as their teaching list page.
        icon: "classes" as const,
        label: "Classes",
      }
    : {
        href: `/m/${slug}/classes`, // Students use Classes for their enrolled classes.
        icon: "classes" as const,
        label: "Classes",
      };

  const thirdLink = isMosqueAdmin
    ? {
        href: `/m/${slug}/admin/programs/new`, // Admins should be able to create a new program directly from the nav.
        icon: "new-program" as const,
        label: "New",
      }
    : isTeacher
    ? {
        href: `/m/${slug}/students`, // Teachers should see a cross-class student list for their assigned programs.
        icon: "students" as const,
        label: "Students",
      }
    : {
        href: `/m/${slug}/programs`, // Students browse the public program catalog.
        icon: "programs" as const,
        label: "Programs",
      };

  const items = [
    homeLink,
    secondLink,
    thirdLink,
    settingsLink,
  ];

  return <BottomNavClient items={items} />;
}