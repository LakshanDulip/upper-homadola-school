/**
 * Trusted LOCAL command only. Bootstrap an existing Firebase Auth email account as
 * the first school admin. Never run this in browser, Cloudflare public code, or CI.
 * Requires Google Application Default Credentials with Firebase Auth + Firestore access.
 *
 * Example:
 *   CONFIRM_BOOTSTRAP=YES TARGET_EMAIL=someone@example.com node scripts/bootstrap-existing-admin.mjs
 *
 * You MUST verify the account email belongs to the authorized school operator.
 * Run once; further role changes require a reviewed admin provisioning workflow.
 */
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

if (process.env.CONFIRM_BOOTSTRAP !== "YES") throw new Error("Set CONFIRM_BOOTSTRAP=YES only after verifying the intended school administrator.");
const email = (process.env.TARGET_EMAIL ?? "").trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Set TARGET_EMAIL to the already verified Firebase Auth test account email.");
if (!getApps().length) initializeApp({ credential: applicationDefault(), projectId: "upper-homadola-school" });
const auth = getAuth();
const account = await auth.getUserByEmail(email);
if (account.disabled) throw new Error("Account is disabled.");
const profile = getFirestore().doc(`users/${account.uid}`);
if ((await profile.get()).exists) throw new Error("This account already has a school profile. Refusing to overwrite existing role.");
await auth.setCustomUserClaims(account.uid, { schoolAccess: true, role: "admin" });
await profile.create({ username: "admin", role: "admin", active: true, createdAt: FieldValue.serverTimestamp(), createdVia: "trusted-bootstrap" });
console.log(`Admin bootstrap prepared for UID ${account.uid}. Sign out and sign back in to refresh claims.`);
