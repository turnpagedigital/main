/* Shared GitHub I/O helpers for the admin API.

   All helpers read/write files in the configured GitHub repo and branch using
   the Contents API. They expect `env` to provide:
     GITHUB_TOKEN  — fine-grained PAT with "Contents: Read and write"
     GITHUB_REPO   — owner/name (e.g. "turnpagedigital/main")
     GITHUB_BRANCH — branch to read from / commit to (defaults to "dev")

   Result shape conventions:
     - Reads return  { ok: true, text, data, sha } | { ok: false, error }
     - Writes return { ok: true, sha }             | { ok: false, error }
*/

const DEFAULT_BRANCH = "dev";
const FETCH_TIMEOUT_MS = 10000;

/* All GitHub calls go through this wrapper so a hung connection can't
   freeze an admin action indefinitely. On timeout/network failure it
   returns a Response-shaped object with status 0, which the helpers'
   existing !r.ok paths turn into a friendly error message. */
async function ghFetch(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch {
    return {
      ok: false,
      status: 0,
      text: async () => "",
      json: async () => ({}),
    };
  } finally {
    clearTimeout(timer);
  }
}

/* Map GitHub HTTP error codes to friendly, actionable user messages */
function friendlyGitHubError(status, responseText) {
  const status_int = parseInt(status, 10);

  switch (status_int) {
    case 0:
      return "GitHub is responding slowly or unreachable. Please try again.";
    case 409:
      return "This file was changed elsewhere. Reload and try again.";
    case 403:
      return "Permission denied. Check that the GitHub token is valid and has write access to this repo.";
    case 404:
      return "File or repo not found.";
    case 422:
      return "Invalid file content or format. Check that your input is valid JSON/text.";
    case 500:
    case 502:
    case 503:
      return "GitHub is temporarily unavailable. Please try again in a moment.";
    default:
      return `GitHub API error (${status}). ${responseText ? `Details: ${responseText.slice(0, 100)}` : ""}`.trim();
  }
}

function makeErrorMessage(method, status, responseText) {
  return friendlyGitHubError(status, responseText);
}

export function githubHeaders(env) {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    "User-Agent": "tpdm-admin",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function branchOf(env, branch) {
  return branch || env.GITHUB_BRANCH || DEFAULT_BRANCH;
}

function contentsUrl(env, path, repo) {
  const repoName = repo || env.GITHUB_REPO;
  return `https://api.github.com/repos/${repoName}/contents/${path}`;
}

/* List a directory's immediate entries via the Contents API. Returns
   { ok, entries: [{ name, path, type, sha }] } | { ok: false, error }.
   `repo` and `branch` are optional overrides (default to env). */
export async function listDirFromGitHub(env, dirPath, repo, branch) {
  const ref = branchOf(env, branch);
  const url = `${contentsUrl(env, dirPath, repo)}?ref=${encodeURIComponent(ref)}`;
  const r = await ghFetch(url, { headers: githubHeaders(env) });
  if (!r.ok) {
    const text = await r.text();
    return { ok: false, error: makeErrorMessage("GET", r.status, text) };
  }
  const j = await r.json();
  if (!Array.isArray(j)) return { ok: false, error: "Not a directory" };
  return { ok: true, entries: j.map(e => ({ name: e.name, path: e.path, type: e.type, sha: e.sha })) };
}

/* ── Reads ───────────────────────────────────────────────────────────────── */

/* Fetch a file from GitHub and return its metadata, decoded text, and (for
   .json files) parsed data. On failure returns { ok: false, error }.

   parseLabel is used in JSON parse error messages so callers see a friendly
   "Failed to parse alerts.json: …" instead of a generic message. Defaults to
   the path basename.
*/
export async function getFileFromGitHub(env, path, parseLabel, repo, branch) {
  const ref = branchOf(env, branch);
  const url = `${contentsUrl(env, path, repo)}?ref=${encodeURIComponent(ref)}`;
  const r = await ghFetch(url, { headers: githubHeaders(env) });
  if (!r.ok) {
    const text = await r.text();
    return { ok: false, error: makeErrorMessage("GET", r.status, text) };
  }
  const meta = await r.json();

  let text;
  try {
    const raw = atob(meta.content.replace(/\n/g, ""));
    text = decodeURIComponent(escape(raw));
  } catch (e) {
    return { ok: false, error: `Decode error: ${e.message}` };
  }

  let data = null;
  if (path.endsWith(".json")) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      const label = parseLabel || path.split("/").pop() || path;
      return { ok: false, error: `Failed to parse ${label}: ${e.message}` };
    }
  }

  return { ok: true, text, data, sha: meta.sha };
}

