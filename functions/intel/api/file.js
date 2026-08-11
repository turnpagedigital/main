/* functions/intel/api/file.js — serve uploaded docket documents.

   Uploaded PDFs live in the repo (briefing-generator/uploads/...). The static
   copy only exists on the site after the next build, so links through this
   endpoint instead: it streams the file straight from GitHub — available the
   moment the upload commit lands, no rebuild wait.

   GET ?path=briefing-generator/uploads/<dir>/<file>[&dl=1]
     → the file, inline (or as an attachment with &dl=1).

   Gated by functions/intel/_middleware.js (admin session). */

const UPLOAD_PREFIX = "briefing-generator/uploads/";

function briefingRepo(env) { return env.GITHUB_BRIEFING_REPO || env.GITHUB_REPO || "turnpagedigital/main"; }
function briefingBranch(env) { return env.GITHUB_BRIEFING_BRANCH || env.GITHUB_BRANCH || "dev"; }

const TYPES = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  txt: "text/plain; charset=utf-8",
};

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.searchParams.get("path") || "";
  const asDownload = url.searchParams.get("dl") === "1";

  if (!path.startsWith(UPLOAD_PREFIX) || path.includes("..")) {
    return new Response("invalid path", { status: 400 });
  }

  const token = env.GITHUB_TOKEN;
  if (!token) return new Response("GITHUB_TOKEN not configured", { status: 500 });

  const apiUrl = `https://api.github.com/repos/${briefingRepo(env)}/contents/` +
    path.split("/").map(encodeURIComponent).join("/") +
    `?ref=${encodeURIComponent(briefingBranch(env))}`;

  const ghRes = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.raw+json",
      "User-Agent": "tpdm-intel",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (ghRes.status === 404) return new Response("file not found", { status: 404 });
  if (!ghRes.ok) return new Response(`upstream error (${ghRes.status})`, { status: 502 });

  const name = path.split("/").pop() || "document";
  const ext = (name.split(".").pop() || "").toLowerCase();
  const headers = new Headers({
    "Content-Type": TYPES[ext] || "application/octet-stream",
    "Content-Disposition": (asDownload ? "attachment" : "inline") +
      `; filename="${name.replace(/[^\w.\- ]+/g, "_")}"`,
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  });
  const len = ghRes.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  return new Response(ghRes.body, { status: 200, headers });
}
