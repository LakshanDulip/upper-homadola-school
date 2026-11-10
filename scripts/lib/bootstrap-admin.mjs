export const ADMIN_EMAIL = "u-admin@accounts.upperhomadola.school";
const privileged = ["admin", "principal", "superadmin", "developer"];
function requireSafe(condition, message) {
  if (!condition) throw Object.assign(new Error(message), { bootstrapSafe: true });
}
export async function bootstrapAdmin({ auth, db, timestamp, apply = false, confirmed = false, expectedUid }) {
  const account = await auth.getUserByEmail(ADMIN_EMAIL);
  requireSafe(!account.disabled, "Target account is disabled.");
  requireSafe(account.providerData.some(p => p.providerId === "password"), "Target must have password sign-in enabled.");
  const uid = account.uid;
  // Check every Auth page, including claims-only privileged accounts.
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    requireSafe(!page.users.some(u => u.uid !== uid && privileged.includes(u.customClaims?.role)), "Another privileged Auth account exists. Refusing duplicate admin.");
    pageToken = page.pageToken;
  } while (pageToken);
  const others = await db.collection("users").where("role", "in", privileged).get();
  requireSafe(!others.docs.some(d => d.id !== uid), "Another privileged profile exists. Refusing duplicate admin.");
  const profileRef = db.doc(`users/${uid}`);
  const indexRef = db.doc("loginNames/admin");
  const lockRef = db.doc("bootstrap/firstAdmin");
  const [profile, index, lock] = await db.getAll(profileRef, indexRef, lockRef);
  const claims = account.customClaims ?? {};
  requireSafe(!claims.role || claims.role === "admin", "Target already has a different role.");
  requireSafe(!index.exists || index.data().uid === uid, "Admin username belongs to another UID.");
  requireSafe(!lock.exists || lock.data().uid === uid, "First admin is reserved for another UID.");
  const matches = p => p?.username === "admin" && p?.role === "admin";
  const complete = profile.exists && matches(profile.data()) && profile.data().active === true && claims.schoolAccess === true && claims.role === "admin";
  const resumable = p => p?.createdVia === "trusted-bootstrap-v2" && matches(p) && p.active === false;
  requireSafe(!profile.exists || complete || (lock.exists && resumable(profile.data())), "Existing profile is not a matching bootstrap. Refusing overwrite.");
  if (!apply) return { mode: "read-only", project: "upper-homadola-school", email: ADMIN_EMAIL, uid, state: complete ? "already-provisioned" : "ready-for-operator-verification" };
  requireSafe(confirmed && expectedUid === uid, "Verify account control, then set TARGET_UID to its exact UID and CONFIRM_BOOTSTRAP=YES.");
  if (complete) return { state: "already-provisioned", uid, changed: false };
  // Auth and Firestore cannot commit atomically. Reserve an inactive profile first.
  // The permanent transaction lock prevents another invocation taking this slot.
  await db.runTransaction(async tx => {
    const [p, i, l] = await Promise.all([tx.get(profileRef), tx.get(indexRef), tx.get(lockRef)]);
    requireSafe(!l.exists || l.data().uid === uid, "Bootstrap is reserved for another UID.");
    requireSafe(!i.exists || i.data().uid === uid, "Admin username already taken.");
    requireSafe(!p.exists || (l.exists && resumable(p.data())), "Profile changed. Inspect before retrying.");
    if (!l.exists) tx.create(lockRef, { uid, createdAt: timestamp() });
    if (!i.exists) tx.create(indexRef, { uid });
    if (!p.exists) tx.create(profileRef, { username: "admin", role: "admin", active: false, createdVia: "trusted-bootstrap-v2", createdAt: timestamp() });
  });
  const fresh = await auth.getUser(uid);
  requireSafe(!fresh.disabled && fresh.email === ADMIN_EMAIL, "Target identity changed. Profile remains inactive.");
  requireSafe(!fresh.customClaims?.role || fresh.customClaims.role === "admin", "Target role changed. Profile remains inactive.");
  await auth.setCustomUserClaims(uid, { ...fresh.customClaims, schoolAccess: true, role: "admin" });
  await profileRef.update({ active: true });
  const verified = await auth.getUser(uid);
  const saved = await profileRef.get();
  requireSafe(verified.customClaims?.schoolAccess === true && verified.customClaims?.role === "admin" && matches(saved.data()) && saved.data().active === true, "Post-write verification failed. Inspect before signing in.");
  return { state: "provisioned-and-verified", uid, refresh: "Sign out and sign back in." };
}
