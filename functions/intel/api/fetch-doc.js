/* functions/intel/api/fetch-doc.js — one-click document acquisition.

   Clicking a Dkt. link on the docket page calls this instead of opening
   CourtListener: the document lands in the row's uploads automatically.

   POST { slug, entry_number, docket_id }
     → { status: "ready", path }            document was in RECAP (free) —
                                            downloaded and committed
     → { status: "pending", fetch_id, rd_id } not in RECAP — a PACER purchase
                                            was queued via CourtListener's
                                            RECAP Fetch API (needs
                                            PACER_USERNAME / PACER_PASSWORD)
     → { status: "failed", error }

   GET ?fetch_id=&rd_id=&slug=&entry_number=
     → { status: "pending" } | { status: "ready", path } | { status: "failed" }
     Client polls this after a purchase was queued; when CourtListener has
     the PDF we download and commit it.

   Costs: PACER charges the linked account ($0.10/page, $3 cap per doc).
   Gated by functions/intel/_middleware.js (admin session). */

import { jsonResponse } from "../../api/admin/_utils.js";
import { getFileFromGitHub, commitFilesToGitHub } from "../../api/admin/_github.js";

const CL = "https://www.courtlistener.com/api/rest/v4";
const INDEX_PATH = "briefing-generator/uploads.json";
const UPLOAD_DIR = "briefing-generator/uploads";
const MAX_BYTES = 20 * 1024 * 1024;

function briefingRepo(env) { return env.GITHUB_BRIEFING_REPO || env.GITHUB_REPO || "turnpagedigital/main"; }
function briefingBranch(env) { return env.GITHUB_BRIEFING_BRANCH || "main"; }

function clHeaders(env) {
  return { Authorization: `Token ${env.COURTLISTENER_TOKEN}`, "User-Agent": "tpdm-intel" };
}

function safeSegment(s, max) {
  return String(s || "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, max);
}

async function b64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

async function lookupRecapDoc(env, docketId, entryNumber) {
  const url = `${CL}/docket-entries/?docket=${docketId}&entry_gte=${entryNumber}&entry_lte=${entryNumber}` +
    `&fields=entry_number,recap_documents`;
  // CourtListener rate-limits aggressively (the hourly docket sync competes
  // for the same token) — retry a 429 a couple times, honoring Retry-After.
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: clHeaders(env), signal: AbortSignal.timeout(20000) });
    if (res.status === 429) {
      const wait = Math.min(parseInt(res.headers.get("retry-after") || "3", 10) || 3, 8);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`CourtListener lookup failed (${res.status})`);
    const data = await res.json();
    const entry = (data.results || []).find((r) => r.entry_number === entryNumber);
    const docs = (entry && entry.recap_documents) || [];
    return docs.find((d) => !d.attachment_number) || docs[0] || null;
  }
  throw new Error("CourtListener rate-limited (429)");
}

// The plain CourtListener docket-entry link — the always-works fallback the
// click used to be, so a failed fetch never leaves the user worse off.
function entryLinkUrl(docketId, entryNumber) {
  return `https://www.courtlistener.com/docket/${docketId}/` +
    `?filed_after=&filed_before=&entry_gte=${entryNumber}&entry_lte=${entryNumber}&order_by=asc`;
}

async function commitPdf(env, slug, entryNumber, pdfBuf) {
  if (pdfBuf.byteLength > MAX_BYTES) throw new Error("document exceeds 20MB");
  const head = new TextDecoder().decode(new Uint8Array(pdfBuf.slice(0, 5)));
  if (!head.startsWith("%PDF")) throw new Error("CourtListener returned something that is not a PDF");
  const key = `${slug}|n${entryNumber}`;
  const keyDir = safeSegment(key, 100);
  const filename = `Dkt-${entryNumber}.pdf`;
  const path = `${UPLOAD_DIR}/${keyDir}/${filename}`;
  const contentBase64 = await b64(pdfBuf);
  const repo = briefingRepo(env);
  const branch = briefingBranch(env);

  let res = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const idxRes = await getFileFromGitHub(env, INDEX_PATH, null, repo, branch);
    const idx = idxRes.ok && idxRes.data && idxRes.data.docs ? { docs: idxRes.data.docs } : { docs: {} };
    const list = (idx.docs[key] = idx.docs[key] || []).filter((d) => d.path !== path);
    list.push({
      name: filename,
      path,
      size: pdfBuf.byteLength,
      uploaded_at: new Date().toISOString(),
      text: "",
      source: "courtlistener",
    });
    idx.docs[key] = list;
    res = await commitFilesToGitHub(
      env,
      [
        { path, contentBase64 },
        { path: INDEX_PATH, content: JSON.stringify(idx, null, 2) + "\n" },
      ],
      `Fetch: Dkt. ${entryNumber} (${slug}) from RECAP`.slice(0, 72),
      repo, branch
    );
    if (res.ok) break;
    await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
  }
  if (!res || !res.ok) throw new Error((res && res.error) || "commit failed");
  return path;
}

async function downloadAndCommit(env, slug, entryNumber, filepathLocal) {
  const pdfUrl = "https://storage.courtlistener.com/" + String(filepathLocal).replace(/^\/+/, "");
  const res = await fetch(pdfUrl, { signal: AbortSignal.timeout(45000) });
  if (!res.ok) throw new Error(`document download failed (${res.status})`);
  const buf = await res.arrayBuffer();
  return commitPdf(env, slug, entryNumber, buf);
}

const AUTOMATABLE_AGENTS = /kroll|ra\.kroll/i;

