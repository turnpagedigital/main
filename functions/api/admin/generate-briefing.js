import { isAuthed, jsonResponse } from "./_utils.js";

/* Generate Briefing endpoint — triggers the daily-briefing workflow in the
   BRIEFING repo (intel.turnpage.com).

   POST /api/admin/generate-briefing
     → Dispatches .github/workflows/daily-briefing.yml in
       turnpagedigital/intel-turnpage (override via GITHUB_BRIEFING_REPO /
       GITHUB_BRIEFING_BRANCH — same convention cases.js uses)
     → That workflow runs scripts/generate.py (Anthropic + CourtListener via
       the intel repo's Actions secrets) and commits dashboards back
     → intel.turnpage.com redeploys with the new briefing

   Requires (Cloudflare env): GITHUB_TOKEN that can dispatch workflows in the
   briefing repo — fine-grained PAT with the briefing repo selected and
   "Actions: Read and write" (classic PATs: 'repo' + 'workflow' scopes).

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
      error: "Briefing generation not configured. Please set GITHUB_TOKEN in Cloudflare environment with access to the briefing repo.",
    }, 500);
  }

  const repo = env.GITHUB_BRIEFING_REPO || "turnpagedigital/intel-turnpage";
  const ref  = env.GITHUB_BRIEFING_BRANCH || "main";

  try {
    const dispatchUrl = `https://api.github.com/repos/${repo}/actions/workflows/daily-briefing.yml/dispatches`;

    const response = await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref, inputs: {} }),
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      console.error(`GitHub dispatch returned ${response.status}: ${responseText}`);

      if (response.status === 401 || response.status === 403) {
        return jsonResponse({
          ok: false,
          error: `GitHub authentication failed. The GITHUB_TOKEN must have access to ${repo} with "Actions: Read and write" permission (fine-grained) or 'repo' + 'workflow' scopes (classic).`,
        }, 403);
      }
      if (response.status === 404) {
        return jsonResponse({
          ok: false,
          error: `GitHub can't find the workflow in ${repo}. Either the token has no access to that repo (fine-grained tokens must list it under Repository access) or daily-briefing.yml is missing on ${ref}.`,
        }, 404);
      }

      return jsonResponse({
        ok: false,
        error: `GitHub returned ${response.status}. The workflow may already be running or the request was rejected.`,
      }, response.status >= 500 ? 502 : 400);
    }

    return jsonResponse({
      ok: true,
      message: `✅ Briefing generation triggered! Monitor progress at https://github.com/${repo}/actions — the updated dashboard appears on intel.turnpage.com in ~5–15 minutes.`,
    });
  } catch (error) {
    console.error("Generate briefing error:", error.message);
    return jsonResponse({
      ok: false,
      error: `Failed to trigger briefing generation: ${error.message}`,
    }, 502);
  }
}
