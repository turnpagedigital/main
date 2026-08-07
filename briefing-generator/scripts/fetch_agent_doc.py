#!/usr/bin/env python3
"""
fetch_agent_doc.py — download a docket document from the case's claims agent.

Free alternative to PACER for bankruptcy cases: claims agents host the same
filings at no cost, no login. Runs in a GitHub Action (headless Chromium via
Playwright) because agent sites render their dockets with JavaScript.

Inputs (env):  SLUG, ENTRY_NUMBER
Reads:         cases/data/<slug>.json → claims_administrator {name, url}
Writes:        uploads/<slug>|n<N>/Dkt-<N>.pdf, updates uploads.json, and
               titles the docket entry from the agent's document name.
The workflow commits whatever this writes.

Adapters:      Kroll, Stretto, Epiq (built). Verita is reCAPTCHA-gated —
               not automatable; the script exits with a clear message so the
               caller can fall back to PACER or manual download.
"""
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse, urljoin

REPO_ROOT = Path(__file__).resolve().parent.parent
CASES_DIR = REPO_ROOT / "cases" / "data"
UPLOAD_DIR = REPO_ROOT / "uploads"
INDEX = REPO_ROOT / "uploads.json"
MAX_BYTES = 25 * 1024 * 1024


def fail(msg, code=2):
    print(f"  ! {msg}", file=sys.stderr)
    sys.exit(code)


def clean(s):
    return " ".join((s or "").split())


def agent_kind(name, url):
    hay = (name + " " + url).lower()
    if "kroll" in hay or "ra.kroll" in hay:
        return "kroll"
    if "stretto" in hay:
        return "stretto"
    if "epiq" in hay:
        return "epiq"
    if "verita" in hay or "veritaglobal" in hay or "kccllc" in hay:
        return "verita"
    if "omniagent" in hay:
        return "omni"
    return None


def _launch(pw):
    """Shared headless-Chromium setup — desktop UA, no automation tell, the
    viewport agent tables lay out for, and download capture enabled."""
    browser = pw.chromium.launch(args=[
        "--no-sandbox", "--disable-blink-features=AutomationControlled",
    ])
    ctx = browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36",
        locale="en-US", timezone_id="America/New_York",
        accept_downloads=True,
    )
    ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined});")
    page = ctx.new_page()
    page.set_viewport_size({"width": 1600, "height": 1200})
    return browser, ctx, page


def _pdf_via_download_or_fetch(page, link_handle, pdf_url):
    """The two-step PDF capture Kroll proved: click the link and catch the
    browser's own download (which clears bot 202/challenge cookies a raw
    fetch can't), then fall back to polling an in-page fetch. Returns bytes
    (may be empty / non-PDF — caller validates)."""
    import base64 as _b64
    body = b""
    try:
        with page.expect_download(timeout=60000) as dl_info:
            link_handle.click()
        body = Path(dl_info.value.path()).read_bytes()
    except Exception as ex:
        print(f"  · click-download route failed ({ex}); retrying via fetch", file=sys.stderr)
    if not body[:5].startswith(b"%PDF") and pdf_url:
        for attempt in range(6):
            result = page.evaluate(
                """async (href) => {
                    const r = await fetch(href, { credentials: 'include' });
                    const buf = await r.arrayBuffer();
                    const bytes = new Uint8Array(buf);
                    let bin = '';
                    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
                    return { status: r.status, type: r.headers.get('content-type') || '',
                             head: bin.slice(0, 200), b64: btoa(bin) };
                }""",
                pdf_url,
            )
            fetched = _b64.b64decode(result["b64"])
            if fetched[:5].startswith(b"%PDF"):
                body = fetched
                break
            print(f"  · fetch attempt {attempt + 1}: status={result['status']} "
                  f"type={result['type']} head={result['head'][:80]!r}", file=sys.stderr)
            page.wait_for_timeout(2500)
    return body


