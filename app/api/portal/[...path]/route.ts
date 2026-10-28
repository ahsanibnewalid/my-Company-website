import type { NextRequest } from "next/server";
import { json, portalRequest, requestIsSameOrigin } from "@/lib/portal-auth";

export const runtime = "nodejs";
type Context = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, context: Context, method: "GET"|"POST"|"PATCH") {
  if (method !== "GET" && !requestIsSameOrigin(request)) {
    return json({ detail: "Invalid request origin." }, 403);
  }
  const { path } = await context.params;
  const key = path.join("/");
  const safeTicketId = /^tickets\/[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(key);
  const permitted = (method === "GET" && ["me", "overview", "projects", "tickets"].includes(key)) ||
    (method === "POST" && ["projects", "tickets"].includes(key)) ||
    (method === "PATCH" && safeTicketId);
  if (!permitted) return json({ detail: "Not found." }, 404);
  const backendPath = key === "me" ? "/api/auth/me/" : `/api/portal/${key}/`;
  let payload: string | undefined;
  if (method !== "GET") {
    payload = await request.text();
    if (payload.length > 12000) return json({ detail: "Request too large." }, 413);
    try { JSON.parse(payload); } catch { return json({ detail: "Invalid request data." }, 400); }
  }
  return portalRequest(request, backendPath, method, payload);
}

export const GET = (request: NextRequest, context: Context) => forward(request, context, "GET");
export const POST = (request: NextRequest, context: Context) => forward(request, context, "POST");
export const PATCH = (request: NextRequest, context: Context) => forward(request, context, "PATCH");
