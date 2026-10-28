import type { NextRequest } from "next/server";
import { adminGuard, apiResponse, databaseError, readBody } from "@/lib/api-server";
import { dbQuery } from "@/lib/db";
import { validUuid, validateProject } from "@/lib/inputs";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const denied = adminGuard(request, true);
  if (denied) return denied;
  const { id } = await context.params;
  if (!validUuid(id)) return apiResponse({ detail: "Invalid project ID." }, 400);
  const body = await readBody(request);
  if (!body.ok) return body.response;
  const checked = validateProject(body.input, true);
  if (!checked.ok) return apiResponse({ detail: checked.error }, 400);
  const fields = Object.entries(checked.data);
  const setters = fields.map(([key], index) => `${key}=$${index + 1}`);
  try {
    const result = await dbQuery(
      `UPDATE projects SET ${setters.join(", ")},updated_at=NOW()
       WHERE id=$${fields.length + 1} RETURNING *`,
      [...fields.map(([, value]) => value), id],
    );
    return result.rowCount ? apiResponse({ project: result.rows[0] }) : apiResponse({ detail: "Not found." }, 404);
  } catch {
    return databaseError();
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const denied = adminGuard(request, true);
  if (denied) return denied;
  const { id } = await context.params;
  if (!validUuid(id)) return apiResponse({ detail: "Invalid project ID." }, 400);
  try {
    const result = await dbQuery("DELETE FROM projects WHERE id=$1 RETURNING id", [id]);
    return result.rowCount ? apiResponse({ ok: true }) : apiResponse({ detail: "Not found." }, 404);
  } catch {
    return databaseError();
  }
}
