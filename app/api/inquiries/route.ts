import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { isSameOrigin } from "@/lib/admin-auth";
import { dbQuery } from "@/lib/db";
import { validateInquiry } from "@/lib/inquiry";

export const runtime = "nodejs";
const attempts = new Map<string, { count: number; expires: number }>();
const windowMs = 15 * 60 * 1000;

function respond(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  if (attempts.size > 2000) for (const [k, v] of attempts) if (v.expires < now) attempts.delete(k);
  const previous = attempts.get(key);
  if (!previous || previous.expires <= now) {
    attempts.set(key, { count: 1, expires: now + windowMs });
    return false;
  }
  return ++previous.count > 5;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return respond({ error: "Invalid request origin." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 12000) return respond({ error: "Your message is too long." }, 413);
  let input: unknown;
  try {
    const text = await request.text();
    if (text.length > 12000) return respond({ error: "Your message is too long." }, 413);
    input = JSON.parse(text);
  } catch {
    return respond({ error: "Please submit a valid form." }, 400);
  }
  if (input && typeof input === "object" && !Array.isArray(input) &&
    typeof (input as Record<string, unknown>).website === "string" &&
    (input as Record<string, unknown>).website) return respond({ ok: true }, 200);
  const checked = validateInquiry(input);
  if (!checked.ok) return respond({ error: checked.error }, 400);
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return respond({ error: "Too many messages. Try again in 15 minutes." }, 429);
  const id = randomUUID();
  const { kind, name, email, organization, track, message } = checked.data;
  try {
    await dbQuery("INSERT INTO submissions (id,kind,name,email,organization,track,message) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [id, kind, name, email, organization || "", track || "", message]);
    return respond({ ok: true, reference: id.slice(0, 8).toUpperCase() }, 201);
  } catch {
    return respond({ error: "The inquiry service is unavailable. Please try again later." }, 503);
  }
}
