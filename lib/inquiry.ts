export type InquiryKind = "project" | "career";

export type Inquiry = {
  kind: InquiryKind;
  name: string;
  email: string;
  organization: string;
  track: string;
  message: string;
};

export type ValidationResult =
  | { ok: true; data: Inquiry }
  | { ok: false; error: string };

const MAX_MESSAGE_LENGTH = 4000;

function field(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateInquiry(value: unknown): ValidationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Please complete the form." };
  }

  const input = value as Record<string, unknown>;
  const kind = input.kind;
  const name = field(input.name);
  const email = field(input.email).toLowerCase();
  const organization = field(input.organization);
  const track = field(input.track);
  const message = field(input.message);

  if (kind !== "project" && kind !== "career") {
    return { ok: false, error: "Choose a valid inquiry type." };
  }
  if (name.length < 2 || name.length > 100) {
    return { ok: false, error: "Enter your full name (2–100 characters)." };
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (organization.length > 120) {
    return { ok: false, error: "Organization name is too long." };
  }
  if (kind === "career" && !["Senior Faculty Advisor", "Junior Student Intern"].includes(track)) {
    return { ok: false, error: "Select a valid application track." };
  }
  if (message.length < 20 || message.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: "Please share 20–4,000 characters about your request." };
  }
  if (input.consent !== true) {
    return { ok: false, error: "Please agree to being contacted about this inquiry." };
  }

  return {
    ok: true,
    data: { kind, name, email, organization, track: kind === "career" ? track : "", message },
  };
}
