/* functions/intel/api/dockets.js — live docket feed for the unified docket page.
 *
 * The static JSON under /intel/cases/data/ is a build-time snapshot; this
 * endpoint serves the same shape fetched live from CourtListener so the page
 * can refresh itself every minute while open (see startLiveSync in
 * unified-docket.js). Gated by functions/intel/_middleware.js like every
 * other /intel route, so only signed-in admins can reach CourtListener
 * through it.
 *
 * Each docket's CourtListener response is edge-cached for ~55s via the Cache
 * API, so any number of open tabs costs at most one upstream call per docket
 * per minute. Requires the COURTLISTENER_TOKEN env var (same token as the
 * GitHub Actions secret) — without it the endpoint answers ok:false and the
 * page silently keeps its static data.
 */

const API = "https://www.courtlistener.com/api/rest/v4";
const CACHE_SECONDS = 55;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function prettyDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return iso || "";
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function normalizeEntries(results) {
  return (results || []).map((e) => {
    const docs = e.recap_documents || [];
    let docUrl = "";
    if (docs.length && docs[0].filepath_local) {
      docUrl = "https://www.courtlistener.com/" + String(docs[0].filepath_local).replace(/^\/+/, "");
    }
    let desc = String(e.description || "").split(/\s+/).join(" ").trim();
    if (!desc) {
      // RSS-sourced entries leave the docket text empty; the short
      // description lives on the attached document record instead.
      for (const d of docs) {
        const short = String(d.description || "").split(/\s+/).join(" ").trim();
        if (short) { desc = short; break; }
      }
    }
    return {
      entry_number: e.entry_number ?? null,
      date_filed: e.date_filed || "",
      date_display: prettyDate(e.date_filed || ""),
      description: desc,
      landmark: "",
      doc_url: docUrl,
    };
  });
}

async function fetchDocket(target, token, waitUntil) {
  const upstream =
    `${API}/docket-entries/?docket=${target.id}&order_by=-date_filed` +
    `&fields=entry_number,date_filed,description,recap_documents`;
  // Synthetic same-key URL so all viewers share one cached copy per docket
  const cacheKey = new Request(`https://intel-docket-cache.invalid/${target.id}`);
  const cache = caches.default;

  const hit = await cache.match(cacheKey);
  if (hit) {
    const data = await hit.json();
    return { slug: target.slug, docket_url: target.docket_url, entries: data.entries, cached: true };
  }

  const res = await fetch(upstream, {
    headers: {
      Authorization: `Token ${token}`,
      "User-Agent": "turnpage-intel-live/1.0",
    },
  });
  if (!res.ok) return null; // 429/5xx → this case keeps its static entries

  const payload = await res.json();
  const entries = normalizeEntries(payload.results);

  const cacheable = new Response(JSON.stringify({ entries }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `s-maxage=${CACHE_SECONDS}`,
    },
  });
  waitUntil(cache.put(cacheKey, cacheable));
  return { slug: target.slug, docket_url: target.docket_url, entries };
}

export async function onRequestGet(context) {
  const { request, env, waitUntil } = context;
  const token = env.COURTLISTENER_TOKEN;
  if (!token) {
    return json({ ok: false, error: "live sync not configured" });
  }

  // The build-time manifest tells us which cases exist and their docket URLs
  const manifestUrl = new URL("/intel/cases/data/_manifest.json", request.url);
  const mRes = await env.ASSETS.fetch(new Request(manifestUrl));
  if (!mRes.ok) return json({ ok: false, error: "manifest unavailable" });
  const manifest = await mRes.json();

  const targets = manifest
    .map((m) => {
      const idMatch = /\/docket\/(\d+)\//.exec(String(m.docket_url || ""));
      return idMatch
        ? { slug: m.slug, id: idMatch[1], docket_url: m.docket_url }
        : null;
    })
    .filter(Boolean);

  // Sequential with a small gap — CourtListener's burst limiter 429s
  // simultaneous call volleys even with a token. Cached dockets return
  // instantly, so a warm pass costs no upstream calls at all.
  const cases = [];
  const failed = [];
  for (const t of targets) {
    try {
      const r = await fetchDocket(t, token, waitUntil);
      if (r) { cases.push(r); if (!r.cached) await sleep(300); }
      else failed.push(t.slug);
    } catch {
      failed.push(t.slug);
    }
  }

  if (!cases.length) {
    return json({ ok: false, error: "CourtListener refused every request (rate-limited?) — retrying next minute" });
  }
  return json({ ok: true, fetched_at: new Date().toISOString(), cases, failed });
}
