/* Cases CRUD endpoint — manages tracked legal cases in the briefing repo.

   Cases are stored as markdown files (cases/<slug>.md) with YAML front-matter,
   plus corresponding JSON data files (cases/data/<slug>.json) for live
   docket/claims info (refreshed by the briefing pipeline; not touched here on
   create beyond seeding).

   Reads/writes target the BRIEFING repo (daily-briefing-site) on its own
   branch (default "main"), independent of the main site's GITHUB_BRANCH.

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

const REPO_BRIEFING = "turnpagedigital/daily-briefing-site";
function briefingBranch(env) { return env.GITHUB_BRIEFING_BRANCH || "main"; }

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
  "slug", "display_name", "type", "emoji", "status", "topics",
  "case", "docket_source", "claims_administrator", "scan_guidance",
]);

/* ── Validation & normalization ─────────────────────────────────────────── */

function isValidSlug(slug) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length > 0;
}

function normalizeCase(raw) {
  const c = raw || {};
  const cs = c.case || {};
  const ds = c.docket_source || {};
  const ca = c.claims_administrator;
  return {
    slug: (c.slug || "").trim(),
    display_name: (c.display_name || "").trim(),
    type: c.type || "case",
    emoji: (c.emoji || "⚖️").trim() || "⚖️",
    status: (c.status || "").trim(),
    topics: Array.isArray(c.topics)
      ? c.topics.map(t => String(t).trim()).filter(Boolean)
      : [],
    case: {
      parties: (cs.parties || "").trim(),
      court: (cs.court || "").trim(),
      court_id: (cs.court_id || "").trim(),
      case_number: (cs.case_number || "").trim(),
      judge: (cs.judge || "").trim(),
    },
    docket_source: {
      type: ds.type === "courtlistener" ? "courtlistener" : "manual",
      docket_id: ds.docket_id ? String(ds.docket_id).trim() : null,
      url: (ds.url || "").trim(),
      awaiting_sync: ds.awaiting_sync === true,
    },
    claims_administrator: ca
      ? {
          name: (ca.name || "").trim(),
          url: (ca.url || "").trim(),
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
  if (!c.case.court) return "case.court is required";
  if (!c.case.case_number) return "case.case_number is required";
  if (!c.case.judge) return "case.judge is required";
  if (c.docket_source.type === "courtlistener" && !c.docket_source.docket_id) {
    return "docket_id is required when type is 'courtlistener'";
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
  y += `emoji: ${c.emoji}\n`;
  if (c.status) y += `status: ${dq(c.status)}\n`;
  y += "topics:\n";
  for (const t of c.topics) y += `  - ${t}\n`;
  y += "case:\n";
  y += `  parties: ${dq(c.case.parties)}\n`;
  y += `  court: ${dq(c.case.court)}\n`;
  if (c.case.court_id) y += `  court_id: ${c.case.court_id}\n`;
  y += `  case_number: ${dq(c.case.case_number)}\n`;
  y += `  judge: ${dq(c.case.judge)}\n`;
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

  const claims = caB && (subScalar(caB, "name") || subScalar(caB, "url"))
    ? {
        name: subScalar(caB, "name") || "",
        url: subScalar(caB, "url") || "",
        key_dates_url: subScalar(caB, "key_dates_url") || "",
      }
    : null;

  return {
    slug: top("slug") || fallbackSlug,
    display_name: top("display_name") || fallbackSlug,
    type: top("type") || "case",
    emoji: top("emoji") || "⚖️",
    status: top("status") || "",
    topics: byKey["topics"] ? listItems(byKey["topics"]) : [],
    case: {
      parties: caseB ? (subScalar(caseB, "parties") || "") : "",
      court: caseB ? (subScalar(caseB, "court") || "") : "",
      court_id: caseB ? (subScalar(caseB, "court_id") || "") : "",
      case_number: caseB ? (subScalar(caseB, "case_number") || "") : "",
      judge: caseB ? (subScalar(caseB, "judge") || "") : "",
    },
    docket_source: {
      type: dsB ? (subScalar(dsB, "type") || "manual") : "manual",
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
      court_id: c.case.court_id,
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
  const dir = await listDirFromGitHub(env, "cases", REPO_BRIEFING, branch);
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
    const r = await getFileFromGitHub(env, f.path, null, REPO_BRIEFING, branch);
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

    const mdPath = `cases/${c.slug}.md`;
    const exists = await getFileSha(env, mdPath, REPO_BRIEFING, branch);
    if (exists) return jsonResponse({ ok: false, error: "A case with that slug already exists" }, 400);

    const md = buildCaseMarkdown(c, "", "");
    const mdRes = await commitFileToGitHub(env, mdPath, md, null, `Add case: ${c.display_name}`, REPO_BRIEFING, branch);
    if (!mdRes.ok) return jsonResponse({ ok: false, error: `Failed to create case file: ${mdRes.error}` }, 500);

    const jsonPath = `cases/data/${c.slug}.json`;
    const jsonRes = await commitFileToGitHub(
      env, jsonPath, JSON.stringify(generateSeedJson(c), null, 2) + "\n", null,
      `Add case data: ${c.display_name}`, REPO_BRIEFING, branch
    );
    if (!jsonRes.ok) return jsonResponse({ ok: false, error: `Failed to create case data: ${jsonRes.error}` }, 500);

    return jsonResponse({ ok: true, slug: c.slug });
  }

  if (method === "PUT") {
    const c = normalizeCase(await request.json());
    const err = validateCase(c);
    if (err) return jsonResponse({ ok: false, error: err }, 400);

    const mdPath = `cases/${c.slug}.md`;
    const existing = await getFileFromGitHub(env, mdPath, null, REPO_BRIEFING, branch);
    if (!existing.ok) return jsonResponse({ ok: false, error: "Case not found" }, 404);

    // Preserve unmodeled front-matter blocks + the markdown body verbatim.
    const prev = parseCaseMd(existing.text, c.slug);
    const md = buildCaseMarkdown(c, prev._preserved, prev._body);
    const mdRes = await commitFileToGitHub(env, mdPath, md, existing.sha, `Update case: ${c.display_name}`, REPO_BRIEFING, branch);
    if (!mdRes.ok) return jsonResponse({ ok: false, error: `Failed to update case file: ${mdRes.error}` }, 500);

    // Merge the modeled metadata into the data JSON, preserving live docket + coverage.
    const jsonPath = `cases/data/${c.slug}.json`;
    const cur = await getFileFromGitHub(env, jsonPath, null, REPO_BRIEFING, branch);
    if (cur.ok && cur.data) {
      const updated = generateSeedJson(c);
      if (cur.data.docket && cur.data.docket.source !== "seed") {
        updated.docket = { ...updated.docket, ...cur.data.docket };
      }
      if (Array.isArray(cur.data.coverage)) updated.coverage = cur.data.coverage;
      const jr = await commitFileToGitHub(
        env, jsonPath, JSON.stringify(updated, null, 2) + "\n", cur.sha,
        `Update case data: ${c.display_name}`, REPO_BRIEFING, branch
      );
      if (!jr.ok) return jsonResponse({ ok: false, error: `Failed to update case data: ${jr.error}` }, 500);
    }

    return jsonResponse({ ok: true, slug: c.slug });
  }

  if (method === "DELETE") {
    const slug = new URL(request.url).searchParams.get("slug");
    if (!slug || !isValidSlug(slug)) {
      return jsonResponse({ ok: false, error: "Invalid slug parameter" }, 400);
    }
    const mdPath = `cases/${slug}.md`;
    const jsonPath = `cases/data/${slug}.json`;
    const mdSha = await getFileSha(env, mdPath, REPO_BRIEFING, branch);
    if (!mdSha) return jsonResponse({ ok: false, error: "Case not found" }, 404);

    const del = await deleteFileFromGitHub(env, mdPath, mdSha, `Remove case: ${slug}`, REPO_BRIEFING, branch);
    if (!del.ok) return jsonResponse({ ok: false, error: "Failed to delete case file" }, 500);

    const jsonSha = await getFileSha(env, jsonPath, REPO_BRIEFING, branch);
    if (jsonSha) {
      await deleteFileFromGitHub(env, jsonPath, jsonSha, `Remove case data: ${slug}`, REPO_BRIEFING, branch);
    }
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
}
