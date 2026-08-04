/* Case export — GET ?slug=<case> streams a ZIP with everything about one case:

     <slug>/export.md        human-readable summary: case details, every note,
                             the full docket, coverage, events, document list
     <slug>/case.md          the raw config markdown (frontmatter + notes body)
     <slug>/data.json        the raw docket/coverage data file
     <slug>/documents/*      every uploaded PDF/document attached to the case

   The ZIP is built in-memory with STORED entries (no compression — PDFs are
   already compressed) so no library is needed. */

import { isAuthed, jsonResponse } from "./_utils.js";
import { getFileFromGitHub, getFileBase64FromGitHub } from "./_github.js";

function briefingRepo(env) { return env.GITHUB_BRIEFING_REPO || env.GITHUB_REPO || "turnpagedigital/main"; }
function briefingBranch(env) { return env.GITHUB_BRIEFING_BRANCH || "main"; }

/* ── minimal ZIP writer (STORED method) ─────────────────────────────────── */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function buildZip(entries) {
  // entries: [{ name: "path/in/zip", bytes: Uint8Array }]
  const enc = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

  const u16 = (v) => new Uint8Array([v & 0xff, (v >> 8) & 0xff]);
  const u32 = (v) => new Uint8Array([v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff]);

  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    const crc = crc32(e.bytes);
    const header = [
      u32(0x04034b50), u16(20), u16(0x0800 /* UTF-8 names */), u16(0 /* stored */),
      u16(dosTime), u16(dosDate), u32(crc), u32(e.bytes.length), u32(e.bytes.length),
      u16(nameBytes.length), u16(0),
    ];
    for (const part of header) chunks.push(part);
    chunks.push(nameBytes, e.bytes);
    central.push({ nameBytes, crc, size: e.bytes.length, offset });
    offset += header.reduce((n, p) => n + p.length, 0) + nameBytes.length + e.bytes.length;
  }

  const centralStart = offset;
  for (const c of central) {
    const rec = [
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0),
      u16(dosTime), u16(dosDate), u32(c.crc), u32(c.size), u32(c.size),
      u16(c.nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(c.offset),
    ];
    for (const part of rec) chunks.push(part);
    chunks.push(c.nameBytes);
    offset += rec.reduce((n, p) => n + p.length, 0) + c.nameBytes.length;
  }
  chunks.push(
    u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length),
    u32(offset - centralStart), u32(centralStart), u16(0)
  );

  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) { out.set(c, pos); pos += c.length; }
  return out;
}

/* ── export.md composition ──────────────────────────────────────────────── */

