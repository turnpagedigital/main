import { isAuthed, jsonResponse } from "./_utils.js";

/* Generate Briefing endpoint — triggers briefing generation workflow

   POST /api/admin/generate-briefing
     → Dispatches the daily-briefing GitHub Actions workflow
     → Workflow runs the Python generation script
     → Generated dashboards are committed back to the repo
     → Cloudflare Pages auto-deploys
     → Returns { ok: true, message: "..." }

   The workflow is defined at: .github/workflows/daily-briefing.yml

   Requires environment variables (in Cloudflare):
   - GITHUB_API_TOKEN — GitHub Personal Access Token with 'repo' + 'workflow' scopes

   Auth required (session cookie).
*/

export async function onRequestPost({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }

  // Get the GitHub token from environment
  const githubToken = env.GITHUB_API_TOKEN;

  if (!githubToken) {
    return jsonResponse({
      ok: false,
      error: "Briefing generation not configured. Please set GITHUB_API_TOKEN in Cloudflare environment with 'repo' + 'workflow' scopes.",
    }, 500);
  }

  try {
    // Dispatch the GitHub Actions workflow in the main repo
    const webhookUrl = "https://api.github.com/repos/turnpagedigital/main/actions/workflows/daily-briefing.yml/dispatches";
    
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "dev",  // Trigger on dev branch
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
      message: "✅ Briefing generation triggered! The GitHub Actions workflow is running. Check https://github.com/turnpagedigital/main/actions to monitor progress. Generated dashboards will appear in public/briefing-dashboard within 5-15 minutes.",
    });
  } catch (error) {
    console.error("Generate briefing error:", error.message);
    return jsonResponse({
      ok: false,
      error: `Failed to trigger briefing generation: ${error.message}`,
    }, 502);
  }
}
