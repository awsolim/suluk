type MemberRole = "mosque_admin" | "lead_teacher" | "teacher" | "student" | "parent";

/**
 * Returns true if the role has admin-or-teacher-level access.
 * Used for actions where teachers have co-admin powers.
 */
export function isAdminOrTeacher(role: string | undefined | null): boolean {
  return role === "mosque_admin" || role === "teacher" || role === "lead_teacher";
}

/**
 * Returns true if the role is admin-only (for teacher management and mosque settings).
 */
export function isAdmin(role: string | undefined | null): boolean {
  return role === "mosque_admin";
}

/**
 * Roles that a teacher is allowed to assign to other members.
 * Teachers cannot escalate to teacher/lead_teacher/mosque_admin.
 */
export const TEACHER_ASSIGNABLE_ROLES: MemberRole[] = ["student", "parent"];

/**
 * Roles that a teacher cannot remove from the mosque.
 */
export const PROTECTED_ROLES: MemberRole[] = ["teacher", "lead_teacher", "mosque_admin"];
