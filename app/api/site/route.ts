import { apiResponse } from "@/lib/api-server";
import { databaseConfigured, defaultSiteSettings, getSiteSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!databaseConfigured()) return apiResponse({ settings: defaultSiteSettings });
  try {
    return apiResponse({ settings: await getSiteSettings() });
  } catch {
    return apiResponse({ settings: defaultSiteSettings });
  }
}
