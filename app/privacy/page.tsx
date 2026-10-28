import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy & inquiries",
  description: "How the Axiom Labs website handles project inquiries and career application messages.",
};

export default function PrivacyPage() {
  return <main className="privacy-page"><div className="wrap"><article className="privacy-card">
    <Link href="/">← Return to Axiom Labs</Link>
    <h1>Privacy & inquiry information</h1>
    <p>This page explains how the website's contact and career application forms work. It is a limited technical disclosure, not a substitute for a verified company-wide privacy policy.</p>
    <h2>Information you choose to send</h2>
    <p>When you submit a form, we receive your name, email address, message and, when relevant, company name or application track. Please do not send passwords, identification documents, financial account details or confidential business data.</p>
    <h2>Why and how it is used</h2>
    <p>The information is used to review your inquiry and, where appropriate, reply. The website validates it on the server and uses Resend to forward it to the configured company inbox. Its email provider and mailbox host may process and retain copies under their respective terms. The website does not add inquiries to a customer database or advertising list.</p>
    <h2>When delivery is unavailable</h2>
    <p>If the company inbox or sending provider has not been configured, the form displays an error and does not claim your message was sent. You may try again later.</p>
    <h2>Retention, access and deletion</h2>
    <p>A specific retention period and dedicated privacy contact are not published yet. These must be established by the company before a full public launch. If the company replies to your message, you can request deletion or access by replying to that conversation.</p>
    <h2>Technical safeguards</h2>
    <p>Form submission uses HTTPS on properly configured hosting, length checks, a basic abuse throttle and an email delivery provider. These safeguards do not guarantee absolute security. The site's demo client and owner views do not accept real account logins.</p>
    <p style={{ marginTop: 28 }}><Link href="/#contact">Return to the contact form</Link></p>
  </article></div></main>;
}
