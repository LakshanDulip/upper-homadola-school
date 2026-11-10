import test from "node:test";
import assert from "node:assert/strict";
import { hasActiveRoleProfile, isSchoolRole, resolveLoginEmail, roleHome } from "../src/lib/auth/roles.ts";
test("admin login resolves consistently, with whitespace and case normalization", () => {
  for (const input of ["admin", " ADMIN ", "u-admin@accounts.upperhomadola.school"]) assert.equal(resolveLoginEmail(input), "u-admin@accounts.upperhomadola.school");
  for (const input of ["", "admin admin", "admin/", "admin@", "a".repeat(41)]) assert.equal(resolveLoginEmail(input), null);
  assert.equal(roleHome.admin, "/admin/");
});
test("missing, inactive and mismatched profiles cannot satisfy the dashboard gate", () => {
  for (const profile of [null, undefined, {}, { role: "admin" }, { role: "admin", active: false }, { role: "admin", active: "true" }, { role: "teacher", active: true }]) assert.equal(hasActiveRoleProfile(profile, "admin"), false);
  assert.equal(hasActiveRoleProfile({ role: "admin", active: true }, "admin"), true);
  for (const role of [undefined, "owner", "ADMIN", {}, true]) assert.equal(isSchoolRole(role), false);
});
