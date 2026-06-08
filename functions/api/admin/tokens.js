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
  if (typeof tokenName !== "string" || !tokenName) {
    return jsonResponse({ ok: false, error: "tokenName must be a non-empty string" }, 400);
  }
  if (typeof value !== "string") {
    return jsonResponse({ ok: false, error: "value must be a string" }, 400);
  }

  // Fetch current file
  const current = await getFileFromGitHub(env, TOKENS_PATH);
  if (!current.ok) return jsonResponse({ ok: false, error: current.error }, 502);

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
 * Parse token exports from tokens.js content
 * Returns object like { NEON: "#D4FF00", ERROR: "#c44", ... }
 */
function parseTokensFromContent(content) {
  const tokens = {};

  // Match lines like: export const NEON = "#D4FF00";
  const exportRegex = /export\s+const\s+([A-Z_]+)\s*=\s*"([^"]*)";/g;
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    tokens[match[1]] = match[2];
  }

  // Also match lines like: export const NEON = 'value';
  const exportRegexSingle = /export\s+const\s+([A-Z_]+)\s*=\s*'([^']*)';/g;
  while ((match = exportRegexSingle.exec(content)) !== null) {
    tokens[match[1]] = match[2];
  }

  // Match rgba() values: export const NEON_SOFT = "rgba(212,255,0,0.12)";
  const exportRegexRgba = /export\s+const\s+([A-Z_]+)\s*=\s*"(rgba\([^)]+\))";/g;
  while ((match = exportRegexRgba.exec(content)) !== null) {
    tokens[match[1]] = match[2];
  }

  return Object.keys(tokens).length > 0 ? tokens : null;
}

/**
 * Update a specific token in tokens.js content
 * Handles quoted strings, both single and double quotes
 */
function updateTokenInContent(content, tokenName, newValue) {
  // Escape special regex characters in newValue
  const escapedValue = newValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
      updated = updated.replace(
        pattern,
        `$1"${newValue}"$3`
      );
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
