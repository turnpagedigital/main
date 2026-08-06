/* Link health check — GET ?url=<courtlistener url> answers whether that page
   currently loads (2xx) or is clearly broken (404/429/5xx/timeout), so the
   docket pages can route a click to the claims-agent mirror instead of
   landing the reader on CourtListener's error page.

   Verdicts are edge-cached for 60s, so a burst of clicks costs one upstream
   probe. FAIL-OPEN by design: a 403 (likely bot-blocking of this edge fetch,
   not of the reader's browser) or an unexpected check failure reports
   ok:true — only clear, user-visible breakage diverts the click. */

const ALLOWED_HOST = "www.courtlistener.com";

export async function onRequestGet({ request, waitUntil }) {
  const target = new URL(request.url).searchParams.get("url") || "";
  let t;
  try { t = new URL(target); } catch { return json({ ok: false, reason: "bad-url" }, 400); }
  if (t.protocol !== "https:" || t.hostname !== ALLOWED_HOST) {
    return json({ ok: false, reason: "host-not-allowed" }, 400);
  }
  t.hash = "";

  const cache = caches.default;
  const cacheKey = new Request("https://intel-linkcheck-cache.invalid/" + encodeURIComponent(t.href));
  const hit = await cache.match(cacheKey);
  if (hit) return new Response(hit.body, hit);

  let verdict;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 4500);
  try {
    const res = await fetch(t.href, {
      redirect: "follow",
      signal: ctl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (res.ok) verdict = { ok: true, status: res.status };
    else if (res.status === 403) verdict = { ok: true, status: 403 }; // bot-block of the check, most likely
    else if (res.status === 404 || res.status === 410) verdict = { ok: false, status: res.status, reason: "not-found" };
    else if (res.status === 429) verdict = { ok: false, status: 429, reason: "rate-limited" };
    else verdict = { ok: false, status: res.status, reason: "server-error" };
  } catch {
    verdict = { ok: false, reason: ctl.signal.aborted ? "timeout" : "unreachable" };
  } finally {
    clearTimeout(timer);
  }

  const out = new Response(JSON.stringify(verdict), {
    headers: { "Content-Type": "application/json", "Cache-Control": "s-maxage=60" },
  });
  waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
