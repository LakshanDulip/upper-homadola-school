"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

function friendlyAuthError(code: string) {
  if (code === "auth/invalid-email") return "Please enter a valid email address.";
  if (code === "auth/too-many-requests") return "Too many attempts. Please try again later.";
  if (code === "auth/network-request-failed") return "Network error. Please check your internet connection.";
  if (code === "auth/operation-not-allowed") return "Email/Password login has not been enabled in Firebase Console.";
  if (code === "auth/unauthorized-domain") return "This website domain is not authorized in Firebase Authentication settings.";
  return "Unable to sign in. Check your credentials or contact the school administrator.";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, (signedInUser) => {
      setUser(signedInUser);
      setChecking(false);
    }, () => {
      setError("Could not check sign-in status.");
      setChecking(false);
    });
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
      setPassword("");
      setMessage("Signed in successfully. School dashboard access will be available after role verification is implemented.");
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      setError(friendlyAuthError(code));
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("Enter your account email address before requesting a reset.");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
      setMessage("If that address has an eligible account, password reset instructions will be sent.");
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      setError(code === "auth/invalid-email" ? "Enter a valid email address." : friendlyAuthError(code));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setError("");
    try {
      await signOut(getFirebaseAuth());
      setMessage("You have signed out.");
    } catch {
      setError("Could not sign out. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="section">
      <div className="card auth-card">
        <span className="tag">SCHOOL PORTAL</span>
        <h1>Sign in</h1>
        <p>G/Upper Homadola School · Secure Firebase Authentication</p>
        <div className="notice" role="note">
          This is the first login phase. Only email/password authentication is enabled here.
          Student admission-number and teacher-ID login, account provisioning, and private dashboards
          will be available after secure roles and backend permissions are implemented.
        </div>

        {checking ? <p role="status">Checking sign-in status…</p> : user ? (
          <section aria-label="Account status">
            <h2>Signed in</h2>
            <p>Account: <strong>{user.email ?? "Firebase account"}</strong></p>
            <p>School role: <strong>Not yet verified</strong></p>
            <p>Private school records remain unavailable until permissions are configured.</p>
            <button type="button" onClick={handleLogout} disabled={busy} className="auth-button">Sign out</button>
          </section>
        ) : (
          <form onSubmit={handleLogin} className="auth-form">
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" disabled={busy} />
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" disabled={busy} />
            <button type="submit" className="auth-button" disabled={busy}>{busy ? "Please wait…" : "Sign in"}</button>
            <button type="button" className="auth-link" onClick={handleReset} disabled={busy}>Forgot password?</button>
          </form>
        )}
        {error && <p role="alert" className="auth-error">{error}</p>}
        {message && <p role="status" className="auth-success">{message}</p>}
        <p><Link className="tag" href="/">← Back to homepage</Link></p>
      </div>
    </main>
  );
}
