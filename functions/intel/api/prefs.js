/* functions/intel/api/prefs.js — roaming personalization for the intel pages.

   Case pill colors and saved case groups used to live only in the browser's
   localStorage, so they didn't follow Andrew across devices or survive a
   cleared browser. This endpoint persists them in the repo
   (briefing-generator/intel-prefs.json on the briefing branch) like every
   other piece of site state. Gated by functions/intel/_middleware.js.

   GET  → { ok, colors: {slug: {bg, fg}}, groups: [{name, slugs: []}],
            presets: [{bg, fg}] }   (the 12 swatches in the color popover)
   PUT  → same shape in; sanitized, committed via the GitHub Contents API.
*/

import { jsonResponse } from "../../api/admin/_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "../../api/admin/_github.js";

const PREFS_PATH = "briefing-generator/intel-prefs.json";

function briefingRepo(env) { return env.GITHUB_BRIEFING_REPO || env.GITHUB_REPO || "turnpagedigital/main"; }
function briefingBranch(env) { return env.GITHUB_BRIEFING_BRANCH || "main"; }

const HEX = /^#[0-9a-fA-F]{6}$/;

function sanitize(body) {
  const colors = {};
  const rawColors = body && typeof body.colors === "object" && body.colors ? body.colors : {};
  for (const [slug, c] of Object.entries(rawColors).slice(0, 50)) {
    if (!/^[a-z0-9-]{1,60}$/.test(slug) || !c || typeof c !== "object") continue;
    const entry = {};
    if (typeof c.bg === "string" && HEX.test(c.bg)) entry.bg = c.bg;
    if (typeof c.fg === "string" && HEX.test(c.fg)) entry.fg = c.fg;
    if (Object.keys(entry).length) colors[slug] = entry;
  }
  const groups = [];
  const rawGroups = Array.isArray(body && body.groups) ? body.groups : [];
  for (const g of rawGroups.slice(0, 30)) {
    if (!g || typeof g.name !== "string") continue;
    const name = g.name.trim().slice(0, 40);
    const slugs = (Array.isArray(g.slugs) ? g.slugs : [])
      .filter((s) => typeof s === "string" && /^[a-z0-9-]{1,60}$/.test(s))
      .slice(0, 50);
    if (name && slugs.length) groups.push({ name, slugs });
  }
  const presets = [];
  const rawPresets = Array.isArray(body && body.presets) ? body.presets : [];
  for (const p of rawPresets.slice(0, 12)) {
    if (p && typeof p.bg === "string" && HEX.test(p.bg)) {
      presets.push({ bg: p.bg, fg: typeof p.fg === "string" && HEX.test(p.fg) ? p.fg : "" });
    }
  }
  return { colors, groups, presets: presets.length === 12 ? presets : [] };
}

export async function onRequestGet(context) {
  const { env } = context;
  const res = await getFileFromGitHub(env, PREFS_PATH, null, briefingRepo(env), briefingBranch(env));
  if (!res.ok || !res.data || typeof res.data !== "object") {
    return jsonResponse({ ok: true, colors: {}, groups: [], presets: [] });
  }
  const clean = sanitize(res.data);
  return jsonResponse({ ok: true, colors: clean.colors, groups: clean.groups, presets: clean.presets });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid JSON" }, 400);
  }
  const clean = sanitize(body);
  const content = JSON.stringify(clean, null, 2) + "\n";
  const repo = briefingRepo(env);
  const branch = briefingBranch(env);

  // Two attempts: a bot may advance the branch between sha read and commit
  for (let attempt = 0; attempt < 2; attempt++) {
    const cur = await getFileFromGitHub(env, PREFS_PATH, null, repo, branch);
    if (cur.ok && cur.text === content) {
      return jsonResponse({ ok: true, unchanged: true });
    }
    const res = await commitFileToGitHub(
      env, PREFS_PATH, content,
      cur.ok ? cur.sha : null,
      "Intel prefs: update case colors/groups",
      repo, branch
    );
    if (res.ok) return jsonResponse({ ok: true });
  }
  return jsonResponse({ ok: false, error: "commit failed" }, 502);
}