async function detectAgent(env, slug) {
  const res = await getFileFromGitHub(env, `briefing-generator/cases/data/${slug}.json`, null,
    briefingRepo(env), briefingBranch(env));
  if (!res.ok || !res.data) return null;
  const ca = res.data.claims_administrator || {};
  const hay = `${ca.name || ""} ${ca.url || ""}`;
  if (ca.url && AUTOMATABLE_AGENTS.test(hay)) return { kind: "kroll", url: ca.url };
  return null;
}

async function dispatchAgentFetch(env, slug, entryNumber) {
  const token = env.GITHUB_TOKEN;
  if (!token) return { ok: false, error: "GITHUB_TOKEN not configured" };
  const repo = briefingRepo(env);
  const url = `https://api.github.com/repos/${repo}/actions/workflows/fetch-agent-doc.yml/dispatches`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "tpdm-intel",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref: briefingBranch(env), inputs: { slug, entry_number: String(entryNumber) } }),
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 204) return { ok: true };
  const text = (await res.text()).slice(0, 200);
  // 403 here usually means the PAT lacks "Actions: read and write"
  return { ok: false, error: `workflow dispatch failed (${res.status}): ${text}` };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.COURTLISTENER_TOKEN) {
    return jsonResponse({ status: "failed", error: "COURTLISTENER_TOKEN not configured" });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ status: "failed", error: "invalid JSON" }, 400);
  }
  const slug = String(body.slug || "");
  const entryNumber = Number(body.entry_number);
  const docketId = String(body.docket_id || "").replace(/[^0-9]/g, "");
  if (!/^[a-z0-9-]{1,60}$/.test(slug) || !Number.isFinite(entryNumber) || !docketId) {
    return jsonResponse({ status: "failed", error: "slug, entry_number and docket_id required" }, 400);
  }

  const openLink = entryLinkUrl(docketId, entryNumber);

  // Step 1 — RECAP (free, instant). A lookup failure (429, etc.) is NOT fatal:
  // record it and fall through to the agent, which doesn't need CourtListener.
  let rd = null;
  let recapDown = false;
  try {
    rd = await lookupRecapDoc(env, docketId, entryNumber);
    if (rd && rd.filepath_local) {
      const path = await downloadAndCommit(env, slug, entryNumber, rd.filepath_local);
      return jsonResponse({ status: "ready", path });
    }
  } catch (ex) {
    recapDown = true;
  }

  // Step 2 — the case's claims agent (free), if automatable. Needs no CL.
  const agent = await detectAgent(env, slug);
  if (agent) {
    const dispatched = await dispatchAgentFetch(env, slug, entryNumber);
    if (dispatched.ok) {
      return jsonResponse({ status: "agent_pending", agent: agent.kind, key: `${slug}|n${entryNumber}` });
    }
    // Dispatch itself failed — open the docket page rather than dead-end.
    return jsonResponse({
      status: "open_link", url: openLink,
      reason: "couldn't start the agent fetch",
    });
  }

  // Step 3 — PACER, only when no agent. Needs the RECAP lookup to have worked.
  if (recapDown || !rd) {
    return jsonResponse({
      status: "open_link", url: openLink,
      reason: recapDown ? "CourtListener is rate-limited right now"
                        : "no document record on this entry yet",
    });
  }
  if (!env.PACER_USERNAME || !env.PACER_PASSWORD) {
    return jsonResponse({
      status: "open_link", url: openLink,
      reason: "not in the free archive and PACER isn't configured",
    });
  }
  const form = new URLSearchParams({
    request_type: "2", // PDF purchase
    pacer_username: env.PACER_USERNAME,
    pacer_password: env.PACER_PASSWORD,
    recap_document: String(rd.id),
  });
  const res = await fetch(`${CL}/recap-fetch/`, {
    method: "POST",
    headers: { ...clHeaders(env), "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    return jsonResponse({ status: "open_link", url: openLink, reason: "PACER purchase couldn't start" });
  }
  const data = await res.json();
  return jsonResponse({ status: "pending", fetch_id: data.id, rd_id: rd.id });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const fetchId = String(url.searchParams.get("fetch_id") || "").replace(/[^0-9]/g, "");
  const rdId = String(url.searchParams.get("rd_id") || "").replace(/[^0-9]/g, "");
  const slug = String(url.searchParams.get("slug") || "");
  const entryNumber = Number(url.searchParams.get("entry_number"));
  if (!fetchId || !rdId || !/^[a-z0-9-]{1,60}$/.test(slug) || !Number.isFinite(entryNumber)) {
    return jsonResponse({ status: "failed", error: "bad poll params" }, 400);
  }

  const st = await fetch(`${CL}/recap-fetch/${fetchId}/`, {
    headers: clHeaders(env), signal: AbortSignal.timeout(15000),
  });
  if (!st.ok) return jsonResponse({ status: "failed", error: `status check failed (${st.status})` });
  const s = await st.json();
  // status: 1 awaiting processing, 2 success, 3 failed, 5 queued, 6 in progress
  if (s.status === 2) {
    const rd = await fetch(`${CL}/recap-documents/${rdId}/?fields=filepath_local`, {
      headers: clHeaders(env), signal: AbortSignal.timeout(15000),
    });
    const rdData = rd.ok ? await rd.json() : null;
    if (rdData && rdData.filepath_local) {
      try {
        const path = await downloadAndCommit(env, slug, entryNumber, rdData.filepath_local);
        return jsonResponse({ status: "ready", path });
      } catch (ex) {
        return jsonResponse({ status: "failed", error: String(ex.message || ex) });
      }
    }
    return jsonResponse({ status: "pending" });
  }
  if (s.status === 3) {
    return jsonResponse({ status: "failed", error: (s.message || "PACER fetch failed").slice(0, 300) });
  }
  return jsonResponse({ status: "pending" });
}