def stretto_fetch(base_url, docket_number):
    """Stretto (WordPress + AWS WAF). The court-docket page filters server-side
    via ?search_docket_no=N and renders each matching filing as a table row
    with a direct PDF link. Returns (pdf_bytes, document_title)."""
    from playwright.sync_api import sync_playwright

    parsed = urlparse(base_url)
    case_seg = [p for p in parsed.path.split("/") if p]
    if not case_seg:
        fail("could not derive the Stretto case path from the agent URL")
    origin = f"{parsed.scheme}://{parsed.netloc}"
    docket_url = (f"{origin}/{case_seg[0]}/court-docket/"
                  f"?search_docket_no={int(docket_number)}")

    with sync_playwright() as pw:
        browser, ctx, page = _launch(pw)
        # Warm the AWS WAF challenge on the plain case page first: its
        # challenge.js computes an `aws-waf-token` cookie the browser must
        # hold before content loads. Wait for that cookie, THEN hit search.
        page.goto(f"{origin}/{case_seg[0]}/court-docket/",
                  wait_until="networkidle", timeout=45000)
        for _ in range(20):
            if any(c["name"] == "aws-waf-token" for c in ctx.cookies()):
                break
            page.wait_for_timeout(1000)
        page.goto(docket_url, wait_until="networkidle", timeout=45000)
        try:
            page.wait_for_selector("a[href$='.pdf']", timeout=30000)
        except Exception:
            diag = page.evaluate(
                "() => ({ title: document.title, pdfs: document.querySelectorAll(\"a[href$='.pdf']\").length,"
                " waf: document.body.innerText.slice(0,120) })")
            browser.close()
            fail(f"no PDF links on the Stretto docket for {case_seg[0]} — diag={diag}")
        page.wait_for_timeout(1000)

        # PDFs aren't scoped to <tbody><tr> here — walk every PDF link and read
        # its row's first cell (the docket number). The ?search filter may not
        # apply on direct load, so we match the number across all rows.
        target_href = title = link_handle = None
        for link in page.query_selector_all("a[href$='.pdf']"):
            row = link.evaluate_handle("el => el.closest('tr') || el.closest('[class*=row]')")
            cells = row.query_selector_all("td") if row else []
            if not cells:
                continue
            first = re.sub(r"(?i)docket\s*(no\.?|#)?", "", cells[0].inner_text()).strip()
            if first.isdigit() and int(first) == int(docket_number):
                target_href = link.get_attribute("href")
                link_handle = link
                if len(cells) >= 3:
                    title = clean(cells[2].inner_text())[:300] or None
                if not title:
                    title = clean(link.inner_text())[:300] or None
                break

        if not target_href:
            browser.close()
            fail(f"Dkt. {docket_number} not found on the Stretto docket for {case_seg[0]}")

        pdf_url = target_href if target_href.startswith("http") else urljoin(docket_url, target_href)
        body = _pdf_via_download_or_fetch(page, link_handle, pdf_url)
        browser.close()

    if len(body) > MAX_BYTES:
        fail("document exceeds 25MB")
    if not body[:5].startswith(b"%PDF"):
        fail("Stretto returned something that is not a PDF (WAF wall or changed layout?)")
    return body, title


def epiq_fetch(base_url, docket_number):
    """Epiq (dm.epiq11.com — Angular SPA). The dockets page renders each entry
    with a 'View' link carrying the docketId; clicking it downloads the PDF.
    We derive the case code from the agent URL (/case/<code>/dockets) and let
    the app render, then match the row by its docket number. Returns
    (pdf_bytes, document_title)."""
    from playwright.sync_api import sync_playwright

    parsed = urlparse(base_url)
    segs = [p for p in parsed.path.split("/") if p]
    code = segs[segs.index("case") + 1] if "case" in segs else (segs[0] if segs else "")
    if not code:
        fail("could not derive the Epiq case code from the agent URL")
    origin = f"{parsed.scheme}://{parsed.netloc}"
    dockets_url = f"{origin}/case/{code}/dockets"

    with sync_playwright() as pw:
        browser, ctx, page = _launch(pw)
        page.goto(dockets_url, wait_until="networkidle", timeout=45000)
        # Angular renders the docket list after an API round-trip; nudge any
        # lazy render with a scroll, then wait for the entry links.
        try:
            page.wait_for_selector("app-search-card, [class*='docket-card'], a[href*='docketId']", timeout=35000)
        except Exception:
            pass
        page.mouse.wheel(0, 4000)
        page.wait_for_timeout(2500)
        if not page.query_selector("a[href*='docketId']"):
            diag = page.evaluate(
                "() => ({ title: document.title,"
                " docketLinks: document.querySelectorAll(\"a[href*='docketId']\").length,"
                " viewLinks: Array.from(document.querySelectorAll('a')).filter(a=>/view/i.test(a.textContent)).length,"
                " hrefs: Array.from(document.querySelectorAll('a')).map(a=>a.getAttribute('href')).filter(h=>h&&h.length>3).slice(0,8),"
                " body: document.body.innerText.slice(0,160) })")
            browser.close()
            fail(f"Epiq dockets did not render for case {code} — diag={diag}")
        page.wait_for_timeout(1000)

        # Match the row whose docket-number text equals N, take its View link.
        # (Docket rows put the number in a bold/label element; scan each row's
        # text and its View anchor.)
        target = page.evaluate(
            """(n) => {
                const links = Array.from(document.querySelectorAll("a[href*='docketId']"));
                for (const a of links) {
                    const u = new URL(a.href);
                    if (String(u.searchParams.get('docketNumber')) === String(n)) {
                        return { href: a.href, title: (a.closest('[class*=card],tr,[class*=row]')||a).innerText.replace(/\\s+/g,' ').trim().slice(0,300) };
                    }
                }
                return null;
            }""",
            int(docket_number),
        )
        if not target:
            browser.close()
            fail(f"Dkt. {docket_number} not found on the Epiq docket for {code}")

        link_handle = page.query_selector(
            f"a[href*='docketNumber={int(docket_number)}']") or \
            page.query_selector("a[href*='docketId']")
        body = _pdf_via_download_or_fetch(page, link_handle, target["href"])
        browser.close()

    if len(body) > MAX_BYTES:
        fail("document exceeds 25MB")
    if not body[:5].startswith(b"%PDF"):
        fail("Epiq returned something that is not a PDF (login wall or changed layout?)")
    # Prefer a clean pleading title if the row text carried one.
    title = None
    m = re.search(r"[A-Z][A-Za-z].{8,}", target.get("title") or "")
    if m:
        title = clean(m.group(0))[:300]
    return body, title


