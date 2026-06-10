/**
 * Admin endpoint for updating design tokens
 * GET: Fetch all tokens from tokens.js
 * PUT: Update a single token value (color or other value)
 */

import { jsonResponse, isAuthed } from "./_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "./_github.js";

const TOKENS_PATH = "src/data/tokens.js";

export async function onRequestGet({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  const result = await getFileFromGitHub(env, TOKENS_PATH);
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

  // Parse tokens from the JavaScript file
  const tokens = parseTokensFromContent(result.data);
  if (!tokens) return jsonResponse({ ok: false, error: "Could not parse tokens.js" }, 500);

  return jsonResponse({ ok: true, data: tokens, sha: result.sha });
}

export async function onRequestPut({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Bad request" }, 400);
  }

  if (!body || typeof body !== "object") {
    return jsonResponse({ ok: false, error: "Invalid payload" }, 400);
  }

  const { tokenName, value } = body;
  if (typeof tokenName !== "string" || !/^[A-Z][A-Z0-9_]*$/.test(tokenName)) {
    return jsonResponse({ ok: false, error: "tokenName must be an UPPER_SNAKE token name" }, 400);
  }
  if (typeof value !== "string") {
    return jsonResponse({ ok: false, error: "value must be a string" }, 400);
  }

  // Fetch current file
  const current = await getFileFromGitHub(env, TOKENS_PATH);
  if (!current.ok) return jsonResponse({ ok: false, error: current.error }, 502);

  // Validate against the current value (color tokens must stay colors;
  // any value must be safe to embed in a quoted JS string)
  const existing = parseTokensFromContent(current.data) || {};
  const check = validateTokenValue(existing[tokenName], value);
  if (!check.ok) {
    return jsonResponse({ ok: false, error: check.error }, 400);
  }

  // Update the specific token
  const updated = updateTokenInContent(current.data, tokenName, value);
  if (!updated.success) {
    return jsonResponse({ ok: false, error: updated.error }, 400);
  }

  // Commit back to GitHub
  const result = await commitFileToGitHub(
    env,
    TOKENS_PATH,
    updated.content,
    current.sha,
    `Admin: update token ${tokenName}`
  );
  if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);

  return jsonResponse({ ok: true, commitSha: result.sha });
}

/**
 * Is the string a CSS color we support? (hex 3/4/6/8 digits, or rgb()/rgba())
 * Exported for unit tests.
 */
export function isValidCssColor(v) {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s)) return true;
  return /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+|1\.0+)\s*)?\)$/.test(s);
}

/**
 * Validate a proposed token value against the current one.
 * Two rules:
 * 1. Every value must be safely embeddable in a double-quoted JS string
 *    (no quotes, backslashes, or newlines — those would corrupt tokens.js
 *    and break the site build).
 * 2. If the current value is a color, the new value must be a valid color
 *    (so NEON can't silently become "blueish" or an empty string).
 * Exported for unit tests.
 */
export function validateTokenValue(currentValue, newValue) {
  if (typeof newValue !== "string" || newValue.trim().length === 0) {
    return { ok: false, error: "Value must be a non-empty string" };
  }
  if (newValue.length > 120) {
    return { ok: false, error: "Value too long (max 120 characters)" };
  }
  if (/["\\\r\n]/.test(newValue)) {
    return { ok: false, error: "Value may not contain quotes, backslashes, or line breaks" };
  }
  const currentIsColor =
    typeof currentValue === "string" &&
    (currentValue.startsWith("#") || /^rgba?\(/.test(currentValue));
  if (currentIsColor && !isValidCssColor(newValue)) {
    return { ok: false, error: "This is a color token — value must be a hex color like #D4FF00 or an rgba(…) value" };
  }
  return { ok: true };
}

/**
 * Parse token exports from tokens.js content
 * Returns object like { NEON: "#D4FF00", ERROR: "#c44", ... }
 * Exported for unit tests.
 */
export function parseTokensFromContent(content) {
  const tokens = {};

  // Match lines like: export const NEON = "#D4FF00";
  const exportRegex = /export\s+const\s+([A-Z][A-Z0-9_]*)\s*=\s*"([^"]*)";/g;
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    tokens[match[1]] = match[2];
  }

  // Also match lines like: export const NEON = 'value';
  const exportRegexSingle = /export\s+const\s+([A-Z][A-Z0-9_]*)\s*=\s*'([^']*)';/g;
  while ((match = exportRegexSingle.exec(content)) !== null) {
    tokens[match[1]] = match[2];
  }

  // Match rgba() values: export const NEON_SOFT = "rgba(212,255,0,0.12)";
  const exportRegexRgba = /export\s+const\s+([A-Z][A-Z0-9_]*)\s*=\s*"(rgba\([^)]+\))";/g;
  while ((match = exportRegexRgba.exec(content)) !== null) {
    tokens[match[1]] = match[2];
  }

  return Object.keys(tokens).length > 0 ? tokens : null;
}

/**
 * Update a specific token in tokens.js content
 * Handles quoted strings, both single and double quotes
 * Exported for unit tests.
 */
export function updateTokenInContent(content, tokenName, newValue) {
  // Try to match the token with various quote styles
  const patterns = [
    // Double quotes
    new RegExp(
      `(export\\s+const\\s+${tokenName}\\s*=\\s*)"([^"]*)"(;)`,
      "g"
    ),
    // Single quotes
    new RegExp(
      `(export\\s+const\\s+${tokenName}\\s*=\\s*)'([^']*)'(;)`,
      "g"
    ),
  ];

  let updated = content;
  let found = false;

  for (const pattern of patterns) {
    if (pattern.test(updated)) {
      // Replacer function so "$" sequences in newValue are taken literally
      updated = updated.replace(pattern, (_m, pre, _old, post) => `${pre}"${newValue}"${post}`);
      found = true;
      break;
    }
  }

  if (!found) {
    return {
      success: false,
      error: `Token "${tokenName}" not found in tokens.js`,
    };
  }

  return {
    success: true,
    content: updated,
  };
}
