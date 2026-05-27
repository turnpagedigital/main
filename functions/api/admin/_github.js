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

export function githubHeaders(env) {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    "User-Agent": "tpdm-admin",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function branchOf(env) {
  return env.GITHUB_BRANCH || DEFAULT_BRANCH;
}

function contentsUrl(env, path) {
  return `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
}

/* ── Reads ───────────────────────────────────────────────────────────────── */

/* Fetch a file from GitHub and return its metadata, decoded text, and (for
   .json files) parsed data. On failure returns { ok: false, error }.

   parseLabel is used in JSON parse error messages so callers see a friendly
   "Failed to parse alerts.json: …" instead of a generic message. Defaults to
   the path basename.
*/
export async function getFileFromGitHub(env, path, parseLabel) {
  const branch = branchOf(env);
  const url = `${contentsUrl(env, path)}?ref=${encodeURIComponent(branch)}`;
  const r = await fetch(url, { headers: githubHeaders(env) });
  if (!r.ok) return { ok: false, error: `GitHub GET ${r.status}: ${(await r.text()).slice(0, 300)}` };
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
export async function getFileSha(env, path) {
  const branch = branchOf(env);
  const url = `${contentsUrl(env, path)}?ref=${encodeURIComponent(branch)}`;
  const r = await fetch(url, { headers: githubHeaders(env) });
  if (!r.ok) return null;
  const j = await r.json();
  return j.sha || null;
}

/* ── Writes ──────────────────────────────────────────────────────────────── */

/* Commit a text file (UTF-8 string) to GitHub. The string is base64-encoded
   inside this helper. Pass sha for updates; omit (undefined/null/"") for new
   files. */
export async function commitFileToGitHub(env, path, content, sha, message) {
  const utf8 = unescape(encodeURIComponent(content));
  return putContents(env, path, btoa(utf8), sha, message);
}

/* Commit a pre-encoded base64 binary (image/video) to GitHub. The base64
   payload is sent through as-is. Pass sha for updates; omit for new files. */
export async function commitBinaryToGitHub(env, path, base64Content, sha, message) {
  return putContents(env, path, base64Content, sha, message);
}

async function putContents(env, path, base64Content, sha, message) {
  const branch = branchOf(env);
  const url = contentsUrl(env, path);
  const bodyObj = { message, content: base64Content, branch };
  if (sha) bodyObj.sha = sha;
  const r = await fetch(url, {
    method: "PUT",
    headers: { ...githubHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify(bodyObj),
  });
  if (!r.ok) {
    const text = (await r.text()).slice(0, 400);
    return { ok: false, error: `GitHub PUT ${r.status}: ${text}` };
  }
  const j = await r.json();
  return { ok: true, sha: (j.commit && j.commit.sha) || "" };
}

/* Delete a file from GitHub. Best-effort: returns { ok } reflecting only
   whether the HTTP request succeeded. */
export async function deleteFileFromGitHub(env, path, sha, message) {
  const branch = branchOf(env);
  const url = contentsUrl(env, path);
  const r = await fetch(url, {
    method: "DELETE",
    headers: { ...githubHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha, branch }),
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
