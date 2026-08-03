#!/usr/bin/env python3
"""
extract_uploads.py — make uploaded docket PDFs searchable and self-describing.

For every document in uploads.json:
  1. Extract up to ~20KB of text (pypdf) so the docket page's search reaches
     inside attached documents.
  2. Read the pleading's formal title off the first page — via Claude when
     ANTHROPIC_API_KEY is set (best), else a caps-run heuristic — and RENAME
     the docket entry the upload is attached to, so the row says what the
     document actually is. Renamed entries are flagged titled_from_upload and
     fetch_dockets.py never overwrites them.

Safe to run repeatedly; no-ops when everything is extracted and titled.
"""
import json, os, re, sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
INDEX = REPO_ROOT / "uploads.json"
CASES_DIR = REPO_ROOT / "cases" / "data"
MAX_TEXT = 20000

try:
    from pypdf import PdfReader
except ImportError:
    print("pypdf not installed — skipping upload text extraction")
    sys.exit(0)


def extract(path):
    try:
        reader = PdfReader(str(path))
        chunks = []
        total = 0
        for page in reader.pages:
            t = page.extract_text() or ""
            t = " ".join(t.split())
            if t:
                chunks.append(t)
                total += len(t)
            if total >= MAX_TEXT:
                break
        return " ".join(chunks)[:MAX_TEXT]
    except Exception as ex:
        print(f"  ! extraction failed for {path.name}: {ex}", file=sys.stderr)
        return None


def title_via_claude(text):
    """Best titles come from asking Claude to read the caption page."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    try:
        from anthropic import Anthropic
    except ImportError:
        return None
    try:
        client = Anthropic(api_key=api_key)
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content":
                "This is the first-page text of a court filing. Reply with ONLY the "
                "document's full formal title as it appears on the pleading — the "
                "complete title including all numbered sub-clauses, e.g. "
                "\"Amended Notice of Appeal and Statement of Election to Have Appeal "
                "Heard by District Court\". Use title case. No quotes, no commentary, "
                "no case caption, no docket number.\n\n" + text[:4000]}],
        )
        title = " ".join(resp.content[0].text.split()).strip().strip('"')
        return title[:300] if 10 <= len(title) <= 300 else None
    except Exception as ex:
        print(f"  ! title model call failed: {ex}", file=sys.stderr)
        return None


def title_heuristic(text):
    """Fallback when no API key: pull the pleading title off the first page.
    Page text arrives whitespace-collapsed, so work on ALL-CAPS runs: skip
    caption furniture, prefer runs with pleading words, longest wins."""
    head = text[:3000]
    runs = re.findall(r"(?:[A-Z][A-Z0-9'’()&,./\-]*(?:\s+|$)){2,}", head)
    runs = [" ".join(r.split()) for r in runs]
    FURNITURE = re.compile(
        r"UNITED STATES|BANKRUPTCY|DISTRICT|COURT|DIVISION|IN RE|CHAPTER|"
        r"CASE NO|DEBTOR|HONORABLE|JUDGE|HEARING DATE", re.I)
    PLEADING = re.compile(
        r"NOTICE|MOTION|ORDER|APPLICATION|OBJECTION|RESPONSE|REPLY|"
        r"DECLARATION|STIPULATION|APPEAL|BRIEF|STATEMENT|CERTIFICATE|"
        r"COMPLAINT|PETITION|MEMORANDUM", re.I)
    candidates = [r.strip(" ._-—)(,") for r in runs]
    candidates = [c for c in candidates if len(c) >= 16 and not FURNITURE.search(c)]
    if not candidates:
        return None
    pleading = [c for c in candidates if PLEADING.search(c)]
    best = max(pleading or candidates, key=len)
    return best.title()[:300] if len(best) >= 16 else None


def apply_title_to_entry(key, title):
    """Rename the docket entry the upload is attached to. Only entry-number
    keys (slug|nNN) — date/description keys would break their own linkage."""
    slug, _, rest = key.partition("|")
    if not rest.startswith("n"):
        return False
    try:
        entry_number = int(rest[1:])
    except ValueError:
        return False
    case_path = CASES_DIR / f"{slug}.json"
    if not case_path.exists():
        return False
    try:
        data = json.loads(case_path.read_text(encoding="utf-8"))
    except Exception:
        return False
    changed = False
    for e in (data.get("docket") or {}).get("entries") or []:
        if e.get("entry_number") == entry_number:
            if e.get("description") != title:
                e["description"] = title
                e["titled_from_upload"] = True
                changed = True
            break
    if changed:
        case_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return changed


def main():
    if not INDEX.exists():
        print("no uploads.json — nothing to do")
        return
    try:
        data = json.loads(INDEX.read_text(encoding="utf-8"))
    except Exception:
        print("uploads.json unreadable — skipping")
        return
    changed = 0
    for key, docs in (data.get("docs") or {}).items():
        for d in docs:
            if not d.get("text"):
                p = str(d.get("path", ""))
                pdf = (REPO_ROOT / Path(p).relative_to("briefing-generator")
                       if p.startswith("briefing-generator/") else None)
                if pdf and pdf.exists():
                    text = extract(pdf)
                    if text is not None:
                        d["text"] = text
                        changed += 1
                        print(f"  ✓ extracted {len(text)} chars from {pdf.name}")
            # Name the pleading: read the title off the first page and rename
            # the docket entry so the row says what the document is.
            if d.get("text") and not d.get("title"):
                title = title_via_claude(d["text"]) or title_heuristic(d["text"])
                if title:
                    d["title"] = title
                    changed += 1
                    if apply_title_to_entry(key, title):
                        print(f"  ✓ entry renamed: {title[:90]}")
                    else:
                        print(f"  · title saved (entry not renamed): {title[:90]}")
    if changed:
        INDEX.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"=== Upload extraction done: {changed} update(s) ===")


if __name__ == "__main__":
    main()
