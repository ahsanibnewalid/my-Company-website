import type { NextRequest } from "next/server";
import { adminGuard, apiResponse, databaseError } from "@/lib/api-server";
import { dbQuery, getSiteSettings } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = adminGuard(request);
  if (denied) return denied;
  try {
    const submissions = await dbQuery(
      "SELECT * FROM submissions ORDER BY created_at DESC LIMIT 200",
    );
    const projects = await dbQuery(
      "SELECT * FROM projects ORDER BY created_at DESC LIMIT 100",
    );
    const totals = await dbQuery<{
      inquiries: string; applications: string; projects: string; new_submissions: string;
    }>(`SELECT
      (SELECT COUNT(*) FROM submissions WHERE kind = 'project') AS inquiries,
      (SELECT COUNT(*) FROM submissions WHERE kind = 'career') AS applications,
      (SELECT COUNT(*) FROM projects) AS projects,
      (SELECT COUNT(*) FROM submissions WHERE status = 'new') AS new_submissions`);
    const settings = await getSiteSettings();
    const summary = Object.fromEntries(
      Object.entries(totals.rows[0]).map(([key, value]) => [key, Number(value)]),
    );
    return apiResponse({ summary, submissions: submissions.rows, projects: projects.rows, settings });
  } catch {
    return databaseError();
  }
}
