import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminEntryPage() {
  const session = await cookies();
  // Visitors without an account session must see the login form first.
  // Expired sessions are handled safely by /portal, which returns to /login.
  const hasSession = session.has("axiom_access") || session.has("axiom_refresh");
  redirect(hasSession ? "/portal" : "/login");
}
