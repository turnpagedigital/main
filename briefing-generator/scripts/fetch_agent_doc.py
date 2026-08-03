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

Adapters:      Kroll (built). Verita is reCAPTCHA-gated — not automatable;
               the script exits with a clear message so the caller can fall
               back to PACER or manual download.
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
    if "verita" in hay or "veritaglobal" in hay or "kccllc" in hay:
        return "verita"
    if "omniagent" in hay:
        return "omni"
    if "epiq" in hay:
        return "epiq"
    return None


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
        browser = pw.chromium.launch(args=["--no-sandbox"])
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36",
            accept_downloads=True,
        )
        page = ctx.new_page()
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

        target_href = None
        title = None
        for row in page.query_selector_all("#results-table tbody tr"):
            txt = row.inner_text()
            m = re.search(r"Docket #\s*(\d+)", txt)
            if not m or int(m.group(1)) != int(docket_number):
                continue
            a = row.query_selector("a[href*='DownloadPDF']")
            if a:
                target_href = a.get_attribute("href")
                nm = re.search(r"Document Name\s*(.+?)\s*(?:Date Filed|$)", txt, re.S)
                if nm:
                    title = clean(nm.group(1))[:300]
            break

        if not target_href:
            browser.close()
            fail(f"Dkt. {docket_number} not found on the Kroll docket for {case_seg[0]}")

        pdf_url = (origin + target_href) if target_href.startswith("/") else urljoin(docket_url, target_href)
        resp = ctx.request.get(pdf_url, timeout=60000)
        if not resp.ok:
            browser.close()
            fail(f"document download failed ({resp.status})")
        body = resp.body()
        browser.close()

    if len(body) > MAX_BYTES:
        fail("document exceeds 25MB")
    if not body[:5].startswith(b"%PDF"):
        fail("agent returned something that is not a PDF (login wall or changed layout?)")
    return body, title


ADAPTERS = {"kroll": kroll_fetch}


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
