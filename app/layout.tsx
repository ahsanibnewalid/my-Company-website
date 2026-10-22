import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Axiom Labs — Build with confidence", description: "Secure, multi-tenant software and AI-enabled digital systems from Axiom Labs." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
