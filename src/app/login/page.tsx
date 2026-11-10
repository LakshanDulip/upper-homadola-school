"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isSchoolRole, resolveLoginEmail, roleHome, roleLabel } from "@/lib/auth/roles";

function friendlyAuthError(code: string) {
  if (code === "auth/too-many-requests") return "Too many attempts. Please try again later.";
  if (code === "auth/network-request-failed") return "Network error. Check your connection.";
  if (code === "auth/operation-not-allowed") return "Email/Password login is not enabled in Firebase.";
  if (code === "auth/unauthorized-domain") return "The website domain is not authorized in Firebase Authentication.";
  return "Unable to sign in. Check your username/password or contact the school administrator.";
}

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (nextUser) => {
      if (!alive) return;
      setUser(nextUser);
      setChecking(false);
      setRole(null);
      if (nextUser) {
        try {
          const result = await nextUser.getIdTokenResult();
          if (alive && result.claims.schoolAccess === true && isSchoolRole(result.claims.role)) setRole(result.claims.role);
        } catch { /* Dashboard also enforces active profile and deployed Firestore Rules. */ }
      }
    });
    return () => { alive = false; unsubscribe(); };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage("");
    const email = resolveLoginEmail(identifier);
    if (!email) { setError("Enter a valid email, student admission number, or teacher username."); return; }
    setBusy(true);
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      setPassword("");
      setMessage("Firebase sign-in successful. Your school role and active status will be verified before dashboard access.");
    } catch (err) {
      setError(friendlyAuthError((err as {code?:string}).code ?? ""));
    } finally { setBusy(false); }
  }

  async function handleReset() {
    setError(""); setMessage("");
    if (!identifier.includes("@")) {
      setError("Username accounts require an administrator-assisted password reset. Email accounts can use this link.");
      return;
    }
    const email = resolveLoginEmail(identifier);
    if (!email) { setError("Enter a valid email."); return; }
    setBusy(true);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email);
      setMessage("If an eligible account exists, Firebase will send reset instructions.");
    } catch (err) {
      setError(friendlyAuthError((err as {code?:string}).code ?? ""));
    } finally { setBusy(false); }
  }

  async function handleLogout() {
    setBusy(true); setError("");
    try { await signOut(getFirebaseAuth()); setRole(null); setMessage("Signed out."); }
    catch { setError("Could not sign out."); }
    finally { setBusy(false); }
  }

  return <main className="section"><div className="card auth-card">
    <span className="tag">SCHOOL ACCOUNT</span><h1>School Portal Login</h1>
    <p>Students: admission number · Teachers: TCH ID · Staff: assigned username or email</p>
    <div className="notice">Accounts must be provisioned by authorized school administrators. No public registration. New accounts do not receive school access merely by signing in.</div>
    {checking ? <p role="status">Checking login…</p> : user ? <section>
      <h2>Signed in</h2><p>Account: <strong>{user.email}</strong></p>
      <p>Token role: <strong>{role && isSchoolRole(role) ? roleLabel[role] : "Not assigned"}</strong></p>
      {role && isSchoolRole(role) ? <p><Link className="button" href={roleHome[role]}>Continue to dashboard →</Link></p> : <p>Ask the administrator to approve this account. No private school data is available.</p>}
      <button type="button" onClick={handleLogout} className="auth-button" disabled={busy}>Sign out</button>
    </section> : <form className="auth-form" onSubmit={handleLogin}>
      <label htmlFor="identifier">Username or email</label>
      <input id="identifier" autoComplete="username" required value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="Admission No / TCH-0001 / email" disabled={busy}/>
      <label htmlFor="password">Password</label>
      <input id="password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/>
      <button type="submit" className="auth-button" disabled={busy}>{busy?"Signing in…":"Sign in"}</button>
      <button type="button" className="auth-link" onClick={handleReset} disabled={busy}>Forgot password?</button>
    </form>}
    {error&&<p role="alert" className="auth-error">{error}</p>}
    {message&&<p role="status" className="auth-success">{message}</p>}
    <p><Link href="/" className="tag">← Back to homepage</Link></p>
  </div></main>;
}
