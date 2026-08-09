/* functions/intel/api/briefing-groups.js — case groups for briefing purposes.

   A briefing group consolidates several tracked cases (e.g. the Hachette
   suits) into ONE daily briefing and ONE dashboard card: the generator
   aggregates activity across the members and writes a single briefing led by
   whichever members are actually moving. Groups are orthogonal to themes and
   to the dashboard's sort groupings.

   Storage: briefing-generator/briefing-groups.json on the briefing branch
   (where the pipeline reads it):
     { "groups": [{ id, name, members: [case slugs...] }] }

   GET → { ok, groups }
   PUT → { groups: [...] } — replaces the full list (the editor is small).
         Validates: kebab ids, non-empty names, ≥2 known-shape member slugs,
         no duplicate ids, and a member may belong to only ONE group.

   Gated by functions/intel/_middleware.js (admin session). */

import { jsonResponse } from "../../api/admin/_utils.js";
import { getFileFromGitHub, commitFilesToGitHub } from "../../api/admin/_github.js";

const JSON_PATH = "briefing-generator/briefing-groups.json";

function briefingRepo(env) { return env.GITHUB_BRIEFING_REPO || env.GITHUB_REPO || "turnpagedigital/main"; }
function briefingBranch(env) { return env.GITHUB_BRIEFING_BRANCH || "main"; }

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function loadStore(env) {
  const res = await getFileFromGitHub(env, JSON_PATH, null, briefingRepo(env), briefingBranch(env));
  if (res.ok && res.data && Array.isArray(res.data.groups)) return { groups: res.data.groups };
  return { groups: [] };
}

function validate(groups) {
  if (!Array.isArray(groups)) return "groups must be an array";
  const ids = new Set();
  const members = new Set();
  for (const g of groups) {
    if (!g || typeof g !== "object") return "invalid group entry";
    if (!KEBAB.test(String(g.id || ""))) return "group ids must be kebab-case";
    if (ids.has(g.id)) return `duplicate group id: ${g.id}`;
    ids.add(g.id);
    if (!String(g.name || "").trim()) return `group ${g.id} needs a name`;
    if (!Array.isArray(g.members) || g.members.length < 2) {
      return `group ${g.id} needs at least 2 member cases`;
    }
    for (const m of g.members) {
      if (!KEBAB.test(String(m || ""))) return `group ${g.id}: invalid member slug`;
      if (members.has(m)) return `case ${m} is in more than one group`;
      members.add(m);
    }
  }
  return null;
}

function clean(groups) {
  return groups.map((g) => ({
    id: String(g.id),
    name: String(g.name).trim().slice(0, 80),
    members: g.members.map(String),
  }));
}

export async function onRequestGet(context) {
  const store = await loadStore(context.env);
  return jsonResponse({ ok: true, groups: store.groups });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid JSON" }, 400);
  }
  const err = validate(body.groups);
  if (err) return jsonResponse({ ok: false, error: err }, 400);
  const groups = clean(body.groups);

  let res = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await commitFilesToGitHub(
      env,
      [{ path: JSON_PATH, content: JSON.stringify({ groups }, null, 2) + "\n" }],
      `Briefing groups: ${groups.length} group(s)`,
      briefingRepo(env),
      briefingBranch(env)
    );
    if (res.ok) break;
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  if (!res.ok) return jsonResponse({ ok: false, error: res.error || "commit failed" }, 502);
  return jsonResponse({ ok: true, groups });
}
