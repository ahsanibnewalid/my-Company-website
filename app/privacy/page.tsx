import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy & inquiries",
  description: "How Axiom Labs handles project inquiries and career applications.",
};

export default function PrivacyPage() {
  return <main className="privacy-page"><div className="wrap"><article className="privacy-card">
    <Link href="/">← Return to Axiom Labs</Link>
    <h1>Privacy & inquiry information</h1>
    <p>This page explains how our contact and career application forms work. It is a technical disclosure, not a substitute for a verified company-wide privacy policy.</p>
    <h2>Information you choose to send</h2>
    <p>When you submit a form, we store your name, email, message, and, when relevant, your organization or application track. A submission timestamp records your consent. Please do not send passwords, identification documents, financial account details or confidential business data.</p>
    <h2>Why and how it is used</h2>
    <p>Your information is stored in the company's PostgreSQL database to review your inquiry and, where appropriate, contact you. Only the predefined administrator can review the submission queue. We do not forward submissions through an email delivery provider. The forms do not create client accounts or advertising subscriptions.</p>
    <h2>When saving is unavailable</h2>
    <p>If the backend or its database is not configured or reachable, the form shows an error and does not claim that the request was saved. Keep a copy of your message and try again later.</p>
    <h2>Retention, access and deletion</h2>
    <p>A company-specific retention period and a dedicated privacy contact still need to be established before full public launch. The administrator can review or delete records in the restricted company dashboard. For access or deletion requests, use a published company contact channel once available.</p>
    <h2>Technical safeguards</h2>
    <p>Submissions use HTTPS on correctly configured hosting, form validation, parameterized database queries, and basic rate limiting. The administrator uses a password-verified, signed HttpOnly session cookie. These are not guarantees of absolute security; further monitoring and managed abuse protection are needed for production.</p>
    <p style={{ marginTop: 28 }}><Link href="/#contact">Return to the contact form</Link></p>
  </article></div></main>;
}
