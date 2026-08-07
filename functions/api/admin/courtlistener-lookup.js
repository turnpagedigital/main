/* CourtListener docket lookup — auto-fills case details in the Cases editor
   and finds dockets for the Prospects → Track flow.

   GET /api/admin/courtlistener-lookup?docket_id=69058235
   → { ok, case_name, docket_number, judge, court, docket_url }

   GET /api/admin/courtlistener-lookup?q=26-90888 Hughes Satellite
   → { ok, results: [{docket_id, case_name, court, docket_number,
                      date_filed, docket_url}] }   (RECAP search, top 6)

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

// RECAP search → docket candidates. One request against the 600/day budget.
async function searchDockets(q, env) {
  const url = `${API}/search/?type=r&q=${encodeURIComponent(q)}&order_by=score%20desc`;
  const r = await fetch(url, { headers: clHeaders(env) });
  if (r.status === 401 || r.status === 403) {
    return { ok: false, error: "CourtListener needs an API token. Add COURTLISTENER_TOKEN in Cloudflare, or paste the docket URL manually." };
  }
  if (r.status === 429) {
    return { ok: false, error: "CourtListener is rate-limiting right now — wait a minute and retry, or paste the docket URL manually." };
  }
  if (!r.ok) return { ok: false, error: `CourtListener returned ${r.status}.` };
  const j = await r.json();
  const seen = new Set();
  const results = [];
  for (const it of j.results || []) {
    const id = it.docket_id || it.docketId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const abs = it.docket_absolute_url || it.absolute_url || "";
    results.push({
      docket_id: String(id),
      case_name: it.caseName || it.case_name || "",
      court: it.court || it.court_citation_string || "",
      docket_number: it.docketNumber || it.docket_number || "",
      date_filed: it.dateFiled || it.date_filed || "",
      docket_url: abs
        ? `https://www.courtlistener.com${abs}`
        : `https://www.courtlistener.com/docket/${id}/-/`,
    });
    if (results.length >= 6) break;
  }
  return { ok: true, results };
}

export async function onRequest({ request, env }) {
  if (!(await isAuthed(request, env))) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }

  const params = new URL(request.url).searchParams;
  const q = (params.get("q") || "").trim().slice(0, 200);
  if (q) {
    try {
      return jsonResponse(await searchDockets(q, env));
    } catch (e) {
      return jsonResponse({ ok: false, error: `Search failed: ${e.message}` }, 502);
    }
  }

  const docketId = params.get("docket_id");
  if (!docketId || !/^\d+$/.test(String(docketId).trim())) {
    return jsonResponse({ ok: false, error: "A numeric docket_id or a q search term is required" }, 400);
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
