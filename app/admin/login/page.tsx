"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json() as { ok?: boolean; detail?: string };
      if (!response.ok || !result.ok) throw new Error(result.detail || "Sign-in failed.");
      window.location.assign("/admin/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in unavailable.");
      setBusy(false);
    }
  }

  return <main className="auth-shell"><div className="auth-layout">
    <div className="auth-aside">
      <Link href="/" className="auth-brand">✦ axiom<span>labs</span></Link>
      <div><div className="eyebrow">PRIVATE COMPANY MANAGEMENT</div>
        <h1>One owner.<br/><span className="gradient-text">One clear dashboard.</span></h1>
        <p>Manage project requests, career applications, featured work and website details in one place.</p>
        <div className="auth-points"><span><ShieldCheck size={18}/> Predefined administrator</span><span><LockKeyhole size={18}/> Secure private session</span></div>
      </div>
      <small>There is no public registration. Admin credentials are configured privately on your server.</small>
    </div>
    <div className="auth-form-wrap"><section className="auth-card" aria-labelledby="sign-in-title">
      <div className="auth-card-icon"><LockKeyhole size={22}/></div>
      <div className="eyebrow">ADMINISTRATOR ONLY</div>
      <h2 id="sign-in-title">Welcome back</h2>
      <p>Sign in with the administrator email and password configured on Render.</p>
      <form onSubmit={submit} className="auth-form">
        <label>Administrator email<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} placeholder="owner@company.com"/></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Your private password"/></label>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary auth-submit" type="submit" disabled={busy}>{busy?"Signing in…":"Sign in to dashboard"} <ArrowRight size={16}/></button>
      </form>
      <p className="auth-help">Only the predefined administrator can sign in. Never share your password.</p>
      <Link className="auth-return" href="/">← Back to website</Link>
    </section></div>
  </div></main>;
}
