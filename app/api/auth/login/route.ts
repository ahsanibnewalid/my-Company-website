import type { NextRequest } from "next/server";
import { djangoFetch, json, requestIsSameOrigin, writeSession } from "@/lib/portal-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!requestIsSameOrigin(request)) return json({ detail: "Invalid request origin." }, 403);
  let input: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 5000) return json({ detail: "Request too large." }, 413);
    input = JSON.parse(text);
  } catch { return json({ detail: "Invalid login form." }, 400); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return json({ detail: "Invalid login form." }, 400);
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = input.password;
  const otp = typeof input.otp === "string" ? input.otp.trim() : "";
  if (!email || email.length > 254 || typeof password !== "string" || !password || password.length > 1024 ||
      (otp && !/^\d{6}$/.test(otp))) return json({ detail: "Enter valid sign-in details." }, 400);

  const upstream = await djangoFetch("/api/auth/token/", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, otp }),
  });
  if (!upstream) return json({ detail: "Sign-in service is not configured or unavailable." }, 503);
  if (!upstream.ok) {
    const error = await upstream.json().catch(() => ({})) as { detail?: string };
    return json({ detail: error.detail || "Sign-in failed." }, upstream.status);
  }
  const result = await upstream.json() as { access: string; refresh: string; user: unknown };
  if (!result.access || !result.refresh) return json({ detail: "Invalid service response." }, 502);
  const response = json({ ok: true, user: result.user }, 200);
  writeSession(response, result.access, result.refresh);
  return response;
}
