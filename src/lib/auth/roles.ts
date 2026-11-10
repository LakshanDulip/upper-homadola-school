export const schoolRoles = ["student", "teacher", "admin", "principal", "superadmin", "developer"] as const;
export type SchoolRole = (typeof schoolRoles)[number];
export const roleHome: Record<SchoolRole, string> = {
  student: "/student/", teacher: "/teacher/", admin: "/admin/",
  principal: "/principal/", superadmin: "/superadmin/", developer: "/developer/",
};
export const roleLabel: Record<SchoolRole, string> = {
  student: "Student", teacher: "Teacher", admin: "Admin",
  principal: "Principal", superadmin: "Super Admin", developer: "Developer",
};
export function isSchoolRole(role: unknown): role is SchoolRole {
  return typeof role === "string" && (schoolRoles as readonly string[]).includes(role);
}
/** Deterministic sign-in alias; NEVER authoritative for role assignment. */
export function usernameToAuthEmail(input: string): string | null {
  const username = input.trim().toLowerCase();
  if (!/^[a-z0-9_-]{1,40}$/.test(username)) return null;
  return `u-${username}@accounts.upperhomadola.school`;
}
export function resolveLoginEmail(input: string): string | null {
  const value = input.trim().toLowerCase();
  if (value.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
  return usernameToAuthEmail(value);
}
