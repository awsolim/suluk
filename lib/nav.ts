export type NavIconType =
  | "home"
  | "classes"
  | "programs"
  | "students"
  | "new-program"
  | "settings"
  | "members";

export type NavItem = {
  href: string;
  icon: NavIconType;
  label: string;
};

export function getNavItems(
  role: string,
  slug: string,
  canManagePrograms: boolean
): NavItem[] {
  const isMosqueAdmin = role === "mosque_admin";
  const isTeacher = role === "teacher" || role === "lead_teacher";

  if (isMosqueAdmin) {
    return [
      { href: `/m/${slug}/dashboard`, icon: "home", label: "Home" },
      { href: `/m/${slug}/admin/programs`, icon: "programs", label: "Programs" },
      { href: `/m/${slug}/admin/programs/new`, icon: "new-program", label: "New Program" },
      { href: `/m/${slug}/admin/members`, icon: "members", label: "Members" },
      { href: `/m/${slug}/admin/teacher-requests`, icon: "members", label: "Teacher Requests" },
      { href: `/m/${slug}/settings`, icon: "settings", label: "Settings" },
    ];
  }

  if (isTeacher) {
    const items: NavItem[] = [
      { href: `/m/${slug}/dashboard`, icon: "home", label: "Home" },
      { href: `/m/${slug}/classes`, icon: "classes", label: "Classes" },
      { href: `/m/${slug}/students`, icon: "students", label: "Students" },
    ];
    if (canManagePrograms) {
      items.push({
        href: `/m/${slug}/admin/programs/new`,
        icon: "new-program",
        label: "New Program",
      });
    }
    items.push({ href: `/m/${slug}/settings`, icon: "settings", label: "Settings" });
    return items;
  }

  // Parent
  if (role === "parent") {
    return [
      { label: "Home", href: `/m/${slug}/dashboard`, icon: "home" },
      { label: "Programs", href: `/m/${slug}/programs`, icon: "programs" },
      { label: "Settings", href: `/m/${slug}/settings`, icon: "settings" },
    ];
  }

  // Student
  return [
    { href: `/m/${slug}/dashboard`, icon: "home", label: "Home" },
    { href: `/m/${slug}/classes`, icon: "classes", label: "Classes" },
    { href: `/m/${slug}/programs`, icon: "programs", label: "Programs" },
    { href: `/m/${slug}/settings`, icon: "settings", label: "Settings" },
  ];
}

export function getRoleLabel(role: string): string {
  if (role === "mosque_admin") return "Admin";
  if (role === "lead_teacher") return "Lead Teacher";
  if (role === "teacher") return "Teacher";
  if (role === "parent") return "Parent";
  return "Student";
}
