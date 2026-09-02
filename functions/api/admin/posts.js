import { jsonResponse, isAuthed } from "./_utils.js";
import {
  getFileFromGitHub,
  commitFileToGitHub,
  commitFilesToGitHub,
} from "./_github.js";
import { buildRedirects } from "./_routes.js";

const INDEX_PATH    = "public/briefings/index.json";
const REDIRECTS_PATH = "public/_redirects";
const VALID_TYPES   = ["briefing", "article", "announcement"];
const VALID_AUTHORS = ["Turnpage Intelligence", "Andrew Glantz"];

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
    const indexResult = await getFileFromGitHub(env, INDEX_PATH);
    if (!indexResult.ok) return jsonResponse({ ok: false, error: indexResult.error }, 502);

    if (slug) {
      // Return index + markdown content for a single post
      const mdPath = `public/briefings/${slug}.md`;
      const mdResult = await getFileFromGitHub(env, mdPath);
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

      // A slug rename (the editor re-times the date prefix when the
      // publication date changes) moves the markdown file and 301s the old
      // URL. Ignored on new posts — nothing is live yet to move.
      const prevSlug = !isNew && typeof body.prevSlug === "string" ? body.prevSlug.trim() : "";
      const renaming = Boolean(prevSlug) && prevSlug !== item.slug;

      // 1 — Update index.json
      const indexResult = await getFileFromGitHub(env, INDEX_PATH);
      if (!indexResult.ok) return jsonResponse({ ok: false, error: indexResult.error }, 502);

      const items = Array.isArray(indexResult.data?.items) ? indexResult.data.items : [];

      if (renaming && items.some(x => x.slug === item.slug)) {
        return jsonResponse({
          ok: false,
          error: `A post with the slug "${item.slug}" already exists. Change the title or date so the slug is unique.`,
        }, 409);
      }

      const existing = items.findIndex(x => x.slug === (renaming ? prevSlug : item.slug));
      const normalized = normalizeItem(item);

      if (existing >= 0) {
        items[existing] = normalized;
      } else {
        items.push(normalized);
      }

      // Keep newest-first order
      items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

      // 2 — Commit index + markdown in ONE atomic commit, so the index can
      //     never reference a markdown file that failed to save. On a rename
      //     the old markdown is deleted and the 301 written in the same commit.
      const newIndexText = JSON.stringify({ items }, null, 2) + "\n";
      const mdPath = `public/briefings/${item.slug}.md`;
      const mdResult = await getFileFromGitHub(env, mdPath);
      const files = [
        { path: INDEX_PATH, content: newIndexText, sha: indexResult.sha },
        { path: mdPath,     content,               sha: mdResult.ok ? mdResult.sha : undefined },
      ];

      let message = `Posts: ${isNew ? "add" : "update"} ${item.slug}`;
      if (renaming) {
        const oldMdPath = `public/briefings/${prevSlug}.md`;
        const oldMd = await getFileFromGitHub(env, oldMdPath);
        if (oldMd.ok) files.push({ path: oldMdPath, content: null, sha: oldMd.sha });

        const redirects = await getFileFromGitHub(env, REDIRECTS_PATH);
        files.push({
          path: REDIRECTS_PATH,
          content: buildRedirects(
            redirects.ok ? redirects.text : "",
            `/briefings/${prevSlug}`,
            `/briefings/${item.slug}`,
          ),
          sha: redirects.ok ? redirects.sha : undefined,
        });
        message = `Posts: rename ${prevSlug} → ${item.slug}`;
      }

      const saved = await commitFilesToGitHub(env, files, message);
      if (!saved.ok) return jsonResponse({ ok: false, error: saved.error }, 502);

      return jsonResponse({ ok: true, slug: item.slug, renamedFrom: renaming ? prevSlug : null });
    }

    /* ── toggle-active: flip active field in index.json only ─────────── */
    if (action === "toggle-active") {
      const { slug: toggleSlug } = body;
      if (!toggleSlug) return jsonResponse({ ok: false, error: "Missing slug" }, 400);

      const indexResult = await getFileFromGitHub(env, INDEX_PATH);
      if (!indexResult.ok) return jsonResponse({ ok: false, error: indexResult.error }, 502);

      const items = Array.isArray(indexResult.data?.items) ? indexResult.data.items : [];
      const idx = items.findIndex(x => x.slug === toggleSlug);
      if (idx < 0) return jsonResponse({ ok: false, error: "Post not found" }, 404);

      const wasActive = items[idx].active !== false;
      const updated = { ...items[idx] };
      if (wasActive) {
        updated.active = false;
      } else {
        delete updated.active; // omit field = active (default)
      }
      items[idx] = updated;

      const newIndexText = JSON.stringify({ items }, null, 2) + "\n";
      const indexSave = await commitFileToGitHub(
        env, INDEX_PATH, newIndexText, indexResult.sha,
        `Posts: ${wasActive ? "unpublish" : "publish"} ${toggleSlug}`,
      );
      if (!indexSave.ok) return jsonResponse({ ok: false, error: indexSave.error }, 502);

      return jsonResponse({ ok: true, active: !wasActive });
    }

    /* ── delete-post: remove index entry + delete markdown file ────────── */
    if (action === "delete-post") {
      const { slug: delSlug } = body;
      if (!delSlug) return jsonResponse({ ok: false, error: "Missing slug" }, 400);

      // 1 — Remove from index
      const indexResult = await getFileFromGitHub(env, INDEX_PATH);
      if (!indexResult.ok) return jsonResponse({ ok: false, error: indexResult.error }, 502);

      const items = (Array.isArray(indexResult.data?.items) ? indexResult.data.items : [])
        .filter(x => x.slug !== delSlug);

      // 2 — Remove index entry and delete the markdown in ONE atomic commit
      //     (markdown deletion is skipped if the file doesn't exist).
      const newIndexText = JSON.stringify({ items }, null, 2) + "\n";
      const mdPath = `public/briefings/${delSlug}.md`;
      const mdResult = await getFileFromGitHub(env, mdPath);
      const files = [{ path: INDEX_PATH, content: newIndexText, sha: indexResult.sha }];
      if (mdResult.ok) files.push({ path: mdPath, content: null, sha: mdResult.sha });

      const saved = await commitFilesToGitHub(env, files, `Posts: delete ${delSlug}`);
      if (!saved.ok) return jsonResponse({ ok: false, error: saved.error }, 502);

      return jsonResponse({ ok: true });
    }

    /* ── bulk-delete: remove multiple slugs in ONE atomic commit ─────────── */
    if (action === "bulk-delete") {
      const { slugs } = body;
      if (!Array.isArray(slugs) || slugs.length === 0) {
        return jsonResponse({ ok: false, error: "Missing slugs array" }, 400);
      }
      const slugSet = new Set(slugs.map(String));

      // Which markdown files actually exist — one lookup each, done ONCE up
      // front (skips a stray index entry whose file is already gone, which
      // would otherwise error the tree).
      const paths = [...slugSet].map(s => `public/briefings/${s}.md`);
      const exist = await Promise.all(paths.map(p => getFileFromGitHub(env, p)));
      const mdPaths = paths.filter((_, i) => exist[i].ok);

      // Read → filter → commit, retried a few times so a bot writing a fresh
      // briefing to index.json mid-delete doesn't fail the whole batch.
      //
      // GitHub-call budget: a Pages Function is capped at 50 subrequests. The
      // old code ALSO passed each markdown file's sha, so commitFilesToGitHub
      // re-fetched every one to "lock" it — a 20-item batch spent ~48, and any
      // refRace retry (which repeats the commit) tipped it over and crashed the
      // request (hence "Batch 3 failed"). Deleting by PATH only (content:null →
      // a tree entry with sha:null removes it) drops that second per-file
      // lookup, so only the index carries a sha. A whole batch now costs a
      // handful of calls plus one existence probe per file.
      let lastErr = "Bulk delete failed";
      for (let attempt = 0; attempt < 3; attempt++) {
        const indexResult = await getFileFromGitHub(env, INDEX_PATH);
        if (!indexResult.ok) return jsonResponse({ ok: false, error: indexResult.error }, 502);

        const items = (Array.isArray(indexResult.data?.items) ? indexResult.data.items : [])
          .filter(x => !slugSet.has(x.slug));
        const newIndexText = JSON.stringify({ items }, null, 2) + "\n";

        const files = [{ path: INDEX_PATH, content: newIndexText, sha: indexResult.sha }];
        for (const p of mdPaths) files.push({ path: p, content: null });

        const saved = await commitFilesToGitHub(env, files, `Posts: bulk delete ${slugs.length} post${slugs.length !== 1 ? "s" : ""}`);
        if (saved.ok) return jsonResponse({ ok: true, deleted: slugs.length });
        lastErr = saved.error || "Bulk delete failed";
        // Only an index-moved-under-us race is worth re-reading and retrying;
        // other errors are terminal.
        if (!/changed elsewhere/i.test(lastErr)) break;
      }
      return jsonResponse({ ok: false, error: lastErr }, 502);
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
  if (item.author !== undefined && !VALID_AUTHORS.includes(item.author))
    return `author must be one of: ${VALID_AUTHORS.join(", ")}`;
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
  // author: omit when default ("Turnpage Intelligence") to keep index.json lean
  const author = String(item.author || "").trim();
  if (author && author !== "Turnpage Intelligence") out.author = author;
  const tags = Array.isArray(item.tags)
    ? item.tags.map(t => String(t).trim()).filter(Boolean)
    : [];
  if (tags.length) out.tags = tags;
  if (item.active === false) out.active = false; // omit field when true (default)
  return out;
}
