import test from "node:test";
import assert from "node:assert/strict";
import { validateProject, validateSiteSettings, validUuid } from "../lib/inputs.ts";

test("project fields are explicitly validated", () => {
  assert.equal(validateProject({ title: "My project", url: "https://example.com", featured: true }).ok, true);
  assert.equal(validateProject({ title: "abc", url: "javascript:alert(1)" }).ok, false);
  assert.equal(validateProject({ title: "abc", badField: true }).ok, false);
  assert.equal(validateProject({ title: "ok" }).ok, false);
  assert.equal(validateProject({ status: "completed" }, true).ok, true);
  assert.equal(validateProject({}, true).ok, false);
  assert.equal(validUuid("xyz"), false);
});

test("settings allow only known fields and valid contact email", () => {
  assert.equal(validateSiteSettings({ founder_name: "Ahsan" }).ok, true);
  assert.equal(validateSiteSettings({ contact_email: "not-an-email" }).ok, false);
  assert.equal(validateSiteSettings({ secret: "value" }).ok, false);
});
