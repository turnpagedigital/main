/* Cases CRUD endpoint — manages tracked legal cases in the briefing repo.

   Cases are stored as markdown files (cases/<slug>.md) with YAML front-matter,
   plus corresponding JSON data files (cases/data/<slug>.json) for live
   docket/claims info (refreshed by the briefing pipeline; not touched here on
   create beyond seeding).

   The briefing system was consolidated into THIS repo under
   briefing-generator/ (June 2026) — reads/writes target
   briefing-generator/cases/ on the branch the pipeline commits to
   (default "main", the repo's default branch, where the daily workflow
   runs), independent of the main site's GITHUB_BRANCH.

   On update we regenerate only the MODELED front-matter fields and re-attach
   any unmodeled blocks (e.g. research:, alert_cadence:) and the markdown body
   verbatim, so editing a case in admin never drops pipeline metadata.
*/

import { isAuthed, jsonResponse } from "./_utils.js";
import {
  getFileFromGitHub,
  commitFileToGitHub,
  deleteFileFromGitHub,
  getFileSha,
  listDirFromGitHub,
} from "./_github.js";

function briefingRepo(env) { return env.GITHUB_BRIEFING_REPO || env.GITHUB_REPO || "turnpagedigital/main"; }
function briefingBranch(env) { return env.GITHUB_BRIEFING_BRANCH || "main"; }
const CASES_DIR = "briefing-generator/cases";

// Pill palette — matches inject_cases.py _PILL_PALETTE (bg colors only)
const PILL_PALETTE = ["#D4FF00", "#60A5FA", "#FB923C", "#C084FC", "#34D399", "#F87171"];

function shortName(displayName) {
  const m = (displayName || "").match(/^(.+?)\s+vs?\.\s+/i);
  if (m) {
    const words = m[1].trim().split(/\s+/);
    return words.slice(0, 2).join(" ");
  }
  const words = (displayName || "").trim().split(/\s+/);
  return words.slice(0, 2).join(" ");
}

// Updates cases/data/_manifest.json (lightweight case index consumed by unified-docket.js).
// Non-fatal: if this fails the main case write already succeeded; manifest refreshes on next pipeline run.
async function updateManifest(env, action, c) {
  try {
    const branch = briefingBranch(env);
    const repo = briefingRepo(env);
    const manifestPath = `${CASES_DIR}/data/_manifest.json`;
    const cur = await getFileFromGitHub(env, manifestPath, null, repo, branch);
    let manifest = (cur.ok && Array.isArray(cur.data)) ? cur.data : [];

    if (action === "remove") {
      manifest = manifest.filter(m => m.slug !== c.slug);
    } else {
      const idx = manifest.findIndex(m => m.slug === c.slug);
      const colorIdx = idx >= 0 ? idx : manifest.length;
      const entry = {
        slug: c.slug,
        display_name: c.display_name,
        short_name: shortName(c.display_name),
        docket_url: (c.docket_source && c.docket_source.url) || "",
        court: (c.case && c.case.court) || "",
        default_color: idx >= 0
          ? (manifest[idx].default_color || PILL_PALETTE[colorIdx % PILL_PALETTE.length])
          : PILL_PALETTE[colorIdx % PILL_PALETTE.length],
      };
      if (idx >= 0) manifest[idx] = entry;
      else manifest.push(entry);
    }

    await commitFileToGitHub(
      env, manifestPath,
      JSON.stringify(manifest, null, 2) + "\n",
      cur.ok ? cur.sha : null,
      (action === "remove" ? "Remove from" : "Update") + " case manifest: " + c.slug,
      repo, branch
    );
  } catch (e) {
    console.error("cases: manifest update non-fatal error:", String(e));
  }
}

