import { apiResponse, databaseError } from "@/lib/api-server";
import { databaseConfigured, dbQuery } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!databaseConfigured()) return apiResponse({ projects: [] });
  try {
    const result = await dbQuery(
      `SELECT id,title,description,status,url FROM projects
       WHERE featured=TRUE ORDER BY created_at DESC LIMIT 12`,
    );
    return apiResponse({ projects: result.rows });
  } catch {
    return databaseError();
  }
}
