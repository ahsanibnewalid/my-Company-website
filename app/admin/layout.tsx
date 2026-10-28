import { redirect } from "next/navigation";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The previous browser-only dashboard was a public mock. All access now uses
  // the same authenticated owner/staff/client portal.
  redirect("/portal");
}
