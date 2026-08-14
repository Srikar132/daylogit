export type OrgRole = "owner" | "admin" | "member";

/** Invite-time access level. Only "view" is wired up today — "edit"/"full" render
 *  disabled in the picker until per-role write permissions are built. */
export type AccessLevel = "view" | "edit" | "full";

export const ACCESS_LEVELS: { value: AccessLevel; label: string; enabled: boolean }[] = [
  { value: "view", label: "View only", enabled: true },
  { value: "edit", label: "Can edit", enabled: false },
  { value: "full", label: "Full access", enabled: false },
];

export function mapAccessLevelToOrgRole(level: string): OrgRole {
  if (level !== "view") {
    throw new Error(`Access level "${level}" isn't available yet — only "view" invites are supported.`);
  }
  return "member";
}

export function canManageWorkspace(role: OrgRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function canWriteEntries(role: OrgRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

/** better-auth's org plugin only grants "organization:delete" to the owner
 *  role by default (admins can update, not delete) — this mirrors that. */
export function canDeleteWorkspace(role: OrgRole | null | undefined): boolean {
  return role === "owner";
}
