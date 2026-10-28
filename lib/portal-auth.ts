import { NextRequest, NextResponse } from "next/server";

export const ACCESS_COOKIE = "axiom_access";
export const REFRESH_COOKIE = "axiom_refresh";

const ACCESS_SECONDS = 10 * 60;
const REFRESH_SECONDS = 7 * 24 * 60 * 60;

function backendOrigin(): string | null {
  const configured = process.env.DJANGO_API_URL ||
    (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : "");
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" && !(process.env.NODE_ENV === "development" &&
      url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) return null;
    return url.origin;
  } catch { return null; }
}

export async function djangoFetch(path: string, options: RequestInit = {}): Promise<Response | null> {
  const origin = backendOrigin();
  if (!origin) return null;
  try {
    return await fetch(origin + path, { ...options, cache: "no-store", signal: AbortSignal.timeout(12000) });
  } catch { return null; }
}

export function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function requestIsSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return (!origin || origin === request.nextUrl.origin) && fetchSite !== "cross-site";
}

export function writeSession(response: NextResponse, access: string, refresh?: string) {
  const common = {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const, path: "/",
  };
  response.cookies.set(ACCESS_COOKIE, access, { ...common, maxAge: ACCESS_SECONDS });
  if (refresh) response.cookies.set(REFRESH_COOKIE, refresh, { ...common, maxAge: REFRESH_SECONDS });
}

export function clearSession(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function portalRequest(request: NextRequest, path: string, method: "GET"|"POST"|"PATCH", payload?: string) {
  let access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!access && !refresh) return json({ detail: "Please sign in." }, 401);

  const tenant = request.headers.get("X-Tenant-ID");
  const headers: Record<string, string> = {};
  if (tenant) headers["X-Tenant-ID"] = tenant;
  if (method !== "GET") headers["Content-Type"] = "application/json";

  const call = async (token: string) => djangoFetch(path, {
    method, headers: { ...headers, Authorization: `Bearer ${token}` },
    ...(payload ? { body: payload } : {}),
  });

  let upstream = access ? await call(access) : null;
  let rotated: { access: string; refresh?: string } | null = null;

  if ((!upstream || upstream.status === 401) && refresh) {
    const result = await djangoFetch("/api/auth/token/refresh/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (result?.ok) {
      const body = await result.json() as { access: string; refresh?: string };
      rotated = { access: body.access, refresh: body.refresh };
      access = body.access;
      upstream = await call(access);
    } else if (result?.status === 401) {
      const response = json({ detail: "Session expired. Please sign in again." }, 401);
      clearSession(response);
      return response;
    }
  }

  if (!upstream) return json({ detail: "The account service is unavailable." }, 503);
  const responseText = await upstream.text();
  let data: unknown;
  try { data = JSON.parse(responseText); }
  catch { data = { detail: upstream.ok ? "OK" : "Request failed." }; }
  const outgoing = json(data, upstream.status);
  if (rotated) writeSession(outgoing, rotated.access, rotated.refresh);
  return outgoing;
}