def kroll_fetch(base_url, docket_number):
    """Kroll runs a jqGrid. Load every row at once ('show all' is a built-in
    page size), find the exact 'Docket # N' row, download its PDF. Returns
    (pdf_bytes, document_title)."""
    from playwright.sync_api import sync_playwright

    parsed = urlparse(base_url)
    case_seg = [p for p in parsed.path.split("/") if p]
    if not case_seg:
        fail("could not derive the Kroll case path from the agent URL")
    origin = f"{parsed.scheme}://{parsed.netloc}"
    case_path = f"{origin}/{case_seg[0]}"
    docket_url = f"{case_path}/Home-DocketInfo"

    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=[
            "--no-sandbox", "--disable-blink-features=AutomationControlled",
        ])
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36",
            locale="en-US", timezone_id="America/New_York",
            accept_downloads=True,
        )
        # Hide the headless automation tell most bot checks look for.
        ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined});")
        page = ctx.new_page()
        page.set_viewport_size({"width": 1600, "height": 1200})  # desktop tablesaw layout
        page.goto(docket_url, wait_until="networkidle", timeout=45000)

        # Wait for jqGrid to exist, then reload it with every row on one page.
        page.wait_for_function(
            "() => window.jQuery && window.jQuery('#results-table').length "
            "&& window.jQuery('#results-table').jqGrid('getGridParam','records') > 0",
            timeout=30000,
        )
        page.evaluate(
            "() => window.jQuery('#results-table')"
            ".jqGrid('setGridParam', {rowNum: 1000000, page: 1}).trigger('reloadGrid')"
        )
        # Wait until every record is rendered into the DOM.
        page.wait_for_function(
            "() => { var g = window.jQuery('#results-table');"
            " var recs = g.jqGrid('getGridParam','records');"
            " return recs > 0 && document.querySelectorAll('#results-table tbody tr').length >= recs; }",
            timeout=45000,
        )
        page.wait_for_timeout(1500)

        # The docket number is the first cell. Tablesaw shows it bare ("505")
        # on desktop and label-prefixed ("Docket # 505") when stacked — strip
        # the optional label and match the integer either way. The document's
        # title is the download link's own text.
        target_href = None
        title = None
        link_handle = None
        rows = page.query_selector_all("#results-table tbody tr")
        for row in rows:
            tds = row.query_selector_all("td")
            if not tds:
                continue
            first = re.sub(r"(?i)docket\s*#|dkt\.?", "", tds[0].inner_text()).strip()
            if not first.isdigit() or int(first) != int(docket_number):
                continue
            link = row.query_selector("a[href*='DownloadPDF']")
            if link:
                target_href = link.get_attribute("href")
                title = clean(link.inner_text())[:300] or None
                link_handle = link
            break

        if not target_href:
            browser.close()
            fail(f"Dkt. {docket_number} not found on the Kroll docket for "
                 f"{case_seg[0]} (scanned {len(rows)} rows)")

        pdf_url = (origin + target_href) if target_href.startswith("/") else urljoin(docket_url, target_href)
        body = b""

        # Primary: click the real link and capture the browser's own download.
        # Headless Chromium has no PDF viewer, so a PDF navigation fires a
        # download event — and the browser handles the site's 202 bot-challenge
        # (which a raw fetch can't), then delivers the actual file.
        try:
            with page.expect_download(timeout=60000) as dl_info:
                link_handle.click()
            body = Path(dl_info.value.path()).read_bytes()
        except Exception as ex:
            print(f"  · click-download route failed ({ex}); retrying via fetch", file=sys.stderr)

        # Fallback: the 202 challenge often clears on retry once the browser
        # holds the challenge cookie — poll the in-page fetch a few times.
        if not body[:5].startswith(b"%PDF"):
            import base64 as _b64
            for attempt in range(6):
                result = page.evaluate(
                    """async (href) => {
                        const r = await fetch(href, { credentials: 'include' });
                        const buf = await r.arrayBuffer();
                        const bytes = new Uint8Array(buf);
                        let bin = '';
                        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
                        return { status: r.status, type: r.headers.get('content-type') || '',
                                 head: bin.slice(0, 200), b64: btoa(bin) };
                    }""",
                    pdf_url,
                )
                fetched = _b64.b64decode(result["b64"])
                if fetched[:5].startswith(b"%PDF"):
                    body = fetched
                    break
                print(f"  · fetch attempt {attempt + 1}: status={result['status']} "
                      f"type={result['type']} head={result['head'][:80]!r}", file=sys.stderr)
                page.wait_for_timeout(2500)
        browser.close()

    if len(body) > MAX_BYTES:
        fail("document exceeds 25MB")
    if not body[:5].startswith(b"%PDF"):
        fail("agent returned something that is not a PDF (login wall or changed layout?)")
    return body, title


