import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Axiom Labs | Software, Security & AI", template: "%s | Axiom Labs" },
  description: "Explore Axiom Labs' approach to secure software, SaaS architecture, and practical AI systems. Discuss a project or apply to collaborate.",
  applicationName: "Axiom Labs",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Axiom Labs | Build what's next",
    description: "Software, security-conscious architecture, and AI-enabled digital systems.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
