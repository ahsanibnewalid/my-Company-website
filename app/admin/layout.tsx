import Link from "next/link";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // This dashboard only holds fictional, browser-local demo data. Until real
  // authentication/authorization exists, do not expose it on production hosts.
  if (process.env.NODE_ENV === "production") {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#080b13", color: "#f2f5fc", padding: 24 }}>
      <section style={{ maxWidth: 520, border: "1px solid #293142", borderRadius: 18, padding: 32, background: "#101521" }}>
        <p style={{ color: "#a78bfa", fontWeight: 700, letterSpacing: 2, fontSize: 12 }}>OWNER CONSOLE</p>
        <h1 style={{ fontSize: 32, margin: "15px 0" }}>Private workspace</h1>
        <p style={{ color: "#98a2b7", lineHeight: 1.7 }}>
          The owner dashboard preview is available in local development only. Production access
          will require verified identities, audited permissions, and protected server-side data.
        </p>
        <Link href="/" style={{ display: "inline-block", padding: "12px 16px", borderRadius: 10, background: "#8c74f0", marginTop: 14, color: "white" }}>
          Return to Axiom Labs
        </Link>
      </section>
    </main>;
  }
  return children;
}
