import type { NextRequest } from "next/server";
import { adminGuard, apiResponse, databaseError, readBody } from "@/lib/api-server";
import { dbQuery } from "@/lib/db";
import { validUuid } from "@/lib/inputs";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const denied = adminGuard(request, true);
  if (denied) return denied;
  const { id } = await context.params;
  if (!validUuid(id)) return apiResponse({ detail: "Invalid submission ID." }, 400);
  const body = await readBody(request);
  if (!body.ok) return body.response;
  const input = body.input as { status?: unknown };
  if (!input || typeof input !== "object" || Array.isArray(input) ||
    Object.keys(input).length !== 1 || !["new", "reviewing", "closed"].includes(String(input.status))) {
    return apiResponse({ detail: "Invalid status." }, 400);
  }
  try {
    const result = await dbQuery(
      "UPDATE submissions SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING id",
      [input.status, id],
    );
    return result.rowCount ? apiResponse({ ok: true }) : apiResponse({ detail: "Not found." }, 404);
  } catch {
    return databaseError();
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const denied = adminGuard(request, true);
  if (denied) return denied;
  const { id } = await context.params;
  if (!validUuid(id)) return apiResponse({ detail: "Invalid submission ID." }, 400);
  try {
    const result = await dbQuery("DELETE FROM submissions WHERE id=$1 RETURNING id", [id]);
    return result.rowCount ? apiResponse({ ok: true }) : apiResponse({ detail: "Not found." }, 404);
  } catch {
    return databaseError();
  }
}
