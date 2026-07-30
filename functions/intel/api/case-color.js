/* functions/intel/api/case-color.js — set a case's DEFAULT pill color.

   Writes default_color into cases/data/_manifest.json, which every intel
   page reads. The pipeline and the admin cases endpoint both preserve
   existing manifest colors, so a default set here sticks everywhere until
   changed again. Gated by the intel middleware.

   PUT → { slug, bg }  (bg = #RRGGBB) */

import { jsonResponse } from "../../api/admin/_utils.js";
import { getFileFromGitHub, commitFileToGitHub } from "../../api/admin/_github.js";

const PATH = "briefing-generator/cases/data/_manifest.json";

function briefingRepo(env) { return env.GITHUB_BRIEFING_REPO || env.GITHUB_REPO || "turnpagedigital/main"; }
function briefingBranch(env) { return env.GITHUB_BRIEFING_BRANCH || "main"; }

export async function onRequestPut(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid JSON" }, 400);
  }
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const bg = typeof body.bg === "string" ? body.bg.trim() : "";
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return jsonResponse({ ok: false, error: "invalid slug" }, 400);
  if (!/^#[0-9a-fA-F]{6}$/.test(bg)) return jsonResponse({ ok: false, error: "invalid color" }, 400);

  const repo = briefingRepo(env);
  const branch = briefingBranch(env);
  let res = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const cur = await getFileFromGitHub(env, PATH, null, repo, branch);
    if (!cur.ok || !Array.isArray(cur.data)) {
      return jsonResponse({ ok: false, error: "manifest unavailable" }, 502);
    }
    const entry = cur.data.find((m) => m.slug === slug);
    if (!entry) return jsonResponse({ ok: false, error: "case not in manifest" }, 404);
    if (entry.default_color === bg) return jsonResponse({ ok: true, unchanged: true });
    entry.default_color = bg;
    res = await commitFileToGitHub(
      env, PATH, JSON.stringify(cur.data, null, 2) + "\n", cur.sha,
      `Default color: ${slug} → ${bg}`, repo, branch
    );
    if (res.ok) break;
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  if (!res || !res.ok) return jsonResponse({ ok: false, error: (res && res.error) || "commit failed" }, 502);
  return jsonResponse({ ok: true });
}
