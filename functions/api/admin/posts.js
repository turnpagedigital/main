import { jsonResponse, isAuthed } from "./_utils.js";

const INDEX_PATH = "public/briefings/index.json";
const VALID_TYPES = ["briefing", "article", "announcement"];

/* ── onRequest — handles GET, PUT (save-post + delete-post) ───────────────── */
export async function onRequest({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return jsonResponse({ ok: false, error: "GitHub env vars missing" }, 500);
  }

  const method = request.method.toUpperCase();
  const url    = new URL(request.url);
  const slug   = url.searchParams.get("slug") || null;

  /* ── GET ──────────────────────────────────────────────────────────────── */
  if (method === "GET") {
    const indexResult = await fetchFile(env, INDEX_PATH);
    if (!indexResult.ok) return jsonResponse({ ok: false, error: indexResult.error }, 502);

    if (slug) {
      // Return index + markdown content for a single post
      const mdPath = `public/briefings/${slug}.md`;
      const mdResult = await fetchFile(env, mdPath);
      return jsonResponse({
        ok:      true,
        data:    indexResult.data,
        content: mdResult.ok ? mdResult.text : "",
      });
    }

    return jsonResponse({ ok: true, data: indexResult.data });
  }

  /* ── PUT ──────────────────────────────────────────────────────────────── */
  if (method === "PUT") {
    let body;
    try { body = await request.json(); }
    catch { return jsonResponse({ ok: false, error: "Bad request body" }, 400); }

    const action = body?.action;

    /* ── save-post: update index entry + write markdown file ──────────── */
    if (action === "save-post") {
      const { item, content, isNew } = body;
      if (!item || !item.slug) return jsonResponse({ ok: false, error: "Missing slug" }, 400);
      if (typeof content !== "string") return jsonResponse({ ok: false, error: "Missing content" }, 400);

      const err = validateItem(item);
      if (err) return jsonResponse({ ok: false, error: err }, 400);

      // 1 — Update index.json
      const indexResult = await fetchFile(env, INDEX_PATH);
      if (!indexResult.ok) return jsonResponse({ ok: false, error: indexResult.error }, 502);

      const items = Array.isArray(indexResult.data?.items) ? indexResult.data.items : [];
      const existing = items.findIndex(x => x.slug === item.slug);
      const normalized = normalizeItem(item);

      if (existing >= 0) {
        items[existing] = normalized;
      } else {
        items.push(normalized);
      }

      // Keep newest-first order
      items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

      const newIndexText = JSON.stringify({ items }, null, 2) + "\n";
      const indexSave = await commitFile(
        env, INDEX_PATH, newIndexText, indexResult.sha,
        `Posts: ${isNew ? "add" : "update"} ${item.slug}`,
      );
      if (!indexSave.ok) return jsonResponse({ ok: false, error: indexSave.error }, 502);

      // 2 — Save markdown file
      const mdPath = `public/briefings/${item.slug}.md`;
      const mdResult = await fetchFile(env, mdPath);
      const mdSave = await commitFile(
        env, mdPath, content,
        mdResult.ok ? mdResult.sha : undefined,
        `Posts: ${isNew ? "add" : "update"} content for ${item.slug}`,
      );
      if (!mdSave.ok) return jsonResponse({ ok: false, error: mdSave.error }, 502);

      return jsonResponse({ ok: true });
    }

    /* ── delete-post: remove index entry + delete markdown file ────────── */
    if (action === "delete-post") {
      const { slug: delSlug } = body;
      if (!delSlug) return jsonResponse({ ok: false, error: "Missing slug" }, 400);

      // 1 — Remove from index
      const indexResult = await fetchFile(env, INDEX_PATH);
      if (!indexResult.ok) return jsonResponse({ ok: false, error: indexResult.error }, 502);

      const items = (Array.isArray(indexResult.data?.items) ? indexResult.data.items : [])
        .filter(x => x.slug !== delSlug);

      const newIndexText = JSON.stringify({ items }, null, 2) + "\n";
      const indexSave = await commitFile(
        env, INDEX_PATH, newIndexText, indexResult.sha,
        `Posts: delete ${delSlug}`,
      );
      if (!indexSave.ok) return jsonResponse({ ok: false, error: indexSave.error }, 502);

      // 2 — Delete markdown file (best-effort — don't fail if it doesn't exist)
      const mdPath = `public/briefings/${delSlug}.md`;
      const mdResult = await fetchFile(env, mdPath);
      if (mdResult.ok) {
        await deleteFile(env, mdPath, mdResult.sha, `Posts: delete content for ${delSlug}`);
      }

      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: "Unknown action" }, 400);
  }

  return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
}

/* ── Validation & normalisation ──────────────────────────────────────────── */

function validateItem(item) {
  if (!item.slug || typeof item.slug !== "string") return "slug is required";
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(item.slug))
    return "slug must be lowercase letters, numbers, and hyphens (no leading/trailing hyphens)";
  if (!item.title || typeof item.title !== "string" || !item.title.trim())
    return "title is required";
  if (!item.date || typeof item.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.date))
    return "date is required (YYYY-MM-DD)";
  if (!VALID_TYPES.includes(item.type))
    return `type must be one of: ${VALID_TYPES.join(", ")}`;
  return null;
}

function normalizeItem(item) {
  const out = {
    slug:    String(item.slug).trim(),
    date:    String(item.date).trim(),
    type:    String(item.type),
    title:   String(item.title).trim(),
    summary: String(item.summary || "").trim(),
  };
  const tags = Array.isArray(item.tags)
    ? item.tags.map(t => String(t).trim()).filter(Boolean)
    : [];
  if (tags.length) out.tags = tags;
  if (item.active === false) out.active = false; // omit field when true (default)
  return out;
}

/* ── GitHub helpers ──────────────────────────────────────────────────────── */

function githubHeaders(env) {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    "User-Agent":  "tpdm-admin",
    Accept:        "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function fetchFile(env, path) {
  const branch = env.GITHUB_BRANCH || "dev";
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
  const r = await fetch(url, { headers: githubHeaders(env) });
  if (!r.ok) return { ok: false, error: `GitHub GET ${r.status}: ${(await r.text()).slice(0, 200)}` };
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
    try { data = JSON.parse(text); }
    catch (e) { return { ok: false, error: `JSON parse error: ${e.message}` }; }
  }

  return { ok: true, text, data, sha: meta.sha };
}

async function commitFile(env, path, content, sha, message) {
  const branch = env.GITHUB_BRANCH || "dev";
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${encodeURIComponent(path)}`;
  const utf8 = unescape(encodeURIComponent(content));
  const bodyObj = { message, content: btoa(utf8), branch };
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
  return { ok: true, sha: j.commit?.sha || "" };
}

async function deleteFile(env, path, sha, message) {
  const branch = env.GITHUB_BRANCH || "dev";
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${encodeURIComponent(path)}`;
  const r = await fetch(url, {
    method: "DELETE",
    headers: { ...githubHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha, branch }),
  });
  return { ok: r.ok };
}
