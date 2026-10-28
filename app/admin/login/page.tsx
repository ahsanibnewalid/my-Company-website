"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
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
      const response = await fetch("/api/auth/admin/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, otp }),
      });
      const result = await response.json() as { ok?: boolean; detail?: string };
      if (!response.ok || !result.ok) throw new Error(result.detail || "Sign-in failed.");
      window.location.assign("/admin/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in unavailable.");
    } finally { setBusy(false); }
  }

  return <main className="auth-shell"><div className="auth-layout">
    <div className="auth-aside">
      <Link href="/" className="auth-brand">✦ axiom<span>labs</span></Link>
      <div><div className="eyebrow">RESTRICTED OWNER CONSOLE</div>
        <h1>Owner control.<br/><span className="gradient-text">Verified identity.</span></h1>
        <p>Only pre-approved owner accounts can access administration. Both a password and a confirmed authenticator code are required.</p>
        <div className="auth-points"><span><ShieldCheck size={18}/> Server-verified roles</span><span><LockKeyhole size={18}/> Private session cookies</span></div>
      </div>
      <small>No public registration. Only the backend administrator can pre-provision an approved owner account.</small>
    </div>
    <div className="auth-form-wrap"><section className="auth-card" aria-labelledby="sign-in-title">
      <div className="auth-card-icon"><LockKeyhole size={22}/></div>
      <div className="eyebrow">OWNER ACCESS ONLY</div>
      <h2 id="sign-in-title">Company administration</h2>
      <p>Use your predefined administrator email, password and six-digit authenticator code.</p>
      <form onSubmit={submit} className="auth-form">
        <label>Work email<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} placeholder="you@company.com"/></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Your account password"/></label>
        <label>Authenticator code<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="6-digit code"/></label>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary auth-submit" type="submit" disabled={busy}>{busy?"Verifying…":"Sign in securely"} <ArrowRight size={16}/></button>
      </form>
      <p className="auth-help">Administrator identity must be explicitly approved in backend configuration. Never share your password or authenticator code.</p>
      <Link className="auth-return" href="/">← Back to company website</Link><p className="auth-help"><Link href="/login">Staff or client sign-in</Link></p>
    </section></div>
  </div></main>;
}
