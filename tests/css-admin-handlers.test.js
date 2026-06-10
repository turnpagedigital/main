/* css-admin-handlers — end-to-end tests for the /api/admin/tokens and
 * /api/admin/section-palettes HANDLERS, with GitHub mocked at the fetch
 * layer and a real signed session cookie.
 *
 * Regression target (June 2026): both endpoints mis-used getFileFromGitHub's
 * return shape — tokens.js (a .js file) read `.data` (null for non-JSON) and
 * section-palettes.js called JSON.parse on the already-parsed `.data` object
 * ("[object Object] is not valid JSON"). Pure-function tests can't catch
 * that handler glue; these do. */

import test from "node:test";
import assert from "node:assert/strict";

import * as tokensEndpoint from "../functions/api/admin/tokens.js";
import * as palettesEndpoint from "../functions/api/admin/section-palettes.js";
import { createSessionCookieValue, sessionSecret, COOKIE_NAME } from "../functions/api/admin/_utils.js";

const ENV = {
  ADMIN_SECRET: "test-secret-0123456789abcdef0123456789abcdef",
  ADMIN_PASSWORD: "test-password",
  GITHUB_TOKEN: "ghp_test",
  GITHUB_REPO: "turnpagedigital/main",
  GITHUB_BRANCH: "dev",
};

const TOKENS_JS = `/* tokens */
export const NEON = "#D4FF00";
export const INK_60 = "rgba(10,10,10,0.6)";
export const FONT = "'Archivo', sans-serif";
`;

const PALETTES_JSON = JSON.stringify({
  _comment: "test",
  faq: {
    id: "faq", displayName: "FAQ", description: "x",
    schemes: {
      light: { id: "light", displayName: "Light", tokens: { background: "SECONDARY_BG", text: "INK" } },
    },
  },
}, null, 2);

function b64(text) {
  return Buffer.from(text, "utf8").toString("base64");
}

/* Install a fetch mock serving the GitHub Contents API for the given files.
   Records PUT bodies in `puts`. Returns a restore function. */
function mockGitHub(files) {
  const realFetch = globalThis.fetch;
  const puts = [];
  globalThis.fetch = async (url, options = {}) => {
    const u = String(url);
    const method = (options.method || "GET").toUpperCase();
    const path = Object.keys(files).find(p => u.includes(encodeURI(p)) || u.includes(p));
    if (!path) return new Response("not found", { status: 404 });
    if (method === "GET") {
      return Response.json({ content: b64(files[path]), sha: `sha-${path}` });
    }
    if (method === "PUT") {
      const body = JSON.parse(options.body);
      puts.push({ path, body });
      return Response.json({ content: { sha: "new-sha" }, commit: { sha: "commit-sha" } });
    }
    return new Response("unsupported", { status: 500 });
  };
  return { puts, restore: () => { globalThis.fetch = realFetch; } };
}

async function authedRequest(url, init = {}) {
  const cookie = await createSessionCookieValue(sessionSecret(ENV));
  const headers = { ...(init.headers || {}), Cookie: `${COOKIE_NAME}=${cookie}` };
  return new Request(url, { ...init, headers });
}

/* ── tokens endpoint ── */

test("tokens GET parses the raw .js text (not the null JSON field)", async () => {
  const { restore } = mockGitHub({ "src/data/tokens.js": TOKENS_JS });
  try {
    const request = await authedRequest("https://x/api/admin/tokens");
    const res = await tokensEndpoint.onRequestGet({ request, env: ENV });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.data.NEON, "#D4FF00");
    assert.equal(body.data.INK_60, "rgba(10,10,10,0.6)");
    assert.equal(body.data.FONT, "'Archivo', sans-serif");
  } finally { restore(); }
});

