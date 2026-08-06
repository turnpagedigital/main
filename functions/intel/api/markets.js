/* Markets tile data — GET returns a small set of case-relevant symbols with
   price, day change, and a ~30-point sparkline. Sources are keyless and free:
   Coinbase Exchange for crypto (candles + 24h stats), Yahoo chart for stocks
   (price and day change only — Yahoo gates history for anonymous clients).
   Assembled response is edge-cached for an hour, so a day of dashboard
   visits costs a handful of upstream calls. Symbols that fail to fetch are
   simply omitted — the tile renders whatever came back. */

const SYMBOLS = [
  { sym: "BTC",  label: "Bitcoin",      kind: "crypto", id: "BTC-USD", href: "crypto-insolvency/dashboard.html" },
  { sym: "ETH",  label: "Ethereum",     kind: "crypto", id: "ETH-USD", href: "crypto-insolvency/dashboard.html" },
  { sym: "SKLZ", label: "Skillz",       kind: "stock",  id: "SKLZ",     href: "cases/papaya-gaming.html", case_slug: "papaya-gaming" },
  { sym: "SNBR", label: "Sleep Number", kind: "stock",  id: "SNBR",     href: "cases/sleep-number.html",  case_slug: "sleep-number" },
];

const CACHE_KEY = "https://intel-markets-cache.invalid/v3";

function downsample(arr, n) {
  if (!arr || arr.length <= n) return arr || [];
  const out = [];
  for (let i = 0; i < n; i++) out.push(arr[Math.floor((i * (arr.length - 1)) / (n - 1))]);
  return out;
}

async function fetchCrypto(items) {
  // Coinbase Exchange public API — keyless, serves candles and 24h stats.
  // (CoinGecko throttles shared datacenter IPs; Binance geo-blocks the US.)
  const out = [];
  for (const s of items) {
    try {
      const [cRes, sRes] = await Promise.all([
        fetch("https://api.exchange.coinbase.com/products/" + s.id + "/candles?granularity=86400",
          { headers: { "User-Agent": "tpdm-intel", Accept: "application/json" } }),
        fetch("https://api.exchange.coinbase.com/products/" + s.id + "/stats",
          { headers: { "User-Agent": "tpdm-intel", Accept: "application/json" } }),
      ]);
      if (!cRes.ok || !sRes.ok) continue;
      const candles = await cRes.json();   // [[time, low, high, open, close, vol], ...] newest first
      const stats = await sRes.json();
      const closes = candles.slice(0, 30).reverse().map((r) => r[4]);
      const last = Number(stats.last);
      const open = Number(stats.open);
      if (!isFinite(last)) continue;
      out.push({
        sym: s.sym, label: s.label, kind: s.kind, href: s.href, case_slug: s.case_slug || null,
        price: last,
        chg_pct: isFinite(open) && open ? ((last - open) / open) * 100 : 0,
        range: "30d",
        spark: closes,
      });
    } catch { /* omit this symbol */ }
  }
  return out;
}

async function fetchStock(s) {
  // Yahoo's chart endpoint — keyless JSON. (Stooq's CSV now sits behind a
  // JavaScript proof-of-work wall, so it can't be fetched server-side.)
  const res = await fetch(
    "https://query1.finance.yahoo.com/v8/finance/chart/" + s.id + "?range=3mo&interval=1d",
    { headers: { "User-Agent": "Mozilla/5.0 (Macintosh) tpdm-intel", Accept: "application/json" } }
  );
  if (!res.ok) return null;
  const j = await res.json();
  const r0 = j && j.chart && j.chart.result && j.chart.result[0];
  if (!r0 || !r0.meta) return null;
  const closes = (((r0.indicators || {}).quote || [{}])[0].close || [])
    .filter((v) => v != null).slice(-30);
  const price = r0.meta.regularMarketPrice != null ? r0.meta.regularMarketPrice : closes[closes.length - 1];
  const prev = r0.meta.chartPreviousClose;
  if (price == null) return null;
  return {
    sym: s.sym, label: s.label, kind: s.kind, href: s.href, case_slug: s.case_slug || null,
    price,
    chg_pct: prev ? ((price - prev) / prev) * 100 : 0,
    range: "30d",
    spark: closes,
  };
}

export async function onRequestGet({ waitUntil }) {
  const cache = caches.default;
  const hit = await cache.match(new Request(CACHE_KEY));
  if (hit) return new Response(hit.body, hit);

  const out = [];
  try {
    out.push(...(await fetchCrypto(SYMBOLS.filter((s) => s.kind === "crypto"))));
  } catch { /* omit crypto rows */ }
  for (const s of SYMBOLS.filter((x) => x.kind === "stock")) {
    try {
      const row = await fetchStock(s);
      if (row) out.push(row);
    } catch { /* omit this symbol */ }
  }

  const body = JSON.stringify({
    ok: out.length > 0,
    updated: new Date().toISOString(),
    symbols: out,
  });
  const res = new Response(body, {
    headers: { "Content-Type": "application/json", "Cache-Control": "s-maxage=3600" },
  });
  if (out.length) waitUntil(cache.put(new Request(CACHE_KEY), res.clone()));
  return res;
}