ADAPTERS = {"kroll": kroll_fetch, "stretto": stretto_fetch, "epiq": epiq_fetch}


def commit_locally(slug, entry_number, pdf_bytes, title):
    key = f"{slug}|n{entry_number}"
    key_dir = re.sub(r"[^a-zA-Z0-9._-]+", "-", key)
    filename = f"Dkt-{entry_number}.pdf"
    rel_path = f"briefing-generator/uploads/{key_dir}/{filename}"
    dest = UPLOAD_DIR / key_dir / filename
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(pdf_bytes)

    idx = {"docs": {}}
    if INDEX.exists():
        try:
            idx = json.loads(INDEX.read_text(encoding="utf-8"))
            idx.setdefault("docs", {})
        except Exception:
            idx = {"docs": {}}
    lst = [d for d in idx["docs"].get(key, []) if d.get("path") != rel_path]
    lst.append({
        "name": filename, "path": rel_path, "size": len(pdf_bytes),
        "uploaded_at": _now(), "text": "", "source": "claims-agent",
    })
    idx["docs"][key] = lst
    INDEX.write_text(json.dumps(idx, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Title the entry from the agent's document name (protected from sync)
    if title:
        cp = CASES_DIR / f"{slug}.json"
        if cp.exists():
            try:
                data = json.loads(cp.read_text(encoding="utf-8"))
                for e in (data.get("docket") or {}).get("entries") or []:
                    if e.get("entry_number") == int(entry_number):
                        e["description"] = title
                        e["titled_from_upload"] = True
                        break
                cp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            except Exception as ex:
                print(f"  · could not title entry: {ex}", file=sys.stderr)
    return rel_path


def _now():
    # Actions runners have a real clock; avoid importing datetime at top for clarity
    import datetime as dt
    return dt.datetime.now(dt.timezone.utc).isoformat()


def main():
    slug = (os.environ.get("SLUG") or "").strip()
    entry_number = (os.environ.get("ENTRY_NUMBER") or "").strip()
    if not re.match(r"^[a-z0-9-]{1,60}$", slug) or not entry_number.isdigit():
        fail("SLUG and numeric ENTRY_NUMBER required")
    entry_number = int(entry_number)

    cp = CASES_DIR / f"{slug}.json"
    if not cp.exists():
        fail(f"no case data for {slug}")
    data = json.loads(cp.read_text(encoding="utf-8"))
    ca = data.get("claims_administrator") or {}
    name, url = clean(ca.get("name")), (ca.get("url") or "").strip()
    if not url:
        fail(f"{slug} has no claims administrator")

    kind = agent_kind(name, url)
    if kind == "verita":
        fail("Verita is reCAPTCHA-gated — automatic fetch is blocked; use PACER or download manually")
    if kind not in ADAPTERS:
        fail(f"no automatable adapter for agent '{name}' ({kind or 'unknown'})")

    print(f"=== Fetching Dkt. {entry_number} for {slug} from {name} ({kind}) ===", flush=True)
    pdf_bytes, title = ADAPTERS[kind](url, entry_number)
    path = commit_locally(slug, entry_number, pdf_bytes, title)
    print(f"  ✓ {len(pdf_bytes)} bytes → {path}" + (f"  (titled: {title[:60]})" if title else ""))


if __name__ == "__main__":
    main()
