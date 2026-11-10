"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDoc, doc } from "firebase/firestore";
import { onIdTokenChanged, signOut, type User } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDatabase } from "@/lib/firebase/client";
import { hasActiveRoleProfile, isSchoolRole, roleHome, roleLabel, type SchoolRole } from "@/lib/auth/roles";

type Session =
  | { state: "loading" }
  | { state: "signed-out" }
  | { state: "unapproved"; detail: string }
  | { state: "ready"; user: User; role: SchoolRole; username: string };

function useVerifiedSession(): Session {
  const [session, setSession] = useState<Session>({ state: "loading" });
  useEffect(() => {
    let active = true;
    let sequence = 0;
    const unsubscribe = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      const requestId = ++sequence;
      if (!user) { if (active) setSession({ state: "signed-out" }); return; }
      if (active) setSession({ state: "loading" });
      try {
        // Claims can only be issued by an authorized Admin SDK environment.
        const token = await user.getIdTokenResult();
        const role = token.claims.role;
        if (token.claims.schoolAccess !== true || !isSchoolRole(role)) {
          if (active && requestId === sequence) setSession({ state: "unapproved", detail: "This account has no approved school role. Ask the school administrator to activate access." });
          return;
        }
        // Rules only permit fetching the signed-in user's profile.
        const snapshot = await getDoc(doc(getFirebaseDatabase(), "users", user.uid));
        const profile = snapshot.data();
        if (!snapshot.exists() || !hasActiveRoleProfile(profile, role)) {
          if (active && requestId === sequence) setSession({ state: "unapproved", detail: "This school account is disabled or its role/profile does not match." });
          return;
        }
        if (active && requestId === sequence) setSession({ state: "ready", user, role, username: typeof profile?.username === "string" ? profile.username : "" });
      } catch {
        if (active && requestId === sequence) setSession({ state: "unapproved", detail: "Could not verify school access. Check the deployed Firestore Rules and try signing in again." });
      }
    });
    return () => { active = false; sequence++; unsubscribe(); };
  }, []);
  return session;
}

export function AuthGate({ allowedRoles, children }: { allowedRoles: readonly SchoolRole[]; children: React.ReactNode }) {
  const session = useVerifiedSession();
  if (session.state === "loading") return <main className="section"><div className="card auth-card"><p role="status">Verifying your school access…</p></div></main>;
  if (session.state === "signed-out") return <main className="section"><div className="card auth-card"><h1>Sign-in required</h1><p>Please sign in to continue.</p><Link className="button" href="/login/">Go to Login</Link></div></main>;
  if (session.state === "unapproved") return <main className="section"><div className="card auth-card"><h1>Access not available</h1><p>{session.detail}</p><p>Real school records are not accessible from this page.</p><button className="auth-button" type="button" onClick={() => signOut(getFirebaseAuth())}>Sign out</button></div></main>;
  if (!allowedRoles.includes(session.role)) return <main className="section"><div className="card auth-card"><h1>Access denied</h1><p>Your verified role is {roleLabel[session.role]}. You cannot open this dashboard.</p><Link className="button" href={roleHome[session.role]}>Go to your dashboard</Link></div></main>;
  return <>{children}<div className="role-footer"><span>Signed in as {session.username || session.user.email || "School user"} · {roleLabel[session.role]}</span><button type="button" className="auth-link" onClick={() => signOut(getFirebaseAuth())}>Sign out</button></div></>;
}
