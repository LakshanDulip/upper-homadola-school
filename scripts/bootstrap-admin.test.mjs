import test from "node:test";
import assert from "node:assert/strict";
import { bootstrapAdmin, ADMIN_EMAIL } from "./lib/bootstrap-admin.mjs";
function fixture({ users = [], records = {}, disabled = false, claims = {} } = {}) {
  const account = { uid: "verified-uid", email: ADMIN_EMAIL, disabled, providerData: [{ providerId: "password" }], customClaims: claims };
  const store = new Map(Object.entries(records));
  let writes = 0;
  let failClaims = false;
  const snap = path => ({ id: path.split("/").at(-1), exists: store.has(path), data: () => store.get(path) });
  const ref = path => ({ path, get: async () => snap(path), update: async value => { writes++; store.set(path, { ...store.get(path), ...value }); } });
  const auth = {
    getUserByEmail: async email => { assert.equal(email, ADMIN_EMAIL); return account; },
    getUser: async () => account,
    listUsers: async (_size, token) => token ? { users } : { users: [account], pageToken: "next" },
    setCustomUserClaims: async (_uid, value) => { if (failClaims) throw new Error("simulated interruption"); writes++; account.customClaims = value; },
  };
  const db = {
    doc: ref, getAll: async (...refs) => refs.map(r => snap(r.path)),
    collection: () => ({ where: () => ({ get: async () => ({ docs: [...store.keys()].filter(p => p.startsWith("users/") && ["admin", "principal", "superadmin", "developer"].includes(store.get(p).role)).map(snap) }) }) }),
    runTransaction: async fn => {
      const pending = [];
      await fn({ get: async r => snap(r.path), create: (r, data) => pending.push([r.path, data]) });
      for (const [path, data] of pending) { assert.equal(store.has(path), false); writes++; store.set(path, data); }
    },
  };
  return { run: opts => bootstrapAdmin({ auth, db, timestamp: () => "server-time", ...opts }), store, account, writes: () => writes, fail: value => { failClaims = value; } };
}
const approval = { apply: true, confirmed: true, expectedUid: "verified-uid" };
test("inspection never writes", async () => {
  const f = fixture(); assert.equal((await f.run()).state, "ready-for-operator-verification"); assert.equal(f.writes(), 0);
});
test("exact verified UID and confirmation are required", async () => {
  for (const opts of [{ apply: true }, { ...approval, expectedUid: "wrong" }, { ...approval, confirmed: false }]) {
    const f = fixture(); await assert.rejects(f.run(opts), /Verify account control/); assert.equal(f.writes(), 0);
  }
});
test("disabled account and privileged account on a later page are blocked", async () => {
  for (const options of [{ disabled: true }, { users: [{ uid: "other", customClaims: { role: "admin" } }] }]) {
    const f = fixture(options); await assert.rejects(f.run(approval)); assert.equal(f.writes(), 0);
  }
});
test("conflicting profile, username and lock are blocked", async () => {
  for (const records of [{ "users/other": { role: "principal" } }, { "users/verified-uid": { role: "teacher" } }, { "loginNames/admin": { uid: "other" } }, { "bootstrap/firstAdmin": { uid: "other" } }]) {
    const f = fixture({ records }); await assert.rejects(f.run(approval)); assert.equal(f.writes(), 0);
  }
});
test("provisions exact claims and active profile, preserves unrelated claims, rerun is a no-op", async () => {
  const f = fixture({ claims: { auditTag: "keep" } });
  assert.equal((await f.run(approval)).state, "provisioned-and-verified");
  assert.deepEqual(f.account.customClaims, { auditTag: "keep", schoolAccess: true, role: "admin" });
  assert.equal(f.store.get("users/verified-uid").active, true);
  assert.equal(f.store.get("loginNames/admin").uid, "verified-uid");
  const writes = f.writes(); assert.equal((await f.run(approval)).changed, false); assert.equal(f.writes(), writes);
});
test("interrupted claim write leaves profile inactive and safely resumes", async () => {
  const f = fixture(); f.fail(true); await assert.rejects(f.run(approval), /simulated interruption/);
  assert.equal(f.store.get("users/verified-uid").active, false);
  f.fail(false); await f.run(approval); assert.equal(f.store.get("users/verified-uid").active, true);
});
