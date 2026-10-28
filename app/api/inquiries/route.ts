import type { NextRequest } from "next/server";
import { validateInquiry } from "@/lib/inquiry";
import { djangoFetch, requestIsSameOrigin } from "@/lib/portal-auth";

export const runtime = "nodejs";

const windowMs = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; expires: number }>();

function respond(body: Record<string, unknown>, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  if (attempts.size > 2000) {
    for (const [ip, entry] of attempts) {
      if (entry.expires <= now) attempts.delete(ip);
    }
  }
  const previous = attempts.get(key);
  if (!previous || previous.expires <= now) {
    attempts.set(key, { count: 1, expires: now + windowMs });
    return false;
  }
  previous.count += 1;
  return previous.count > 5;
}

export async function POST(request: NextRequest) {
  if (!requestIsSameOrigin(request)) {
    return respond({ error: "Requests must originate from this website." }, 403);
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(length) || length > 12000) {
    return respond({ error: "Your message is too long." }, 413);
  }

  let input: unknown;
  try {
    const body = await request.text();
    if (body.length > 12000) return respond({ error: "Your message is too long." }, 413);
    input = JSON.parse(body);
  } catch {
    return respond({ error: "Please submit a valid form." }, 400);
  }

  if (input && typeof input === "object" && !Array.isArray(input) &&
      typeof (input as Record<string, unknown>).website === "string" &&
      (input as Record<string, unknown>).website) {
    // Honeypot: quietly acknowledge bot submissions without saving them.
    return respond({ ok: true }, 200);
  }

  const checked = validateInquiry(input);
  if (!checked.ok) return respond({ error: checked.error }, 400);

  const submissionKey = process.env.WEBSITE_SUBMISSION_KEY;
  if (!submissionKey) {
    return respond({ error: "The inquiry service is not available yet. Please try again later." }, 503);
  }

  // This process-local throttle is a secondary safeguard, not a substitute for
  // managed rate limiting across Render instances.
  const ip = request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (tooManyAttempts(ip)) {
    return respond({ error: "Too many messages. Please try again in 15 minutes." }, 429);
  }

  const upstream = await djangoFetch("/api/inquiries/submit/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Website-Submission-Key": submissionKey,
    },
    body: JSON.stringify({ ...checked.data, consent: true }),
  });
  if (!upstream) {
    return respond({ error: "The inquiry service is currently unavailable. Please try again later." }, 503);
  }
  if (!upstream.ok) {
    if (upstream.status === 400) {
      return respond({ error: "Please check your form details and try again." }, 400);
    }
    return respond({ error: "Your request could not be saved. Please try again later." }, 502);
  }

  const result = await upstream.json().catch(() => null) as { ok?: boolean; reference?: string } | null;
  if (!result?.ok || !result.reference) {
    return respond({ error: "We could not verify the saved request. Please try again later." }, 502);
  }
  return respond({ ok: true, reference: result.reference }, 201);
}
