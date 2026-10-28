import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminRequest, isSameOrigin } from "./admin-auth";

export function apiResponse(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function adminGuard(request: NextRequest, mutate = false): NextResponse | null {
  if (mutate && !isSameOrigin(request)) return apiResponse({ detail: "Invalid request origin." }, 403);
  if (!isAdminRequest(request)) return apiResponse({ detail: "Administrator sign-in required." }, 401);
  return null;
}

export async function readBody(request: NextRequest, maxLength = 12000):
  Promise<{ ok: true; input: unknown } | { ok: false; response: NextResponse }> {
  try {
    const length = Number(request.headers.get("content-length") || 0);
    if (!Number.isFinite(length) || length > maxLength) {
      return { ok: false, response: apiResponse({ detail: "Request too large." }, 413) };
    }
    const body = await request.text();
    if (body.length > maxLength) {
      return { ok: false, response: apiResponse({ detail: "Request too large." }, 413) };
    }
    return { ok: true, input: JSON.parse(body) };
  } catch {
    return { ok: false, response: apiResponse({ detail: "Invalid JSON." }, 400) };
  }
}

export function databaseError(): NextResponse {
  return apiResponse({ detail: "Database unavailable. Check DATABASE_URL in Render." }, 503);
}
