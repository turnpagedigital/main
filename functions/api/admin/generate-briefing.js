import { isAuthed, jsonResponse } from "./_utils.js";

/* Generate Briefing endpoint — triggers the daily-briefing workflow in THIS
   repo (the briefing system was consolidated from intel-turnpage into
   briefing-generator/, June 2026).

   POST /api/admin/generate-briefing
   Body (optional): { "topics": ["crypto-insolvency"] } or { "topics": "a,b" }
     — restricts the run to those topic slugs; empty/missing = all topics
     → Sends a repository_dispatch event ("daily-briefing") to GITHUB_REPO
     → .github/workflows/daily-briefing.yml (on the default branch) runs
       briefing-generator/scripts/generate.py and commits the dashboards back
     → Returns { ok: true, message: "..." }

   Why repository_dispatch instead of workflow_dispatch: it only needs the
   fine-grained "Contents: Read and write" permission the admin token already
   uses for every save — no extra Actions permission to get wrong.

   Auth required (session cookie).
*/

export async function onRequestPost({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }

  const githubToken = env.GITHUB_TOKEN;
  if (!githubToken) {
    return jsonResponse({
      ok: false,
      error: "Briefing generation not configured. Please set GITHUB_TOKEN in Cloudflare environment.",
    }, 500);
  }

  const repo = env.GITHUB_BRIEFING_REPO || env.GITHUB_REPO || "turnpagedigital/main";

  // Optional topic filter from the request body — slugs only, comma string or
  // array. Anything that isn't kebab-case is dropped rather than forwarded.
  let topics = [];
  try {
    const body = await request.json();
    const raw = body?.topics ?? body?.topic ?? [];
    const list = Array.isArray(raw) ? raw : String(raw).split(",");
    topics = list.map(s => String(s).trim()).filter(s => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s));
  } catch {
    // No/invalid JSON body — run all topics.
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "tpdm-admin",
      },
      body: JSON.stringify({
        event_type: "daily-briefing",
        ...(topics.length ? { client_payload: { topics: topics.join(",") } } : {}),
      }),
    });

    // Success is 204 No Content
    if (response.status === 204) {
      const scope = topics.length
        ? `for ${topics.join(", ")} only — takes ~3–5 minutes`
        : "for all topics — takes ~10–15 minutes";
      return jsonResponse({
        ok: true,
        message: `✅ Briefing generation triggered ${scope}. New drafts then appear in the Queue below (hit Refresh), and the topic dashboard(s) update. Monitor at https://github.com/${repo}/actions.`,
      });
    }

    const responseText = await response.text().catch(() => "");
    console.error(`GitHub dispatch returned ${response.status}: ${responseText}`);

    if (response.status === 401 || response.status === 403) {
      return jsonResponse({
        ok: false,
        error: `GitHub authentication failed. The GITHUB_TOKEN must have "Contents: Read and write" on ${repo} (the same permission admin saves use).`,
      }, 403);
    }
    if (response.status === 404) {
      return jsonResponse({
        ok: false,
        error: `GitHub can't find ${repo} with this token — fine-grained tokens must list it under Repository access.`,
      }, 404);
    }

    return jsonResponse({
      ok: false,
      error: `GitHub returned ${response.status}. ${responseText.slice(0, 140)}`,
    }, response.status >= 500 ? 502 : 400);
  } catch (error) {
    console.error("Generate briefing error:", error.message);
    return jsonResponse({
      ok: false,
      error: `Failed to trigger briefing generation: ${error.message}`,
    }, 502);
  }
}