/* Fetch just the SHA of a file (used before re-committing a binary that may
   or may not already exist). Returns null on any failure — callers should
   omit the sha field on PUT to indicate file creation. */
export async function getFileSha(env, path, repo, branch) {
  const ref = branchOf(env, branch);
  const url = `${contentsUrl(env, path, repo)}?ref=${encodeURIComponent(ref)}`;
  const r = await ghFetch(url, { headers: githubHeaders(env) });
  if (!r.ok) return null;
  const j = await r.json();
  return j.sha || null;
}

/* Fetch a binary file from GitHub and return its raw base64 content + sha,
   without any text-decoding. Used when "moving" a binary (e.g. renaming a
   library image) — we need to write the same bytes back at a new path, and
   the Contents API stores base64 natively, so round-tripping it as base64
   avoids any encoding round-trip risk.

   Returns { ok: true, contentBase64, sha } | { ok: false, error }. */
export async function getFileBase64FromGitHub(env, path, repo, branch) {
  const ref = branchOf(env, branch);
  const url = `${contentsUrl(env, path, repo)}?ref=${encodeURIComponent(ref)}`;
  const r = await ghFetch(url, { headers: githubHeaders(env) });
  if (!r.ok) {
    const text = await r.text();
    return { ok: false, error: makeErrorMessage("GET", r.status, text) };
  }
  const meta = await r.json();
  // GitHub returns base64 wrapped at 60 chars with newlines — strip them so
  // a downstream PUT with the same payload doesn't include stray whitespace.
  const contentBase64 = typeof meta.content === "string"
    ? meta.content.replace(/\n/g, "")
    : "";
  if (!contentBase64) return { ok: false, error: "GitHub returned empty content" };
  return { ok: true, contentBase64, sha: meta.sha };
}

/* ── Writes ──────────────────────────────────────────────────────────────── */

/* Commit a text file (UTF-8 string) to GitHub. The string is base64-encoded
   inside this helper. Pass sha for updates; omit (undefined/null/"") for new
   files.
   All admin saves append [skip ci] so Cloudflare Pages doesn't auto-build.
   Use the Deploy buttons in the admin top nav to trigger a build when ready. */
export async function commitFileToGitHub(env, path, content, sha, message, repo, branch) {
  const utf8 = unescape(encodeURIComponent(content));
  return putContents(env, path, btoa(utf8), sha, message, repo, branch);
}

/* Commit a pre-encoded base64 binary (image/video) to GitHub. The base64
   payload is sent through as-is. Pass sha for updates; omit for new files.
   Also appends [skip ci] — binaries are saved assets, not deployment events. */
export async function commitBinaryToGitHub(env, path, base64Content, sha, message, repo, branch) {
  return putContents(env, path, base64Content, sha, message, repo, branch);
}

