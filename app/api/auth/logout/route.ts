import type { NextRequest } from "next/server";
import { REFRESH_COOKIE, clearSession, djangoFetch, json, requestIsSameOrigin } from "@/lib/portal-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!requestIsSameOrigin(request)) return json({ detail: "Invalid request origin." }, 403);
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refresh) {
    await djangoFetch("/api/auth/logout/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
  }
  const response = json({ ok: true }, 200);
  clearSession(response);
  return response;
}
