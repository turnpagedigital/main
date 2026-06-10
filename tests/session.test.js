import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSessionCookieValue,
  verifySessionCookieValue,
  parseCookies,
  buildSetCookieHeader,
  COOKIE_NAME,
} from "../functions/api/admin/_utils.js";

/* Session cookie HMAC round-trip — standard WebCrypto, runs in Node.
   (constantTimeEqual uses the Workers-only crypto.subtle.timingSafeEqual,
   so it is exercised only in production, not here.) */

const SECRET = "test-secret-0123456789abcdef0123456789abcdef";

test("valid cookie round-trips", async () => {
  const value = await createSessionCookieValue(SECRET);
  assert.equal(await verifySessionCookieValue(value, SECRET), true);
});

test("tampered payload fails verification", async () => {
  const value = await createSessionCookieValue(SECRET);
  const [msg, sig] = [value.slice(0, value.lastIndexOf(".")), value.slice(value.lastIndexOf(".") + 1)];
  const farFuture = `exp=${Date.now() + 999 * 24 * 3600 * 1000}`;
  assert.equal(await verifySessionCookieValue(`${farFuture}.${sig}`, SECRET), false);
  assert.equal(await verifySessionCookieValue(`${msg}.AAAA${sig.slice(4)}`, SECRET), false);
});

test("wrong secret fails verification", async () => {
  const value = await createSessionCookieValue(SECRET);
  assert.equal(await verifySessionCookieValue(value, "another-secret-entirely-padpadpad"), false);
});

test("expired cookie fails verification", async () => {
  const value = await createSessionCookieValue(SECRET);
  const realNow = Date.now;
  try {
    Date.now = () => realNow() + 25 * 3600 * 1000; // jump past the 24h TTL
    assert.equal(await verifySessionCookieValue(value, SECRET), false);
  } finally {
    Date.now = realNow;
  }
});

test("garbage values fail without throwing", async () => {
  for (const junk of [null, undefined, "", "no-dot", "exp=abc.sig", "a.b.c", 42]) {
    assert.equal(await verifySessionCookieValue(junk, SECRET), false);
  }
});

test("parseCookies extracts the session cookie among others", () => {
  const req = new Request("https://x.test/", {
    headers: { cookie: `foo=bar; ${COOKIE_NAME}=abc%2Edef; baz=1` },
  });
  const cookies = parseCookies(req);
  assert.equal(cookies[COOKIE_NAME], "abc.def");
  assert.equal(cookies.foo, "bar");
});

test("buildSetCookieHeader sets the hardening attributes", () => {
  const header = buildSetCookieHeader("v", 60);
  for (const attr of ["HttpOnly", "Secure", "SameSite=Strict", "Max-Age=60", "Path=/"]) {
    assert.ok(header.includes(attr), `missing ${attr}`);
  }
});
