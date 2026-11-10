# Firebase connection (Phase 1)

Project ID: `upper-homadola-school`. The user-provided **Firebase Web SDK configuration** is initialized in `src/lib/firebase/client.ts` for browser use. These identifiers are public by design, **not private service account keys**.

## Current status

- Firebase Web SDK package and initialization code added.
- Auth and Firestore helpers are available for future client components.
- The login page displays SDK configuration status. It **does not authenticate users**.
- No Firestore student documents or accounts are created.
- `firestore.rules` is an initial **deny-all** policy, but this file is **not automatically deployed** to Firebase by GitHub Pages/Cloudflare Pages. The rules configured in Firebase Console remain authoritative until deployed.

## Firebase Console steps

1. Firebase Console → Authentication → Sign-in method → enable Email/Password.
2. Authentication → Settings → Authorized domains: add your verified Cloudflare Pages hostname and future custom domain (localhost if developing locally). Do not add unknown domains.
3. Firestore Database → Rules: keep secure deny-all rules while roles are developed. Do not switch to allow-all test rules.
4. After designing and testing authorization, deploy narrowly scoped Security Rules with an authorized Firebase CLI account. A static frontend alone cannot protect Firestore data.
5. Apply API key restrictions, billing quotas, MFA for privileged roles, and audit logging before real data.

Firebase Auth does not offer native username/password sign-in; admission number and teacher ID mapping needs a separately secured backend. R2 object storage will be connected through authorized Cloudflare Workers, not exposed browser credentials.

## Deployment

- GitHub Pages static export is already configured.
- Cloudflare Pages build command: `npm run build`; output directory: `out`; do **not** set `GITHUB_PAGES=true` in Cloudflare Pages.
- Analytics is intentionally **not initialized**: browser-only analytics can be added later with privacy/consent safeguards and only if enabled.
