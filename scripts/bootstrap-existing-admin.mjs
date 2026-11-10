/** Trusted local command. Read-only unless --apply is supplied. Never handles passwords. */
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { bootstrapAdmin, ADMIN_EMAIL } from "./lib/bootstrap-admin.mjs";
try {
  if ((process.env.TARGET_EMAIL ?? ADMIN_EMAIL).trim().toLowerCase() !== ADMIN_EMAIL)
    throw Object.assign(new Error("TARGET_EMAIL must be the admin login alias."), { bootstrapSafe: true });
  const app = initializeApp({ credential: applicationDefault(), projectId: "upper-homadola-school" });
  const result = await bootstrapAdmin({ auth: getAuth(app), db: getFirestore(app),
    timestamp: () => FieldValue.serverTimestamp(), apply: process.argv.includes("--apply"),
    confirmed: process.env.CONFIRM_BOOTSTRAP === "YES", expectedUid: process.env.TARGET_UID });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  // Never print raw SDK responses, tokens or request details.
  console.error(error.bootstrapSafe ? error.message : `Bootstrap stopped (${String(error.code ?? "authentication-or-api-error").replace(/[^a-zA-Z0-9_/-]/g, "")}). Check local ADC and project permissions.`);
  process.exitCode = 1;
}