function mdEscapePipes(s) { return String(s || "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim(); }

function composeExportMd(slug, cfgText, data, notes, docs) {
  const d = data || {};
  const cse = d.case || {};
  const docket = d.docket || {};
  const lines = [];
  const today = new Date().toISOString().slice(0, 10);

  lines.push(`# ${cse.display_name || slug} — case export`);
  lines.push("");
  lines.push(`Exported ${today} from Turnpage Intelligence.`);
  lines.push("");
  lines.push("## Case");
  lines.push("");
  if (cse.case_name) lines.push(`- **Parties:** ${cse.case_name}`);
  if (cse.court) lines.push(`- **Court:** ${cse.court}`);
  if (cse.case_number) lines.push(`- **Case number:** ${cse.case_number}`);
  if (cse.judge) lines.push(`- **Judge:** ${cse.judge}`);
  if (cse.status) lines.push(`- **Status:** ${cse.status}`);
  if (docket.docket_url) lines.push(`- **Docket:** ${docket.docket_url}`);
  const ca = d.claims_administrator;
  if (ca && (ca.name || ca.url)) {
    lines.push(`- **Claims administrator:** ${ca.name || ""} ${ca.url || ""}`.trim());
    if (ca.key_dates_url) lines.push(`- **Key dates:** ${ca.key_dates_url}`);
  }

  if (notes.length) {
    lines.push("");
    lines.push("## Notes");
    lines.push("");
    for (const n of notes) {
      const ctx = n.context || {};
      const label = ctx.entry_label || ctx.description || n.key;
      lines.push(`### ${label}`);
      if (ctx.date) lines.push(`*${ctx.date}*`);
      lines.push("");
      lines.push(n.note || "(bookmarked, no note text)");
      lines.push("");
    }
  }

  const entries = docket.entries || [];
  if (entries.length) {
    lines.push("");
    lines.push(`## Docket (${entries.length} entries)`);
    lines.push("");
    lines.push("| Date | # | Description |");
    lines.push("|---|---|---|");
    for (const e of entries) {
      lines.push(`| ${e.date_filed || ""} | ${e.entry_number ?? ""} | ${mdEscapePipes(e.description)} |`);
    }
  }

  const coverage = d.coverage || [];
  if (coverage.length) {
    lines.push("");
    lines.push("## Coverage");
    lines.push("");
    for (const a of coverage) {
      lines.push(`- ${a.date || ""} — [${a.headline || a.title || "article"}](${a.url || ""}) (${a.source || ""})`);
      if (a.summary) lines.push(`  ${a.summary}`);
    }
  }

  const events = d.events || [];
  if (events.length) {
    lines.push("");
    lines.push("## Events");
    lines.push("");
    for (const ev of events) {
      lines.push(`- ${ev.date || ""} — ${ev.title || ""}${ev.kind ? ` (${ev.kind})` : ""}${ev.url ? ` ${ev.url}` : ""}`);
    }
  }

  if (docs.length) {
    lines.push("");
    lines.push("## Attached documents");
    lines.push("");
    for (const doc of docs) {
      lines.push(`- documents/${doc.zipName}${doc.title ? ` — ${doc.title}` : ""}`);
    }
  }

  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("The raw case configuration is in case.md; the full machine-readable data is in data.json.");
  lines.push("");
  return lines.join("\n");
}

/* ── handler ────────────────────────────────────────────────────────────── */

export async function onRequestGet({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  const slug = new URL(request.url).searchParams.get("slug") || "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return jsonResponse({ ok: false, error: "Invalid slug" }, 400);
  }
  const repo = briefingRepo(env);
  const branch = briefingBranch(env);
  const enc = new TextEncoder();
  const entries = [];

  const md = await getFileFromGitHub(env, `briefing-generator/cases/${slug}.md`, null, repo, branch);
  if (!md.ok) return jsonResponse({ ok: false, error: "Case not found" }, 404);
  entries.push({ name: `${slug}/case.md`, bytes: enc.encode(md.text) });

  const dataRes = await getFileFromGitHub(env, `briefing-generator/cases/data/${slug}.json`, null, repo, branch);
  const data = dataRes.ok ? dataRes.data : null;
  if (dataRes.ok) entries.push({ name: `${slug}/data.json`, bytes: enc.encode(dataRes.text) });

  // Notes for this case (keys are "<slug>|…")
  const notes = [];
  const notesRes = await getFileFromGitHub(env, "briefing-generator/intel-notes.json", null, repo, branch);
  if (notesRes.ok && notesRes.data) {
    const map = notesRes.data.notes || notesRes.data;
    for (const [key, v] of Object.entries(map)) {
      if ((key === slug || key.startsWith(slug + "|")) && v && typeof v === "object") {
        notes.push({ key, ...v });
      }
    }
  }

  // Attached documents (uploads.json docs keyed by "<slug>|…")
  const docs = [];
  const upRes = await getFileFromGitHub(env, "briefing-generator/uploads.json", null, repo, branch);
  if (upRes.ok && upRes.data && upRes.data.docs) {
    const seen = new Set();
    for (const [key, list] of Object.entries(upRes.data.docs)) {
      if (!(key === slug || key.startsWith(slug + "|"))) continue;
      for (const d of list || []) {
        if (!d || !d.path || !d.path.startsWith("briefing-generator/uploads/")) continue;
        let zipName = (d.name || d.path.split("/").pop() || "document.pdf").replace(/[^\w.\- ()]/g, "_");
        while (seen.has(zipName)) zipName = "_" + zipName;
        seen.add(zipName);
        docs.push({ ...d, zipName });
      }
    }
  }
  for (const doc of docs) {
    const bin = await getFileBase64FromGitHub(env, doc.path, repo, branch);
    if (!bin.ok) continue;
    const raw = atob(bin.contentBase64.replace(/\n/g, ""));
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    entries.push({ name: `${slug}/documents/${doc.zipName}`, bytes });
  }

  entries.unshift({
    name: `${slug}/export.md`,
    bytes: enc.encode(composeExportMd(slug, md.text, data, notes, docs)),
  });

  const zip = buildZip(entries);
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return new Response(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="case-${slug}-${stamp}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
