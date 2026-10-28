import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, validAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminEntryPage() {
  const cookieJar = await cookies();
  redirect(validAdminSession(cookieJar.get(ADMIN_COOKIE)?.value) ? "/admin/dashboard" : "/admin/login");
}
