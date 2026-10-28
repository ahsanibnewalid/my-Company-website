import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminEntryPage() {
  const session = await cookies();
  // Any session goes to the dashboard, where Django verifies the owner allowlist.
  // Without a session, render the dedicated owner sign-in.
  const hasSession = session.has("axiom_access") || session.has("axiom_refresh");
  redirect(hasSession ? "/admin/dashboard" : "/admin/login");
}
