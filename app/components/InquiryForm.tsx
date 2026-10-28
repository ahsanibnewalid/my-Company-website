"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";
import type { InquiryKind } from "@/lib/inquiry";

type Props = {
  kind: InquiryKind;
  track?: string;
  onTrackChange?: (track: string) => void;
};

export default function InquiryForm({ kind, track = "Junior Student Intern", onTrackChange }: Props) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setSent(false); setError(""); }, [track]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          name: data.get("name"),
          email: data.get("email"),
          organization: data.get("organization") || "",
          track: kind === "career" ? data.get("track") : "",
          message: data.get("message"),
          website: data.get("website") || "",
          consent: data.get("consent") === "on",
        }),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "The request could not be delivered.");
      }
      setSent(true);
      form.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return <div className="success-state" role="status">
      <span><Check/></span>
      <b>Message sent</b>
      <p>Thanks for getting in touch. Your message was delivered to our team. We'll review it and reply if there's a suitable next step.</p>
      <button className="btn btn-outline" type="button" onClick={() => setSent(false)}>Send another message</button>
    </div>;
  }

  return <form className="apply-form inquiry-form" onSubmit={submit}>
    {kind === "career" && <label>Application track
      <select name="track" value={track} onChange={e => onTrackChange?.(e.target.value)}>
        <option>Senior Faculty Advisor</option>
        <option>Junior Student Intern</option>
      </select>
    </label>}
    <div className="form-row">
      <label>Full name <input name="name" autoComplete="name" required minLength={2} maxLength={100} placeholder="Your full name"/></label>
      <label>Email address <input name="email" autoComplete="email" type="email" maxLength={254} required placeholder="you@example.com"/></label>
    </div>
    {kind === "project" && <label>Company or organization (optional)
      <input name="organization" autoComplete="organization" maxLength={120} placeholder="Your company"/>
    </label>}
    <label>{kind === "project" ? "What would you like to build?" : "Relevant experience and interests"}
      <textarea name="message" required minLength={20} maxLength={4000} rows={5}
        placeholder={kind === "project" ? "Tell us about your goals, current challenges, and ideal timeline…" : "Share your background, skills, and why you are interested…"}/>
    </label>
    <div className="honeypot-field" aria-hidden="true">
      <label>Website <input name="website" tabIndex={-1} autoComplete="off"/></label>
    </div>
    <label className="consent-label"><input name="consent" type="checkbox" required/>
      <span>I agree to be contacted at the email above about this {kind === "career" ? "application" : "project inquiry"}. Please do not include passwords or confidential data. See our <a className="inline-link" href="/privacy">privacy notice</a>.</span>
    </label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="btn btn-primary" type="submit" disabled={sending}>
      {sending ? "Sending…" : kind === "project" ? "Send project inquiry" : "Send application"} <ArrowRight size={16}/>
    </button>
    <p className="form-privacy">Messages are sent to the company inbox only when email delivery is configured; this form does not create an account.</p>
  </form>;
}
