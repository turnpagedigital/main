import { isAuthed, jsonResponse } from "./_utils.js";

/* Generate Briefing endpoint — triggers briefing generation from GitHub Actions

   POST /api/admin/generate-briefing
     → Dispatches the daily-briefing-site GitHub Actions workflow
     → Workflow runs the Python generation script
     → Generated briefings are committed and deployed to intel.turnpagedigital.com
     → Returns { ok: true, message: "..." }

   Requires environment variables:
   - INTEL_BRIEFING_WEBHOOK_URL — GitHub Actions workflow dispatch API endpoint
     Format: https://api.github.com/repos/turnpagedigital/daily-briefing-site/actions/workflows/daily-briefing.yml/dispatches
   - GITHUB_API_TOKEN — GitHub Personal Access Token with 'repo' + 'workflow' scopes

   Auth required (session cookie).
*/

export async function onRequestPost({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }

  // Get the webhook URL and GitHub token from environment
  const webhookUrl = env.INTEL_BRIEFING_WEBHOOK_URL;
  const githubToken = env.GITHUB_API_TOKEN;

  if (!webhookUrl || !githubToken) {
    return jsonResponse({
      ok: false,
      error: "Briefing generation not configured. Please set INTEL_BRIEFING_WEBHOOK_URL and GITHUB_API_TOKEN in Cloudflare environment.",
    }, 500);
  }

  try {
    // Dispatch the GitHub Actions workflow
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {},
      }),
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      console.error(`GitHub dispatch returned ${response.status}: ${responseText}`);
      
      if (response.status === 401 || response.status === 403) {
        return jsonResponse({
          ok: false,
          error: "GitHub authentication failed. Check that GITHUB_API_TOKEN is valid and has 'repo' + 'workflow' scopes.",
        }, 403);
      }
      
      return jsonResponse({
        ok: false,
        error: `GitHub returned ${response.status}. The workflow may already be running or the URL may be incorrect.`,
      }, response.status >= 500 ? 502 : 400);
    }

    return jsonResponse({
      ok: true,
      message: "Briefing generation triggered! The GitHub Actions workflow is running. Check https://github.com/turnpagedigital/daily-briefing-site/actions to monitor progress. Briefings will be available at intel.turnpagedigital.com within a few minutes.",
    });
  } catch (error) {
    console.error("Generate briefing error:", error.message);
    return jsonResponse({
      ok: false,
      error: `Failed to trigger briefing generation: ${error.message}`,
    }, 502);
  }
}
