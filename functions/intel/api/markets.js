/* Markets tile data — GET returns a small set of case-relevant symbols with
   price, day change, and a ~30-point sparkline. Sources are keyless and free:
   CoinGecko for crypto (7d sparkline included), Stooq daily CSV for stocks.
   Assembled response is edge-cached for an hour, so a day of dashboard
   visits costs a handful of upstream calls. Symbols that fail to fetch are
   simply omitted — the tile renders whatever came back. */

const SYMBOLS = [
  { sym: "BTC",  label: "Bitcoin",      kind: "crypto", id: "bitcoin",  href: "crypto-insolvency/dashboard.html" },
  { sym: "ETH",  label: "Ethereum",     kind: "crypto", id: "ethereum", href: "crypto-insolvency/dashboard.html" },
  { sym: "SKLZ", label: "Skillz",       kind: "stock",  id: "sklz.us",  href: "cases/papaya-gaming.html", case_slug: "papaya-gaming" },
  { sym: "SNBR", label: "Sleep Number", kind: "stock",  id: "snbr.us",  href: "cases/sleep-number.html",  case_slug: "sleep-number" },
];

const CACHE_KEY = "https://intel-markets-cache.invalid/v1";

function downsample(arr, n) {
  if (!arr || arr.length <= n) return arr || [];
  const out = [];
  for (let i = 0; i < n; i++) out.push(arr[Math.floor((i * (arr.length - 1)) / (n - 1))]);
  return out;
}

async function fetchCrypto(items) {
  const ids = items.map((s) => s.id).join(",");
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=" + ids +
      "&sparkline=true&price_change_percentage=24h",
    { headers: { "User-Agent": "tpdm-intel", Accept: "application/json" } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return items.map((s) => {
    const row = data.find((d) => d.id === s.id);
    if (!row) return null;
    return {
      sym: s.sym, label: s.label, kind: s.kind, href: s.href, case_slug: s.case_slug || null,
      price: row.current_price,
      chg_pct: row.price_change_percentage_24h,
      range: "7d",
      spark: downsample((row.sparkline_in_7d && row.sparkline_in_7d.price) || [], 30),
    };
  }).filter(Boolean);
}

async function fetchStock(s) {
  const res = await fetch("https://stooq.com/q/d/l/?s=" + s.id + "&i=d", {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh) tpdm-intel" },
  });
  if (!res.ok) return null;
  const text = await res.text();
  const rows = text.trim().split("\n").slice(1)
    .map((l) => l.split(","))
    .filter((c) => c.length >= 5 && c[4] && c[4] !== "N/D");
  if (rows.length < 2) return null;
  const closes = rows.slice(-30).map((c) => Number(c[4]));
  const last = closes[closes.length - 1];
  const prev = closes[closes.length - 2];
  return {
    sym: s.sym, label: s.label, kind: s.kind, href: s.href, case_slug: s.case_slug || null,
    price: last,
    chg_pct: prev ? ((last - prev) / prev) * 100 : 0,
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