// 6 default themes — returned for convenience; the UI prefers /api/admin/themes.
const TOPICS = [
  { slug: "rewind-tariffs", display: "Tariffs / Trade", emoji: "⚖️" },
  { slug: "llm-class-action", display: "LLM / Copyright", emoji: "🤖" },
  { slug: "crypto-insolvency", display: "Crypto Insolvency", emoji: "🪙" },
  { slug: "fraud-recovery", display: "Ponzi / Fraud Recovery", emoji: "🕵️" },
  { slug: "billion-dollar-class-actions", display: "$1B+ Class Actions & Mass Arb", emoji: "💰" },
  { slug: "bankruptcy-creditor-rights", display: "Bankruptcy Creditor Rights", emoji: "📜" },
];

const MODELED_KEYS = new Set([
  "slug", "display_name", "type", "status", "topics",
  "case", "docket_source", "claims_administrator", "scan_guidance",
]);

const CASE_STATES = ["active", "draft", "archived"];
function coerceStatus(s) {
  return CASE_STATES.includes(s) ? s : "active"; // legacy free-text posture → treat as active
}

// Derive a human-ish administrator name from a URL host (best-effort).
function deriveClaimsName(url) {
  if (!url) return "";
  try {
    const host = String(url).replace(/^https?:\/\//i, "").split("/")[0].replace(/^www\./i, "");
    const parts = host.split(".");
    const sld = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    return sld.replace(/[-_]+/g, " ").trim()
      .split(" ").filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  } catch { return ""; }
}

/* ── Validation & normalization ─────────────────────────────────────────── */

function isValidSlug(slug) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length > 0;
}

function normalizeCase(raw) {
  const c = raw || {};
  const cs = c.case || {};
  const ds = c.docket_source || {};
  const ca = c.claims_administrator;
  const caUrl = ca ? (ca.url || "").trim() : "";
  return {
    slug: (c.slug || "").trim(),
    display_name: (c.display_name || "").trim(),
    type: c.type || "case",
    status: coerceStatus(c.status),
    topics: Array.isArray(c.topics)
      ? c.topics.map(t => String(t).trim()).filter(Boolean)
      : [],
    case: {
      parties: (cs.parties || "").trim(),
      court: (cs.court || "").trim(),
      case_number: (cs.case_number || "").trim(),
      judge: (cs.judge || "").trim(),
    },
    docket_source: {
      type: ds.type === "claims_agent" ? "claims_agent" : "courtlistener",
      docket_id: ds.docket_id ? String(ds.docket_id).trim() : null,
      url: (ds.url || "").trim(),
      awaiting_sync: ds.awaiting_sync === true,
    },
    claims_administrator: ca && (caUrl || ca.name)
      ? {
          // Name is derived from the URL (falls back to any provided name).
          name: deriveClaimsName(caUrl) || (ca.name || "").trim(),
          url: caUrl,
          key_dates_url: (ca.key_dates_url || "").trim(),
        }
      : null,
    scan_guidance: typeof c.scan_guidance === "string" ? c.scan_guidance : "",
  };
}

function validateCase(c) {
  if (!c.slug) return "slug is required";
  if (!isValidSlug(c.slug)) return "slug must be kebab-case (lowercase, hyphens, alphanumerics only)";
  if (!c.display_name) return "display_name is required";
  if (c.topics.length === 0) return "tag at least one theme";
  if (!c.case.parties) return "case.parties is required";
  if (c.docket_source.type === "courtlistener") {
    if (!c.docket_source.docket_id) return "docket ID is required for a CourtListener docket";
    if (!c.case.court) return "court is required";
    if (!c.case.case_number) return "case number is required";
    if (!c.case.judge) return "judge is required";
  }
  if (c.docket_source.type === "claims_agent") {
    if (!c.claims_administrator || !c.claims_administrator.url) {
      return "a claims-agent URL is required";
    }
  }
  return null;
}

/* ── YAML front-matter: generation ──────────────────────────────────────── */

function dq(s) {
  return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n") + '"';
}