async function putContents(env, path, base64Content, sha, message, repo, branch) {
  const ref = branchOf(env, branch);
  const url = contentsUrl(env, path, repo);
  // Always append [skip ci] so Cloudflare Pages skips an auto-build on this
  // commit. Deployments are triggered explicitly via /api/admin/deploy.
  const commitMessage = message.includes("[skip ci]") ? message : `${message}\n\n[skip ci]`;
  const bodyObj = { message: commitMessage, content: base64Content, branch: ref };
  if (sha) bodyObj.sha = sha;
  const r = await ghFetch(url, {
    method: "PUT",
    headers: { ...githubHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify(bodyObj),
  });
  if (!r.ok) {
    const text = await r.text();
    return { ok: false, error: makeErrorMessage("PUT", r.status, text) };
  }
  const j = await r.json();
  return { ok: true, sha: (j.commit && j.commit.sha) || "" };
}

/* Commit MULTIPLE files in ONE atomic commit via the Git Data API.
   Use this instead of sequential commitFileToGitHub calls whenever an
   operation spans files (e.g. index.json + markdown, compositions + routes) —
   sequential commits can fail halfway and leave the repo half-updated.

   files: [{ path, content, contentBase64?, sha? }]
     content       — UTF-8 string to write, or null to DELETE the path
     contentBase64 — alternative to content for BINARY files (raw base64,
                     e.g. from getFileBase64FromGitHub) — sent to the blob
                     API as-is with no text round-trip
     sha           — the blob sha from a prior getFileFromGitHub read. When
                     provided, the file's current sha is re-checked before
                     committing so a concurrent edit surfaces as a friendly
                     conflict error instead of being clobbered. Omit for
                     brand-new files.

   Flow: verify shas → read branch head → create blobs → create tree (with
   base_tree, so untouched files carry over) → create commit → fast-forward
   the branch ref. If anything fails, NOTHING is applied. The ref update is
   non-forced, so a commit landing in the tiny window after the sha check
   also fails cleanly rather than overwriting.

   If the ref update loses a race to an UNRELATED commit, the whole flow is
   retried once against the new head (the per-file sha checks re-run, so a
   conflicting edit to one of OUR files still surfaces as a conflict error).

   Returns { ok: true, sha: commitSha } | { ok: false, error }. */
export async function commitFilesToGitHub(env, files, message, repo, branch) {
  let result = await commitFilesAttempt(env, files, message, repo, branch);
  if (!result.ok && result.refRace) {
    result = await commitFilesAttempt(env, files, message, repo, branch);
  }
  if (result.refRace) delete result.refRace;
  return result;
}

async function commitFilesAttempt(env, files, message, repo, branch) {
  const ref = branchOf(env, branch);
  const repoName = repo || env.GITHUB_REPO;
  const apiBase = `https://api.github.com/repos/${repoName}`;
  const headers = { ...githubHeaders(env), "Content-Type": "application/json" };

  if (!Array.isArray(files) || files.length === 0) {
    return { ok: false, error: "No files to commit" };
  }

  // 1 — Optimistic-lock check: any file whose expected sha no longer matches
  //     means someone changed it since we read it.
  for (const f of files) {
    if (!f.sha) continue;
    const currentSha = await getFileSha(env, f.path, repo, branch);
    if (currentSha !== f.sha) {
      const name = f.path.split("/").pop();
      return { ok: false, error: `${name} was changed elsewhere. Reload and try again.` };
    }
  }

  // 2 — Branch head commit
  const refRes = await ghFetch(`${apiBase}/git/ref/${encodeURIComponent(`heads/${ref}`)}`, { headers });
  if (!refRes.ok) {
    return { ok: false, error: makeErrorMessage("GET", refRes.status, await refRes.text()) };
  }
  const headSha = (await refRes.json())?.object?.sha;
  if (!headSha) return { ok: false, error: "Could not read branch head" };

  // 3 — Base tree of the head commit
  const headCommitRes = await ghFetch(`${apiBase}/git/commits/${headSha}`, { headers });
  if (!headCommitRes.ok) {
    return { ok: false, error: makeErrorMessage("GET", headCommitRes.status, await headCommitRes.text()) };
  }
  const baseTreeSha = (await headCommitRes.json())?.tree?.sha;
  if (!baseTreeSha) return { ok: false, error: "Could not read base tree" };

  // 4 — Blobs for written files (base64 round-trip keeps UTF-8 intact);
  //     deletions are tree entries with sha: null.
  const treeEntries = [];
  for (const f of files) {
    if (f.content === null) {
      treeEntries.push({ path: f.path, mode: "100644", type: "blob", sha: null });
      continue;
    }
    const base64 = typeof f.contentBase64 === "string"
      ? f.contentBase64
      : btoa(unescape(encodeURIComponent(f.content)));
    const blobRes = await ghFetch(`${apiBase}/git/blobs`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content: base64, encoding: "base64" }),
    });
    if (!blobRes.ok) {
      return { ok: false, error: makeErrorMessage("POST", blobRes.status, await blobRes.text()) };
    }
    const blobSha = (await blobRes.json())?.sha;
    if (!blobSha) return { ok: false, error: "Blob creation returned no sha" };
    treeEntries.push({ path: f.path, mode: "100644", type: "blob", sha: blobSha });
  }

  // 5 — New tree on top of the base tree
  const treeRes = await ghFetch(`${apiBase}/git/trees`, {
    method: "POST",
    headers,
    body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries }),
  });
  if (!treeRes.ok) {
    return { ok: false, error: makeErrorMessage("POST", treeRes.status, await treeRes.text()) };
  }
  const newTreeSha = (await treeRes.json())?.sha;
  if (!newTreeSha) return { ok: false, error: "Tree creation returned no sha" };

  // 6 — Commit ([skip ci] convention matches putContents)
  const commitMessage = message.includes("[skip ci]") ? message : `${message}\n\n[skip ci]`;
  const commitRes = await ghFetch(`${apiBase}/git/commits`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message: commitMessage, tree: newTreeSha, parents: [headSha] }),
  });
  if (!commitRes.ok) {
    return { ok: false, error: makeErrorMessage("POST", commitRes.status, await commitRes.text()) };
  }
  const commitSha = (await commitRes.json())?.sha;
  if (!commitSha) return { ok: false, error: "Commit creation returned no sha" };

  // 7 — Fast-forward the branch (force: false → fails cleanly on a race).
  //     422 here means the head moved since we read it; the caller retries
  //     the whole attempt once against the new head.
  const updateRes = await ghFetch(`${apiBase}/git/refs/${encodeURIComponent(`heads/${ref}`)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ sha: commitSha, force: false }),
  });
  if (!updateRes.ok) {
    const raced = updateRes.status === 422 || updateRes.status === 409;
    const status = updateRes.status === 422 ? 409 : updateRes.status;
    return { ok: false, refRace: raced, error: makeErrorMessage("PATCH", status, await updateRes.text()) };
  }

  return { ok: true, sha: commitSha };
}

/* Delete a file from GitHub. Best-effort: returns { ok } reflecting only
   whether the HTTP request succeeded. */
export async function deleteFileFromGitHub(env, path, sha, message, repo, branch) {
  const ref = branchOf(env, branch);
  const url = contentsUrl(env, path, repo);
  const r = await ghFetch(url, {
    method: "DELETE",
    headers: { ...githubHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha, branch: ref }),
  });
  return { ok: r.ok };
}

/* Scan every admin-managed data file for any textual reference to the given
   URL (or its filename). Used before allowing a permanent file delete so we
   don't strand a `<img src="…">` somewhere.

   Returns { ok: true, references: [{ file, matches: ["url"|"slug"] }] } —
   an empty `references` array means no references were found (safe to delete).
   If any file read fails, we surface the failure as { ok: false, error } —
   we MUST NOT silently pretend it's safe.

   Note: this can't scan compiled JSX sources for hardcoded asset paths. That
   is a known gap — see the report. */
const SCAN_FILES = [
  "src/data/bio.json",
  "src/data/deals.json",
  "src/data/press.json",
  "src/data/alerts.json",
  "src/data/faqs.json",
  "src/data/posts.json",
  "src/data/page-compositions.json",
  "src/data/file-library.json",
  "public/briefings/index.json",
];

export async function findUrlReferences(env, urlOrPath) {
  if (typeof urlOrPath !== "string" || !urlOrPath.trim()) {
    return { ok: false, error: "url required" };
  }
  const url = urlOrPath.trim();
  // The "slug" is the basename of the URL/path — e.g. "foo.png" from
  // "/library/foo.png". A substring match on the slug catches the case where
  // someone wrote the URL with a different prefix than what's in the library
  // (e.g. an absolute https URL vs. a relative /library/ path).
  const slug = url.split("/").pop().split("?")[0];

  const references = [];
  for (const path of SCAN_FILES) {
    const result = await getFileFromGitHub(env, path);
    if (!result.ok) {
      // If a file simply doesn't exist (404), GitHub returns a non-ok with a
      // 404-ish message. We still want to keep scanning the others, so log
      // and continue — but if we hit any other read error we surface it.
      if (/GitHub GET 404/.test(result.error || "")) continue;
      return { ok: false, error: `Failed to scan ${path}: ${result.error}` };
    }
    const text = result.text || "";
    const matches = [];
    if (text.includes(url)) matches.push("url");
    // Only check the slug separately if it's not the same string as the URL
    // (avoids double-counting) and only if it's at least 4 chars long
    // (avoids false positives on common short filenames).
    if (slug && slug !== url && slug.length >= 4 && text.includes(slug)) {
      matches.push("slug");
    }
    if (matches.length > 0) {
      references.push({ file: path, matches });
    }
  }
  return { ok: true, references };
}
