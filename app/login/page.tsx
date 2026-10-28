"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, otp }),
      });
      const result = await response.json() as { ok?: boolean; detail?: string };
      if (!response.ok || !result.ok) throw new Error(result.detail || "Sign-in failed.");
      window.location.assign("/portal");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in unavailable.");
    } finally { setBusy(false); }
  }

  return <main className="auth-shell"><div className="auth-layout">
    <div className="auth-aside">
      <Link href="/" className="auth-brand">✦ axiom<span>labs</span></Link>
      <div><div className="eyebrow">SECURE COMPANY WORKSPACE</div>
        <h1>One sign-in.<br/><span className="gradient-text">The right access.</span></h1>
        <p>Owners, assigned team members, and clients each see only the workspaces and tools permitted by their account.</p>
        <div className="auth-points"><span><ShieldCheck size={18}/> Server-verified roles</span><span><LockKeyhole size={18}/> Private session cookies</span></div>
      </div>
      <small>Access is invitation-only. A company administrator provisions accounts.</small>
    </div>
    <div className="auth-form-wrap"><section className="auth-card" aria-labelledby="sign-in-title">
      <div className="auth-card-icon"><LockKeyhole size={22}/></div>
      <div className="eyebrow">OWNER · STAFF · CLIENT</div>
      <h2 id="sign-in-title">Sign in to Axiom Labs</h2>
      <p>Enter the email and password assigned to your account. Owners and privileged staff must also use an authenticator code.</p>
      <form onSubmit={submit} className="auth-form">
        <label>Work email<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} placeholder="you@company.com"/></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Your account password"/></label>
        <label>Authenticator code (when required)<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="6-digit code"/></label>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary auth-submit" type="submit" disabled={busy}>{busy?"Verifying…":"Sign in securely"} <ArrowRight size={16}/></button>
      </form>
      <p className="auth-help">Need an account or MFA enrollment? Contact your company administrator. Never share your password or one-time code.</p>
      <Link className="auth-return" href="/">← Back to company website</Link>
    </section></div>
  </div></main>;
}