test("tokens PUT commits the updated value", async () => {
  const { puts, restore } = mockGitHub({ "src/data/tokens.js": TOKENS_JS });
  try {
    const request = await authedRequest("https://x/api/admin/tokens", {
      method: "PUT",
      body: JSON.stringify({ tokenName: "NEON", value: "#00FFD4" }),
    });
    const res = await tokensEndpoint.onRequestPut({ request, env: ENV });
    const body = await res.json();
    assert.equal(body.ok, true, JSON.stringify(body));
    assert.equal(puts.length, 1);
    const committed = Buffer.from(puts[0].body.content, "base64").toString("utf8");
    assert.match(committed, /export const NEON = "#00FFD4";/);
    assert.match(committed, /export const INK_60 = "rgba\(10,10,10,0\.6\)";/);
  } finally { restore(); }
});

test("tokens PUT rejects a non-color value for a color token", async () => {
  const { puts, restore } = mockGitHub({ "src/data/tokens.js": TOKENS_JS });
  try {
    const request = await authedRequest("https://x/api/admin/tokens", {
      method: "PUT",
      body: JSON.stringify({ tokenName: "NEON", value: "blueish" }),
    });
    const res = await tokensEndpoint.onRequestPut({ request, env: ENV });
    const body = await res.json();
    assert.equal(res.status, 400);
    assert.equal(body.ok, false);
    assert.equal(puts.length, 0); // nothing committed
  } finally { restore(); }
});

test("tokens endpoints reject unauthenticated requests", async () => {
  const { restore } = mockGitHub({ "src/data/tokens.js": TOKENS_JS });
  try {
    const res = await tokensEndpoint.onRequestGet({ request: new Request("https://x/api/admin/tokens"), env: ENV });
    assert.equal(res.status, 401);
  } finally { restore(); }
});

/* ── section-palettes endpoint ── */

test("palettes GET returns the parsed object (no double-parse)", async () => {
  const { restore } = mockGitHub({ "src/data/section-palettes.json": PALETTES_JSON });
  try {
    const request = await authedRequest("https://x/api/admin/section-palettes");
    const res = await palettesEndpoint.onRequestGet({ request, env: ENV });
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.equal(body.ok, true);
    assert.equal(body.data.faq.schemes.light.tokens.background, "SECONDARY_BG");
  } finally { restore(); }
});

test("palettes PUT updates only the target scheme and commits", async () => {
  const { puts, restore } = mockGitHub({ "src/data/section-palettes.json": PALETTES_JSON });
  try {
    const request = await authedRequest("https://x/api/admin/section-palettes", {
      method: "PUT",
      body: JSON.stringify({
        sectionType: "faq", schemeId: "light",
        tokens: { background: "#ECECEE", text: "INK" },
      }),
    });
    const res = await palettesEndpoint.onRequestPut({ request, env: ENV });
    const body = await res.json();
    assert.equal(body.ok, true, JSON.stringify(body));
    assert.equal(puts.length, 1);
    const committed = JSON.parse(Buffer.from(puts[0].body.content, "base64").toString("utf8"));
    assert.equal(committed.faq.schemes.light.tokens.background, "#ECECEE");
    assert.equal(committed._comment, "test"); // untouched keys survive
  } finally { restore(); }
});

test("palettes PUT rejects unknown scheme and bad slot values", async () => {
  const { puts, restore } = mockGitHub({ "src/data/section-palettes.json": PALETTES_JSON });
  try {
    for (const payload of [
      { sectionType: "faq", schemeId: "nope", tokens: { a: "b" } },
      { sectionType: "faq", schemeId: "light", tokens: { "bad slot!": "x" } },
      { sectionType: "faq", schemeId: "light", tokens: { background: "" } },
    ]) {
      const request = await authedRequest("https://x/api/admin/section-palettes", {
        method: "PUT", body: JSON.stringify(payload),
      });
      const res = await palettesEndpoint.onRequestPut({ request, env: ENV });
      assert.equal(res.status, 400, JSON.stringify(payload));
    }
    assert.equal(puts.length, 0);
  } finally { restore(); }
});
