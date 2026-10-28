import { defaultSiteSettings, type SiteSettings } from "./db.ts";

export type ProjectInput = {
  title: string;
  description: string;
  status: "planning" | "active" | "completed";
  url: string;
  featured: boolean;
};

type Validation<T> = { ok: true; data: T } | { ok: false; error: string };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export function validUuid(value: string): boolean {
  return /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(value);
}

export function validateProject(value: unknown, partial = false): Validation<Partial<ProjectInput>> {
  const input = record(value);
  if (!input || !Object.keys(input).length) return { ok: false, error: "Enter project details." };
  const keys = ["title", "description", "status", "url", "featured"];
  if (Object.keys(input).some(key => !keys.includes(key))) {
    return { ok: false, error: "Unknown project field." };
  }
  if (!partial && !("title" in input)) return { ok: false, error: "Project title is required." };
  const data: Partial<ProjectInput> = {};
  if ("title" in input) {
    if (typeof input.title !== "string" || input.title.trim().length < 3 || input.title.trim().length > 140) {
      return { ok: false, error: "Title must be 3–140 characters." };
    }
    data.title = input.title.trim();
  }
  if ("description" in input) {
    if (typeof input.description !== "string" || input.description.trim().length > 2000) {
      return { ok: false, error: "Description is too long." };
    }
    data.description = input.description.trim();
  }
  if ("status" in input) {
    if (!["planning", "active", "completed"].includes(String(input.status))) {
      return { ok: false, error: "Invalid project status." };
    }
    data.status = input.status as ProjectInput["status"];
  }
  if ("url" in input) {
    if (typeof input.url !== "string" || input.url.length > 500) {
      return { ok: false, error: "Invalid project URL." };
    }
    const url = input.url.trim();
    if (url) {
      try {
        if (new URL(url).protocol !== "https:") throw new Error("HTTPS required");
      } catch {
        return { ok: false, error: "Project URL must be an HTTPS link." };
      }
    }
    data.url = url;
  }
  if ("featured" in input) {
    if (typeof input.featured !== "boolean") return { ok: false, error: "Invalid visibility setting." };
    data.featured = input.featured;
  }
  return { ok: true, data };
}

export function validateSiteSettings(value: unknown): Validation<Partial<SiteSettings>> {
  const input = record(value);
  if (!input || !Object.keys(input).length) return { ok: false, error: "No settings provided." };
  const limits: Record<keyof SiteSettings, number> = {
    tagline: 220, founder_name: 100, contact_email: 254, location: 120,
  };
  const data: Partial<SiteSettings> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!(key in defaultSiteSettings) || typeof value !== "string") {
      return { ok: false, error: "Invalid website setting." };
    }
    const setting = key as keyof SiteSettings;
    const clean = value.trim();
    if (clean.length > limits[setting]) return { ok: false, error: "A setting is too long." };
    if (setting === "contact_email" && clean && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      return { ok: false, error: "Contact email is invalid." };
    }
    data[setting] = clean;
  }
  return { ok: true, data };
}
