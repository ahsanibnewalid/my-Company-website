import test from "node:test";
import assert from "node:assert/strict";
import { hashAdminPassword, verifyAdminPassword, authenticateAdmin, makeAdminSession, validAdminSession, SESSION_SECONDS } from "../lib/admin-auth.ts";

test("hashes the admin password with a salted scrypt hash", async () => {
  const password = "correct-horse-unique-password";
  const first = await hashAdminPassword(password);
  const second = await hashAdminPassword(password);
  assert.notEqual(first, second);
  assert.equal(first.startsWith("scrypt$"), true);
  assert.equal(await verifyAdminPassword(password, first), true);
  assert.equal(await verifyAdminPassword("wrong-password", first), false);
  assert.equal(await verifyAdminPassword(password, "invalid"), false);
  await assert.rejects(hashAdminPassword("too-short"));
});

test("allows only the configured owner and signs bounded sessions", async () => {
  const previous = { ...process.env };
  try {
    process.env.ADMIN_EMAIL = "owner@example.com";
    process.env.ADMIN_PASSWORD_HASH = await hashAdminPassword("a-private-admin-password");
    process.env.SESSION_SECRET = "a-long-random-test-secret-not-for-production-0123456789";
    assert.equal(await authenticateAdmin("OWNER@example.com", "a-private-admin-password"), true);
    assert.equal(await authenticateAdmin("stranger@example.com", "a-private-admin-password"), false);
    const now = Date.now();
    const session = makeAdminSession(now);
    assert.equal(validAdminSession(session, now), true);
    assert.equal(validAdminSession(session, now + (SESSION_SECONDS + 1) * 1000), false);
    assert.equal(validAdminSession(session + "modified", now), false);
    process.env.ADMIN_PASSWORD_HASH = await hashAdminPassword("a-new-owner-password");
    assert.equal(validAdminSession(session, now), false);
  } finally {
    for (const key of ["ADMIN_EMAIL", "ADMIN_PASSWORD_HASH", "SESSION_SECRET"]) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
