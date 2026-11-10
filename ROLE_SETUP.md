# Secure roles: setup and limitations

## Implemented in code
- Firebase Email/Password login supports registered emails AND deterministic aliases for provisioned school usernames: `u-{lowercased-username}@accounts.upperhomadola.school`.
- Six role routes: `/student/`, `/teacher/`, `/admin/`, `/principal/`, `/superadmin/`, `/developer/`.
- Client role gate checks **Firebase-signed Custom Claims** `{schoolAccess:true, role:"..."}` AND reads matching `users/{uid}` `active:true` profile.
- `/admin/` allows admin, principal, superadmin and developer, but this route is only an empty management scaffold. No actual private data or write actions are available.
- Firestore rules allow only the signed-in user's own minimal profile document read if a school claim is present. **No clients can write profiles or read other school data.** These rules must be deployed using authorized Firebase CLI before the gates will work.
- No client-side signup and no self-service role changes.

## Deployment: required before using role dashboards
1. Firebase Console → Firestore Rules: review and deploy the version in `firestore.rules`. As a cautious alternative run `npx firebase-tools deploy --only firestore:rules --project upper-homadola-school` on a trusted authorized machine. **GitHub Pages and Workers deploys do not deploy Firestore Rules.**
2. Firebase Console → Authentication → Settings → Authorized domains: add actual site hostnames (only the domain, not URL/path). Keep unapproved hosts out.
3. On a trusted computer, use Google Application Default Credentials or a suitably restricted authorized service account; **never paste any service account JSON into chat, GitHub, or browser code**. Install dependencies with `npm install` (dev dependency `firebase-admin`).
4. **First admin**, if you own an existing Firebase Auth test account and have verified the account identity: run `scripts/bootstrap-existing-admin.mjs` with `TARGET_EMAIL` and `CONFIRM_BOOTSTRAP=YES`. This *intentionally grants admin rights*: keep the credentials and execution environment private. Sign out and back in afterwards.
5. Provision a teacher or student using `scripts/provision-account.mjs` with `USERNAME`, `ROLE`, `SCHOOL_TEMP_PASSWORD`; only trusted operators must use this script. The student username is the **existing permanent school admission number**, never auto-generated. Teacher IDs follow `TCH-0001`.
6. Usernames are **not real mailboxes**. Password recovery for username accounts requires an administrator verification and reset flow (not yet implemented). Do not attempt Firebase email reset on the synthetic alias.
7. Before real school data: implement MFA for all privileged roles, an audited backend for account provisioning/revocation, rate limiting, mandatory first-login password change, per-grade and per-subject authorization, and private R2 asset authorization. Test rules in the Firebase Emulator and have a security review.

## Security boundaries
- Static GitHub Pages/Cloudflare assets are public. A client-side hidden menu is **not authorization**. School data can only be protected by server-enforced Firestore Security Rules and verified Cloudflare Workers APIs.
- Claims alone can be cached in an ID token until refresh; sensitive backends should also check active account status and token revocation for privileged actions. Deactivating users in Firebase Admin must revoke their sessions.
- Existing Firebase Auth test account does not gain admin permissions automatically; a trusted, explicitly authorized bootstrap is required.
- Cloudflare R2 credentials and Admin SDK service accounts must never be sent to the browser.
- Account email aliases used here are deterministic identifiers, **not evidence of role**, and should not be used for verified-email recovery.