function frontMatterBody(c) {
  let y = "";
  y += `slug: ${c.slug}\n`;
  y += `display_name: ${c.display_name}\n`;
  y += `type: ${c.type}\n`;
  y += `status: ${c.status}\n`;
  y += "topics:\n";
  for (const t of c.topics) y += `  - ${t}\n`;
  y += "case:\n";
  y += `  parties: ${dq(c.case.parties)}\n`;
  if (c.case.court) y += `  court: ${dq(c.case.court)}\n`;
  if (c.case.case_number) y += `  case_number: ${dq(c.case.case_number)}\n`;
  if (c.case.judge) y += `  judge: ${dq(c.case.judge)}\n`;
  y += "docket_source:\n";
  y += `  type: ${c.docket_source.type}\n`;
  if (c.docket_source.docket_id) y += `  docket_id: ${c.docket_source.docket_id}\n`;
  if (c.docket_source.url) y += `  url: ${dq(c.docket_source.url)}\n`;
  if (c.docket_source.awaiting_sync) y += `  awaiting_sync: true\n`;
  if (c.claims_administrator) {
    y += "claims_administrator:\n";
    y += `  name: ${dq(c.claims_administrator.name)}\n`;
    y += `  url: ${dq(c.claims_administrator.url)}\n`;
    y += `  key_dates_url: ${dq(c.claims_administrator.key_dates_url)}\n`;
  }
  if (c.scan_guidance) y += `scan_guidance: ${dq(c.scan_guidance)}\n`;
  return y;
}

function buildCaseMarkdown(c, preserved, body) {
  let fm = frontMatterBody(c);
  if (preserved && preserved.trim()) fm += preserved.replace(/\n*$/, "") + "\n";
  let md = "---\n" + fm + "---\n";
  if (body && body.trim()) md += body.startsWith("\n") ? body : "\n" + body;
  return md;
}

/* ── YAML front-matter: parsing (tolerant, calibrated to existing cases) ─── */

function splitFrontMatter(md) {
  const m = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) return { fm: "", body: md };
  return { fm: m[1], body: m[2] || "" };
}

