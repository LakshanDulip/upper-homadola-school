# Authentication roadmap

## Implemented
- Firebase Email/Password sign-in via Firebase Auth, auth-state observation, sign-out and email password-reset request.
- No user self-registration. No student records, teacher data or passwords stored in Firestore.
- Client login intentionally does **not** grant access to school dashboards, regardless of Firebase sign-in success.

## Critical security before real records
1. Deploy and test Firestore deny-all rules as a starting policy (repo files do not auto-deploy rules).
2. Provision accounts only through an authorized backend, never using public browser registrations.
3. Issue Firebase Custom Claims (role and authorized assignments) only from verified privileged backend code. Validate claims server-side in Cloudflare Workers and Firestore Rules.
4. Implement secure username-to-auth-identity mapping for permanent student admission numbers and assigned teacher IDs. Firebase Auth does not natively support username/password.
5. Protect student photos and files with private Cloudflare R2 storage and authorized short-lived access.
6. Enforce per-grade and per-subject scopes in database rules and backend, audit privileged writes, require MFA for privileged accounts and use secure account recovery.
7. Never use the publicly accessible GitHub Pages /admin UI preview for actual private school data.

## Firebase Console actions
- Authentication → Sign-in method → enable Email/Password.
- Authentication → Settings → Authorized domains → add `lakshandulip.github.io` and actual Cloudflare/custom hostnames used by the school. Do not include URL schemes or paths.
- For initial testing, create one test user in Authentication → Users manually; **do not** use real student personal data yet.
- For password reset, review the Firebase action email template and authorized domains.
