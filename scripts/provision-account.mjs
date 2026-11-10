/**
 * Trusted local environment only; never publish Firebase Admin credentials.
 * Example (run from an authenticated machine with ADC):
 *   USERNAME=TCH-0001 ROLE=teacher SCHOOL_TEMP_PASSWORD='use-a-unique-strong-password' node scripts/provision-account.mjs
 * Do not place real passwords in shell history; use a secure environment variable
 * prompt or secret manager, and clear it immediately after provisioning.
 */
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const username = (process.env.USERNAME ?? "").trim().toLowerCase();
const role = (process.env.ROLE ?? "").trim();
const password = process.env.SCHOOL_TEMP_PASSWORD ?? "";
const roles = ["student", "teacher", "admin", "principal", "superadmin", "developer"];
if (!/^[a-z0-9_-]{1,40}$/.test(username)) throw new Error("USERNAME must be a manually assigned valid school identifier.");
if (!roles.includes(role)) throw new Error("Invalid ROLE.");
if (role === "teacher" && !/^tch-\d{4,}$/.test(username)) throw new Error("Teacher IDs must match TCH-0001.");
if (role === "student" && /^(admin|admin2|superadmin|principal|tch-)/.test(username)) throw new Error("Student username overlaps reserved prefix.");
if (password.length < 12) throw new Error("A unique password of at least 12 characters is required.");
if (role === "superadmin" || role === "developer" || role === "principal" || role === "admin")
  throw new Error("Privileged accounts require a separately reviewed provisioning workflow; do not use this generic script.");
if (!getApps().length) initializeApp({ credential: applicationDefault(), projectId: "upper-homadola-school" });
const auth = getAuth(); const db = getFirestore();
const email = `u-${username}@accounts.upperhomadola.school`;
const index = db.doc(`loginNames/${username}`);
if ((await index.get()).exists) throw new Error("Username already provisioned.");
let user;
try {
  user = await auth.createUser({ email, password, emailVerified: false, disabled: false });
  await auth.setCustomUserClaims(user.uid, { schoolAccess: true, role });
  await db.runTransaction(async transaction => {
    const existing = await transaction.get(index);
    if (existing.exists) throw new Error("Username already taken.");
    transaction.create(index, { uid: user.uid });
    transaction.create(db.doc(`users/${user.uid}`), {
      username, role, active: true, createdVia: "trusted-admin-sdk",
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  console.log(`Provisioned ${role} account ${username}. Firebase UID: ${user.uid}`);
} catch (error) {
  if (user) { try { await auth.deleteUser(user.uid); } catch { /* Review orphaned account manually. */ } }
  throw error;
}