function topLevelBlocks(fm) {
  const lines = fm.split("\n");
  const blocks = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(/^([A-Za-z_][\w-]*)\s*:/);
    if (m) {
      if (cur) blocks.push(cur);
      cur = { key: m[1], lines: [line] };
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  if (cur) blocks.push(cur);
  return blocks;
}

function stripInlineComment(v) {
  if (v.startsWith('"') || v.startsWith("'")) return v;
  const i = v.search(/\s#/);
  return i === -1 ? v : v.slice(0, i);
}
function unquote(v) {
  v = v.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v;
}
function scalarOf(line) {
  const idx = line.indexOf(":");
  return unquote(stripInlineComment(line.slice(idx + 1).trim()).trim());
}
function subScalar(block, key) {
  const re = new RegExp("^\\s+" + key + "\\s*:(.*)$");
  for (const l of block.lines) {
    const m = l.match(re);
    if (m) return unquote(stripInlineComment(m[1].trim()).trim());
  }
  return null;
}
function listItems(block) {
  const out = [];
  for (let i = 1; i < block.lines.length; i++) {
    const m = block.lines[i].match(/^\s*-\s*(.+?)\s*$/);
    if (m) out.push(unquote(stripInlineComment(m[1].trim()).trim()));
  }
  return out;
}
function unescapeDq(v) {
  return v.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function parseCaseMd(md, fallbackSlug) {
  const { fm, body } = splitFrontMatter(md);
  const blocks = topLevelBlocks(fm);
  const byKey = {};
  for (const b of blocks) if (!(b.key in byKey)) byKey[b.key] = b;

  const preserved = blocks
    .filter(b => !MODELED_KEYS.has(b.key))
    .map(b => b.lines.join("\n"))
    .join("\n");

  const top = (k) => (byKey[k] ? scalarOf(byKey[k].lines[0]) : "");
  const caseB = byKey["case"];
  const dsB = byKey["docket_source"];
  const caB = byKey["claims_administrator"];

  const caUrl = caB ? (subScalar(caB, "url") || "") : "";
  const claims = caB && (caUrl || subScalar(caB, "name"))
    ? {
        name: deriveClaimsName(caUrl) || subScalar(caB, "name") || "",
        url: caUrl,
        key_dates_url: subScalar(caB, "key_dates_url") || "",
      }
    : null;

  const dsType = dsB ? subScalar(dsB, "type") : "";

  return {
    slug: top("slug") || fallbackSlug,
    display_name: top("display_name") || fallbackSlug,
    type: top("type") || "case",
    status: coerceStatus(top("status") || ""),
    topics: byKey["topics"] ? listItems(byKey["topics"]) : [],
    case: {
      parties: caseB ? (subScalar(caseB, "parties") || "") : "",
      court: caseB ? (subScalar(caseB, "court") || "") : "",
      case_number: caseB ? (subScalar(caseB, "case_number") || "") : "",
      judge: caseB ? (subScalar(caseB, "judge") || "") : "",
    },
    docket_source: {
      type: dsType === "claims_agent" ? "claims_agent" : "courtlistener",
      docket_id: dsB ? (subScalar(dsB, "docket_id") || null) : null,
      url: dsB ? (subScalar(dsB, "url") || "") : "",
      awaiting_sync: dsB ? /^(true|yes|1|on)$/i.test(subScalar(dsB, "awaiting_sync") || "") : false,
    },
    claims_administrator: claims,
    scan_guidance: byKey["scan_guidance"] ? unescapeDq(top("scan_guidance")) : "",
    _preserved: preserved,
    _body: body,
  };
}

/* ── JSON seed (for new cases) ──────────────────────────────────────────── */

function generateSeedJson(c) {
  const docketId = c.docket_source.docket_id;
  const awaiting = c.docket_source.awaiting_sync || !docketId;
  return {
    case: {
      slug: c.slug,
      display_name: c.display_name,
      case_name: c.case.parties,
      court: c.case.court,
      case_number: c.case.case_number,
      judge: c.case.judge,
      docket_id: docketId || null,
      status: c.status,
    },
    docket: {
      source: awaiting ? "seed" : "courtlistener",
      awaiting_sync: awaiting,
      docket_url: c.docket_source.url || null,
      new_in_72h: 0,
      recent: [],
      entries: [],
    },
    claims_administrator: c.claims_administrator,
    coverage: [],
  };
}

/* ── List ───────────────────────────────────────────────────────────────── */

async function listCases(env) {
  const branch = briefingBranch(env);
  const dir = await listDirFromGitHub(env, CASES_DIR, briefingRepo(env), branch);
  if (!dir.ok) {
    // Don't hard-fail the tab if the dir/repo is unreachable — surface a warning.
    return { ok: true, cases: [], topics: TOPICS, warning: dir.error };
  }
  const mdFiles = dir.entries.filter(e =>
    e.type === "file" && e.name.endsWith(".md") &&
    e.name !== "README.md" && !e.name.endsWith("_disabled.md")
  );
  const cases = [];
  for (const f of mdFiles) {
    const r = await getFileFromGitHub(env, f.path, null, briefingRepo(env), branch);
    if (!r.ok) continue;
    const slug = f.name.replace(/\.md$/, "");
    const parsed = parseCaseMd(r.text, slug);
    const { _preserved, _body, ...clean } = parsed;
    cases.push(clean);
  }
  cases.sort((a, b) => a.display_name.localeCompare(b.display_name));
  return { ok: true, cases, topics: TOPICS };
}

/* ── Handler ────────────────────────────────────────────────────────────── */

export async function onRequest({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  const method = request.method.toUpperCase();
  const branch = briefingBranch(env);

  if (method === "GET") {
    return jsonResponse(await listCases(env));
  }

  if (method === "POST") {
    const c = normalizeCase(await request.json());
    const err = validateCase(c);
    if (err) return jsonResponse({ ok: false, error: err }, 400);

    const mdPath = `${CASES_DIR}/${c.slug}.md`;
    const exists = await getFileSha(env, mdPath, briefingRepo(env), branch);
    if (exists) return jsonResponse({ ok: false, error: "A case with that slug already exists" }, 400);

    const md = buildCaseMarkdown(c, "", "");
    const mdRes = await commitFileToGitHub(env, mdPath, md, null, `Add case: ${c.display_name}`, briefingRepo(env), branch);
    if (!mdRes.ok) return jsonResponse({ ok: false, error: `Failed to create case file: ${mdRes.error}` }, 500);

    const jsonPath = `${CASES_DIR}/data/${c.slug}.json`;
    const jsonRes = await commitFileToGitHub(
      env, jsonPath, JSON.stringify(generateSeedJson(c), null, 2) + "\n", null,
      `Add case data: ${c.display_name}`, briefingRepo(env), branch
    );
    if (!jsonRes.ok) return jsonResponse({ ok: false, error: `Failed to create case data: ${jsonRes.error}` }, 500);

    await updateManifest(env, "add", c);
    return jsonResponse({ ok: true, slug: c.slug });
  }

  if (method === "PUT") {
    const c = normalizeCase(await request.json());
    const err = validateCase(c);
    if (err) return jsonResponse({ ok: false, error: err }, 400);

    const mdPath = `${CASES_DIR}/${c.slug}.md`;
    const existing = await getFileFromGitHub(env, mdPath, null, briefingRepo(env), branch);
    if (!existing.ok) return jsonResponse({ ok: false, error: "Case not found" }, 404);

    // Preserve unmodeled front-matter blocks + the markdown body verbatim.
    const prev = parseCaseMd(existing.text, c.slug);
    const md = buildCaseMarkdown(c, prev._preserved, prev._body);
    const mdRes = await commitFileToGitHub(env, mdPath, md, existing.sha, `Update case: ${c.display_name}`, briefingRepo(env), branch);
    if (!mdRes.ok) return jsonResponse({ ok: false, error: `Failed to update case file: ${mdRes.error}` }, 500);

    // Merge the modeled metadata into the data JSON, preserving live docket + coverage.
    const jsonPath = `${CASES_DIR}/data/${c.slug}.json`;
    const cur = await getFileFromGitHub(env, jsonPath, null, briefingRepo(env), branch);
    if (cur.ok && cur.data) {
      const updated = generateSeedJson(c);
      if (cur.data.docket && cur.data.docket.source !== "seed") {
        updated.docket = { ...updated.docket, ...cur.data.docket };
      }
      if (Array.isArray(cur.data.coverage)) updated.coverage = cur.data.coverage;
      const jr = await commitFileToGitHub(
        env, jsonPath, JSON.stringify(updated, null, 2) + "\n", cur.sha,
        `Update case data: ${c.display_name}`, briefingRepo(env), branch
      );
      if (!jr.ok) return jsonResponse({ ok: false, error: `Failed to update case data: ${jr.error}` }, 500);
    }

    await updateManifest(env, "update", c);
    return jsonResponse({ ok: true, slug: c.slug });
  }

  if (method === "DELETE") {
    const slug = new URL(request.url).searchParams.get("slug");
    if (!slug || !isValidSlug(slug)) {
      return jsonResponse({ ok: false, error: "Invalid slug parameter" }, 400);
    }
    const mdPath = `${CASES_DIR}/${slug}.md`;
    const jsonPath = `${CASES_DIR}/data/${slug}.json`;
    const mdSha = await getFileSha(env, mdPath, briefingRepo(env), branch);
    if (!mdSha) return jsonResponse({ ok: false, error: "Case not found" }, 404);

    const del = await deleteFileFromGitHub(env, mdPath, mdSha, `Remove case: ${slug}`, briefingRepo(env), branch);
    if (!del.ok) return jsonResponse({ ok: false, error: "Failed to delete case file" }, 500);

    const jsonSha = await getFileSha(env, jsonPath, briefingRepo(env), branch);
    if (jsonSha) {
      await deleteFileFromGitHub(env, jsonPath, jsonSha, `Remove case data: ${slug}`, briefingRepo(env), branch);
    }
    await updateManifest(env, "remove", { slug });
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
}
