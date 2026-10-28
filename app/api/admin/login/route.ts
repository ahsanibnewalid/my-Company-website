import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE, adminConfigured, authenticateAdmin, isSameOrigin,
  makeAdminSession, sessionCookieOptions,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 15 * 60_000;

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function throttled(request: NextRequest, email: string): boolean {
  const ip = request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = createHash("sha256").update(email + "|" + ip).digest("hex");
  const now = Date.now();
  if (attempts.size > 2000) {
    for (const [id, entry] of attempts) if (entry.until < now) attempts.delete(id);
  }
  const entry = attempts.get(key);
  if (!entry || entry.until < now) {
    attempts.set(key, { count: 1, until: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > 8;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return json({ detail: "Invalid request origin." }, 403);
  if (!adminConfigured()) return json({ detail: "Administrator login is not configured." }, 503);
  let input: Record<string, unknown>;
  try {
    const body = await request.text();
    if (body.length > 2048) return json({ detail: "Request too large." }, 413);
    input = JSON.parse(body);
  } catch {
    return json({ detail: "Invalid login form." }, 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return json({ detail: "Invalid login form." }, 400);
  }
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = input.password;
  if (!email || email.length > 254 || typeof password !== "string" || !password || password.length > 512) {
    return json({ detail: "Invalid credentials." }, 401);
  }
  if (throttled(request, email)) return json({ detail: "Too many attempts. Try again in 15 minutes." }, 429);
  if (!await authenticateAdmin(email, password)) {
    return json({ detail: "Invalid credentials." }, 401);
  }

  const response = json({ ok: true }, 200);
  response.cookies.set(ADMIN_COOKIE, makeAdminSession(), sessionCookieOptions());
  return response;
}
