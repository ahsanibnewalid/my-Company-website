import type { NextRequest } from "next/server";
import { adminGuard, apiResponse, databaseError, readBody } from "@/lib/api-server";
import { dbQuery, getSiteSettings } from "@/lib/db";
import { validateSiteSettings } from "@/lib/inputs";

export async function PATCH(request: NextRequest) {
  const denied = adminGuard(request, true);
  if (denied) return denied;
  const body = await readBody(request);
  if (!body.ok) return body.response;
  const checked = validateSiteSettings(body.input);
  if (!checked.ok) return apiResponse({ detail: checked.error }, 400);
  try {
    for (const [key, value] of Object.entries(checked.data)) {
      await dbQuery(
        `INSERT INTO site_settings (key,value) VALUES ($1,$2)
         ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,
        [key, value],
      );
    }
    return apiResponse({ settings: await getSiteSettings() });
  } catch {
    return databaseError();
  }
}
