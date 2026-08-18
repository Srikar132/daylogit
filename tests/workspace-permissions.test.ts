import { describe, expect, it } from "vitest";
import {
  canDeleteWorkspace,
  canManageWorkspace,
  canWriteEntries,
  canWriteWidgets,
  mapAccessLevelToOrgRole,
  ACCESS_LEVELS,
  type OrgRole,
} from "@/lib/permissions";

const ROLES: OrgRole[] = ["owner", "admin", "member"];

describe("canWriteWidgets", () => {
  // Widget rows are scoped to the workspace, not to whoever created them, so
  // this predicate IS the write check for the canvas — there is no userId
  // filter behind it any more. A member seeing the shared desk must not be able
  // to move, resize, edit or delete anything on it.
  it("lets owners and admins write", () => {
    expect(canWriteWidgets("owner")).toBe(true);
    expect(canWriteWidgets("admin")).toBe(true);
  });

  it("keeps an invited member read-only", () => {
    expect(canWriteWidgets("member")).toBe(false);
  });

  it("denies an unknown or missing role rather than defaulting open", () => {
    expect(canWriteWidgets(null)).toBe(false);
    expect(canWriteWidgets(undefined)).toBe(false);
  });

  it("agrees with the board's write rule for every role", () => {
    // They're separate predicates so they can diverge when real per-role write
    // access lands; until then a difference would be a bug, not a feature.
    for (const role of ROLES) {
      expect(canWriteWidgets(role)).toBe(canWriteEntries(role));
    }
  });
});

describe("workspace roles", () => {
  it("only the owner may delete a workspace", () => {
    expect(canDeleteWorkspace("owner")).toBe(true);
    expect(canDeleteWorkspace("admin")).toBe(false);
    expect(canDeleteWorkspace("member")).toBe(false);
  });

  it("owners and admins manage members", () => {
    expect(canManageWorkspace("owner")).toBe(true);
    expect(canManageWorkspace("admin")).toBe(true);
    expect(canManageWorkspace("member")).toBe(false);
  });
});

describe("invite access levels", () => {
  it("maps the only enabled level to the read-only org role", () => {
    expect(mapAccessLevelToOrgRole("view")).toBe("member");
    expect(canWriteWidgets(mapAccessLevelToOrgRole("view"))).toBe(false);
  });

  it("refuses levels the permission model can't honour yet", () => {
    // Better to fail the invite than to hand out a role whose write access
    // nothing actually enforces.
    for (const level of ["edit", "full"]) {
      expect(() => mapAccessLevelToOrgRole(level)).toThrow();
      expect(ACCESS_LEVELS.find((l) => l.value === level)?.enabled).toBe(false);
    }
  });
});
