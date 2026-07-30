/* CourtListener docket lookup — auto-fills case details in the Cases editor.

   GET /api/admin/courtlistener-lookup?docket_id=69058235
   → { ok, case_name, docket_number, judge, court }

   Calls the free CourtListener REST v4 API. Uses COURTLISTENER_TOKEN if it's
   set in the environment (higher rate limits); otherwise calls anonymously.
   Degrades gracefully — on any failure returns { ok:false, error } and the
   user can fill the fields manually.
*/

import { isAuthed, jsonResponse } from "./_utils.js";

const API = "https://www.courtlistener.com/api/rest/v4";

function clHeaders(env) {
  const h = { "User-Agent": "tpdm-admin", Accept: "application/json" };
  if (env.COURTLISTENER_TOKEN) h.Authorization = `Token ${env.COURTLISTENER_TOKEN}`;
  return h;
}

async function getJson(url, env) {
  const r = await fetch(url, { headers: clHeaders(env) });
  if (!r.ok) throw new Error(`CourtListener ${r.status}`);
  return r.json();
}

export async function onRequest({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }

  const docketId = new URL(request.url).searchParams.get("docket_id");
  if (!docketId || !/^\d+$/.test(String(docketId).trim())) {
    return jsonResponse({ ok: false, error: "A numeric docket_id is required" }, 400);
  }

  try {
    const dr = await fetch(`${API}/dockets/${docketId}/`, { headers: clHeaders(env) });
    if (dr.status === 401 || dr.status === 403) {
      return jsonResponse({
        ok: false,
        error: "CourtListener needs an API token. Add COURTLISTENER_TOKEN in Cloudflare, or fill the fields in manually.",
      }, 200);
    }
    if (dr.status === 404) {
      return jsonResponse({ ok: false, error: "No CourtListener docket found for that ID." }, 200);
    }
    if (dr.status === 429) {
      return jsonResponse({
        ok: false,
        error: env.COURTLISTENER_TOKEN
          ? "CourtListener is rate-limiting right now — wait a minute and retry, or fill the fields in manually."
          : "CourtListener throttles anonymous lookups. Add COURTLISTENER_TOKEN in Cloudflare (Settings → Environment variables), retry the deployment, and this will work — or fill the fields in manually.",
      }, 200);
    }
    if (!dr.ok) {
      return jsonResponse({ ok: false, error: `CourtListener returned ${dr.status}. Fill the fields in manually.` }, 200);
    }
    const dj = await dr.json();

    const caseName = dj.case_name || dj.case_name_full || dj.case_name_short || "";
    const docketNumber = dj.docket_number || "";
    const judge = dj.assigned_to_str || dj.referred_to_str || "";

    // Resolve the court's full name (the docket gives a hyperlink or a court id).
    let court = "";
    try {
      let courtUrl = "";
      if (typeof dj.court === "string" && /^https?:\/\//.test(dj.court)) courtUrl = dj.court;
      else if (dj.court_id) courtUrl = `${API}/courts/${dj.court_id}/`;
      if (courtUrl) {
        const cj = await getJson(courtUrl, env);
        court = cj.full_name || cj.short_name || cj.citation_string || "";
      }
    } catch { /* court name is best-effort */ }

    if (!caseName && !docketNumber && !judge) {
      return jsonResponse({ ok: false, error: "Docket found but no usable fields returned" }, 404);
    }

    return jsonResponse({
      ok: true,
      case_name: caseName,
      docket_number: docketNumber,
      judge,
      court,
      docket_url: dj.absolute_url ? `https://www.courtlistener.com${dj.absolute_url}` : "",
    });
  } catch (e) {
    return jsonResponse({ ok: false, error: `Lookup failed: ${e.message}` }, 502);
  }
}
