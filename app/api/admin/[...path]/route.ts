import type { NextRequest } from "next/server";
import { json, portalRequest, requestIsSameOrigin } from "@/lib/portal-auth";

export const runtime = "nodejs";
type Context = { params: Promise<{ path: string[] }> };
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const detail = new RegExp("^(tenants|users)/" + uuid + "$", "i");

async function forward(request: NextRequest, context: Context, method: "GET"|"POST"|"PATCH") {
  if (method !== "GET" && !requestIsSameOrigin(request)) {
    return json({ detail: "Invalid request origin." }, 403);
  }
  const { path } = await context.params;
  const key = path.join("/");
  const permitted = (method === "GET" && key === "overview") ||
    (method === "POST" && ["tenants", "users", "memberships"].includes(key)) ||
    (method === "PATCH" && detail.test(key));
  if (!permitted) return json({ detail: "Not found." }, 404);
  let payload: string | undefined;
  if (method !== "GET") {
    payload = await request.text();
    if (payload.length > 8000) return json({ detail: "Request too large." }, 413);
    try { JSON.parse(payload); } catch { return json({ detail: "Invalid request data." }, 400); }
  }
  return portalRequest(request, "/api/admin/" + key + "/", method, payload);
}

export const GET = (request: NextRequest, context: Context) => forward(request, context, "GET");
export const POST = (request: NextRequest, context: Context) => forward(request, context, "POST");
export const PATCH = (request: NextRequest, context: Context) => forward(request, context, "PATCH");
