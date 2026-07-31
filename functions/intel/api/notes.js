/* functions/intel/api/notes.js — bookmarks + notes on docket entries.

   Storage is the repo (briefing-generator/intel-notes.json), same pattern as
   every other piece of site state, with a human-readable markdown mirror
   (intel-notes.md) regenerated in the same atomic commit — that mirror is the
   export surface for pulling notes into Google Docs or anywhere else.

   GET → { ok, entries: { "<slug>|<entryKey>": {bookmarked, note, updated_at,
           case_slug, case_name, entry_number, date_filed, snippet} } }
   PUT → { key, bookmarked, note, context: {case_slug, case_name,
           entry_number, date_filed, snippet} }
         Upserts ONE entry (removes it when both note and bookmark are empty),
         so two open tabs can't clobber each other's notes.

   Gated by functions/intel/_middleware.js (admin session). */

import { jsonResponse } from "../../api/admin/_utils.js";
import { getFileFromGitHub, commitFilesToGitHub } from "../../api/admin/_github.js";

const JSON_PATH = "briefing-generator/intel-notes.json";
const MD_PATH = "briefing-generator/intel-notes.md";

function briefingRepo(env) { return env.GITHUB_BRIEFING_REPO || env.GITHUB_REPO || "turnpagedigital/main"; }
function briefingBranch(env) { return env.GITHUB_BRIEFING_BRANCH || "main"; }

function cleanEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const note = typeof raw.note === "string" ? raw.note.slice(0, 20000) : "";
  const bookmarked = !!raw.bookmarked;
  const snooze = typeof raw.snooze_until === "string" && /^\d{4}-\d{2}-\d{2}T/.test(raw.snooze_until)
    ? raw.snooze_until.slice(0, 30) : "";
  const hidden = !!raw.hidden;
  const deletedAt = typeof raw.deleted_at === "string" && /^\d{4}-\d{2}-\d{2}T/.test(raw.deleted_at)
    ? raw.deleted_at.slice(0, 30) : "";
  if (!note.trim() && !bookmarked && !snooze && !hidden && !deletedAt) return null;
  return {
    bookmarked,
    note,
    snooze_until: snooze,
    hidden,
    deleted_at: deletedAt,
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at.slice(0, 40) : "",
    case_slug: String(raw.case_slug || "").slice(0, 60),
    case_name: String(raw.case_name || "").slice(0, 120),
    entry_number: Number.isFinite(Number(raw.entry_number)) && raw.entry_number !== null && raw.entry_number !== ""
      ? Number(raw.entry_number) : null,
    date_filed: String(raw.date_filed || "").slice(0, 10),
    snippet: String(raw.snippet || "").slice(0, 220),
    url: /^https?:\/\//.test(String(raw.url || "")) ? String(raw.url).slice(0, 300) : "",
  };
}

async function loadMap(env) {
  const res = await getFileFromGitHub(env, JSON_PATH, null, briefingRepo(env), briefingBranch(env));
  if (res.ok && res.data && typeof res.data.entries === "object" && res.data.entries) {
    return { entries: res.data.entries };
  }
  return { entries: {} };
}

function renderMarkdown(map) {
  const byCase = {};
  for (const [key, e] of Object.entries(map.entries)) {
    const name = e.case_name || e.case_slug || "Unknown case";
    (byCase[name] = byCase[name] || []).push({ key, ...e });
  }
  const lines = [
    "# Intel Docket Notes",
    "",
    `_Updated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC · ` +
    `auto-generated from the unified docket — edit on /intel/docket.html_`,
    "",
  ];
  for (const name of Object.keys(byCase).sort()) {
    lines.push(`## ${name}`, "");
    const items = byCase[name].sort((a, b) => (b.date_filed || "").localeCompare(a.date_filed || ""));
    for (const e of items) {
      const dkt = e.entry_number != null ? `Dkt. ${e.entry_number}` : "(no docket number)";
      const star = e.bookmarked ? " ★" : "";
      lines.push(`### ${dkt} — ${e.date_filed || "undated"}${star}`, "");
      if (e.snippet) lines.push(`> ${e.snippet}`, "");
      if (e.note && e.note.trim()) lines.push(e.note.trim(), "");
    }
  }
  if (!Object.keys(byCase).length) lines.push("_No notes yet._", "");
  return lines.join("\n") + "\n";
}

export async function onRequestGet(context) {
  const map = await loadMap(context.env);
  return jsonResponse({ ok: true, entries: map.entries });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid JSON" }, 400);
  }
  const key = String(body.key || "").slice(0, 220);
  if (!key || key.indexOf("|") === -1) {
    return jsonResponse({ ok: false, error: "a slug|entry key is required" }, 400);
  }

  const map = await loadMap(env);
  const entry = cleanEntry({
    ...(body.context || {}),
    bookmarked: body.bookmarked,
    note: body.note,
    snooze_until: body.snooze_until,
    hidden: body.hidden,
    deleted_at: body.deleted_at,
    updated_at: new Date().toISOString(),
  });
  if (entry) map.entries[key] = entry;
  else delete map.entries[key];

  // The sync bots commit to this branch constantly — retry the write a few
  // times so a ref race never silently swallows a bookmark.
  let res = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await commitFilesToGitHub(
      env,
      [
        { path: JSON_PATH, content: JSON.stringify(map, null, 2) + "\n" },
        { path: MD_PATH, content: renderMarkdown(map) },
      ],
      entry ? `Intel notes: ${key}` : `Intel notes: clear ${key}`,
      briefingRepo(env),
      briefingBranch(env)
    );
    if (res.ok) break;
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  if (!res.ok) return jsonResponse({ ok: false, error: res.error || "commit failed" }, 502);
  return jsonResponse({ ok: true, entries: map.entries });
}
