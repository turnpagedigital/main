/* functions/intel/api/upload.js — attach downloaded docket documents to rows.

   PDFs commit to briefing-generator/uploads/<safe-key>/<filename> (served
   statically at /intel/uploads/... behind the same auth gate) and are indexed
   in uploads.json keyed by the row's note key. The hourly pipeline extracts
   searchable text into the same index (scripts/extract_uploads.py), which the
   docket page folds into its search.

   GET    → { ok, docs: { "<noteKey>": [{name, path, size, uploaded_at, text}] } }
   PUT    → { key, filename, content_base64 } (PDF ≤ 15MB)
   DELETE → { key, path } */

import { jsonResponse } from "../../api/admin/_utils.js";
import { getFileFromGitHub, commitFilesToGitHub } from "../../api/admin/_github.js";

const INDEX_PATH = "briefing-generator/uploads.json";
const UPLOAD_DIR = "briefing-generator/uploads";
const MAX_BYTES = 15 * 1024 * 1024;

function briefingRepo(env) { return env.GITHUB_BRIEFING_REPO || env.GITHUB_REPO || "turnpagedigital/main"; }
function briefingBranch(env) { return env.GITHUB_BRIEFING_BRANCH || "main"; }

function safeSegment(s, max) {
  return String(s || "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, max);
}

async function loadIndex(env) {
  const res = await getFileFromGitHub(env, INDEX_PATH, null, briefingRepo(env), briefingBranch(env));
  return res.ok && res.data && typeof res.data.docs === "object" && res.data.docs
    ? { docs: res.data.docs } : { docs: {} };
}

export async function onRequestGet(context) {
  const idx = await loadIndex(context.env);
  return jsonResponse({ ok: true, docs: idx.docs });
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
  if (!key || key.indexOf("|") === -1) return jsonResponse({ ok: false, error: "row key required" }, 400);
  const rawName = String(body.filename || "document.pdf");
  if (!/\.pdf$/i.test(rawName)) return jsonResponse({ ok: false, error: "PDF files only" }, 400);
  const b64 = String(body.content_base64 || "");
  if (!b64) return jsonResponse({ ok: false, error: "file content required" }, 400);
  const approxBytes = Math.floor(b64.length * 3 / 4);
  if (approxBytes > MAX_BYTES) return jsonResponse({ ok: false, error: "file too large (15MB max)" }, 400);
  // PDF magic check on the first bytes
  try {
    if (!atob(b64.slice(0, 8)).startsWith("%PDF")) {
      return jsonResponse({ ok: false, error: "file does not look like a PDF" }, 400);
    }
  } catch {
    return jsonResponse({ ok: false, error: "invalid base64" }, 400);
  }

  const filename = safeSegment(rawName, 120) || "document.pdf";
  const keyDir = safeSegment(key, 100);
  const path = `${UPLOAD_DIR}/${keyDir}/${filename}`;
  const repo = briefingRepo(env);
  const branch = briefingBranch(env);

  let res = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const idx = await loadIndex(env);
    const list = (idx.docs[key] = idx.docs[key] || []).filter((d) => d.path !== path);
    list.push({
      name: rawName.slice(0, 140),
      path,
      size: approxBytes,
      uploaded_at: new Date().toISOString(),
      text: "",
    });
    idx.docs[key] = list;
    res = await commitFilesToGitHub(
      env,
      [
        { path, contentBase64: b64 },
        { path: INDEX_PATH, content: JSON.stringify(idx, null, 2) + "\n" },
      ],
      `Upload: ${filename} → ${key}`.slice(0, 72),
      repo, branch
    );
    if (res.ok) break;
    await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
  }
  if (!res || !res.ok) return jsonResponse({ ok: false, error: (res && res.error) || "commit failed" }, 502);
  return jsonResponse({ ok: true, path });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid JSON" }, 400);
  }
  const key = String(body.key || "");
  const path = String(body.path || "");
  if (!path.startsWith(UPLOAD_DIR + "/")) return jsonResponse({ ok: false, error: "invalid path" }, 400);

  const repo = briefingRepo(env);
  const branch = briefingBranch(env);
  let res = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const idx = await loadIndex(env);
    if (idx.docs[key]) {
      idx.docs[key] = idx.docs[key].filter((d) => d.path !== path);
      if (!idx.docs[key].length) delete idx.docs[key];
    }
    res = await commitFilesToGitHub(
      env,
      [
        { path, content: null },
        { path: INDEX_PATH, content: JSON.stringify(idx, null, 2) + "\n" },
      ],
      `Remove upload: ${path.split("/").pop()}`.slice(0, 72),
      repo, branch
    );
    if (res.ok) break;
    await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
  }
  if (!res || !res.ok) return jsonResponse({ ok: false, error: (res && res.error) || "commit failed" }, 502);
  return jsonResponse({ ok: true });
}
