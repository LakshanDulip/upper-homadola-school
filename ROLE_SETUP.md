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
4. **First admin**: follow the Windows bootstrap instructions below. Inspect first, verify control of the exact alias account and UID, then explicitly apply. Keep credentials and execution private. Sign out and back in afterwards.
5. Provision a teacher or student using `scripts/provision-account.mjs` with `USERNAME`, `ROLE`, `SCHOOL_TEMP_PASSWORD`; only trusted operators must use this script. The student username is the **existing permanent school admission number**, never auto-generated. Teacher IDs follow `TCH-0001`.
6. Usernames are **not real mailboxes**. Password recovery for username accounts requires an administrator verification and reset flow (not yet implemented). Do not attempt Firebase email reset on the synthetic alias.
7. Before real school data: implement MFA for all privileged roles, an audited backend for account provisioning/revocation, rate limiting, mandatory first-login password change, per-grade and per-subject authorization, and private R2 asset authorization. Test rules in the Firebase Emulator and have a security review.

## Security boundaries
- Static GitHub Pages/Cloudflare assets are public. A client-side hidden menu is **not authorization**. School data can only be protected by server-enforced Firestore Security Rules and verified Cloudflare Workers APIs.
- Claims alone can be cached in an ID token until refresh; sensitive backends should also check active account status and token revocation for privileged actions. Deactivating users in Firebase Admin must revoke their sessions.
- Existing Firebase Auth test account does not gain admin permissions automatically; a trusted, explicitly authorized bootstrap is required.
- Cloudflare R2 credentials and Admin SDK service accounts must never be sent to the browser.
- Account email aliases used here are deterministic identifiers, **not evidence of role**, and should not be used for verified-email recovery.

## Windows: first admin bootstrap

The login mapping is `admin` -> `u-admin@accounts.upperhomadola.school`.
The bootstrap never creates an Auth account, changes its email or sets a password.
Do not create a second account if this alias already exists.

1. Install Google Cloud CLI from the official Google download. Sign in locally with
   the Google account authorized to administer `upper-homadola-school`:
   `gcloud auth login --project upper-homadola-school`.
2. For Admin SDK ADC, prefer impersonating an **existing, approved** service account:
   `gcloud auth application-default login --impersonate-service-account=EXISTING_SERVICE_ACCOUNT_EMAIL`.
   The operator needs Service Account Token Creator on that account; the account
   needs approved Firebase Authentication and Firestore access. Do not create keys,
   grant broad roles or create a new service account just to bypass a permission error.
   Standard gcloud end-user ADC is not accepted by Firebase Authentication. Another
   supported option is ADC with a project-owned Desktop OAuth client ID using
   `--client-id-file`, as described in Firebase's Admin setup documentation.
3. Run `npm run admin:inspect`. This performs read-only Auth and Firestore checks,
   including all Auth pages and privileged profiles, and prints the target UID.
4. Verify the exact alias and UID in Firebase Console and confirm that the intended
   school operator controls its password. An alias is not a real mailbox, so do not
   treat emailVerified as proof of ownership or mark the email verified artificially.
5. Only after that verification, in local PowerShell:

   ```powershell
   $env:TARGET_EMAIL = 'u-admin@accounts.upperhomadola.school'
   $env:TARGET_UID = 'THE_VERIFIED_FIREBASE_UID'
   $env:CONFIRM_BOOTSTRAP = 'YES'
   node scripts/bootstrap-existing-admin.mjs --apply
   Remove-Item Env:TARGET_UID, Env:TARGET_EMAIL, Env:CONFIRM_BOOTSTRAP
   ```

The script refuses a different email, disabled/non-password account, conflicting
role/profile/username, or any other privileged account. It reserves
`bootstrap/firstAdmin`, `loginNames/admin` and an inactive `users/{uid}` profile in a
transaction, preserves unrelated claims, grants `{schoolAccess:true, role:'admin'}`,
then activates and verifies the profile. If interrupted, rerun for the same verified
UID. A completed matching admin is a no-op. Auth and Firestore cannot be updated
atomically; an inactive profile blocks the dashboard while recovery is pending.
Run only one reviewed provisioning workflow at a time: this lock cannot serialize
unrelated Admin SDK tools or manual console edits.

Before rules deployment, show the proposed `firestore.rules` and obtain explicit
operator approval. The rules allow only a claimed user's own profile get and deny
all profile writes, directory queries and all other school records. Pages deployment
does not deploy these rules. After approval, deploy with an authenticated Firebase
CLI using `firebase deploy --only firestore:rules --project upper-homadola-school`.
Verify the released rules match this file before testing.

Sign out, then sign in on the deployed site with username `admin` and the privately
held password. Verify `/admin/` opens; `/developer/` rejects the admin; signing out
blocks `/admin/`. Also test a non-approved account and an inactive/mismatched profile
in an emulator, not by changing live account privileges. Never paste passwords,
OAuth codes, ADC files, ID tokens or service account keys into chat or GitHub.

References:
- https://firebase.google.com/docs/admin/setup#test-with-gcloud-end-user-credentials
- https://cloud.google.com/docs/authentication/use-service-account-impersonation
