import { isAuthed, jsonResponse } from "./_utils.js";

/* Generate Briefing endpoint — triggers briefing generation from intel.turnpage.com

   POST /api/admin/generate-briefing
     → Triggers the daily-briefing pipeline to run immediately
     → intel.turnpage.com will POST generated briefings to /api/admin/posts
     → Returns { ok: true, message: "..." }

   Requires environment variables:
   - INTEL_BRIEFING_WEBHOOK_URL (optional) — URL to POST to trigger generation
     If not set, returns an error.

   Auth required (session cookie).
*/

export async function onRequestPost({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }

  // Get the webhook URL from environment
  const webhookUrl = env.INTEL_BRIEFING_WEBHOOK_URL;
  if (!webhookUrl) {
    return jsonResponse({
      ok: false,
      error: "Briefing generation webhook not configured. Please set INTEL_BRIEFING_WEBHOOK_URL in Cloudflare environment.",
    }, 500);
  }

  try {
    // Call the intel.turnpage.com webhook to trigger briefing generation
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate",
        triggered_at: new Date().toISOString(),
      }),
      timeout: 10000, // 10 second timeout
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      console.error(`Intel webhook returned ${response.status}: ${responseText}`);
      return jsonResponse({
        ok: false,
        error: `Intel service returned ${response.status}. Check logs for details.`,
      }, response.status >= 500 ? 502 : 400);
    }

    const data = await response.json().catch(() => ({}));

    return jsonResponse({
      ok: true,
      message: data.message || "Briefing generation triggered. Briefings will appear in the queue within a few moments.",
    });
  } catch (error) {
    console.error("Generate briefing error:", error.message);
    return jsonResponse({
      ok: false,
      error: `Failed to trigger briefing generation: ${error.message}`,
    }, 502);
  }
}
