import test from "node:test";
import assert from "node:assert/strict";
import { validateInquiry } from "../lib/inquiry.ts";

const valid = {
  kind: "project", name: "  Alex Doe  ", email: "  ALEX@example.com ",
  organization: "Northstar", track: "", message: "We need a secure client portal for our team.",
  consent: true,
};

test("normalizes a valid project inquiry", () => {
  const result = validateInquiry(valid);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.name, "Alex Doe");
    assert.equal(result.data.email, "alex@example.com");
  }
});

test("requires explicit consent and a valid email", () => {
  assert.equal(validateInquiry({ ...valid, consent: false }).ok, false);
  assert.equal(validateInquiry({ ...valid, email: "not-an-email" }).ok, false);
});

test("enforces message and name length", () => {
  assert.equal(validateInquiry({ ...valid, message: "too short" }).ok, false);
  assert.equal(validateInquiry({ ...valid, message: "a".repeat(4001) }).ok, false);
  assert.equal(validateInquiry({ ...valid, name: "a" }).ok, false);
});

test("requires a supported career track", () => {
  assert.equal(validateInquiry({ ...valid, kind: "career", track: "CEO" }).ok, false);
  assert.equal(validateInquiry({ ...valid, kind: "career", track: "Junior Student Intern" }).ok, true);
});

test("rejects malformed payloads", () => {
  assert.equal(validateInquiry(null).ok, false);
  assert.equal(validateInquiry([]).ok, false);
  assert.equal(validateInquiry("hello").ok, false);
});
