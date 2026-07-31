#!/usr/bin/env python3
"""
extract_uploads.py — pull searchable text out of uploaded docket PDFs.

Walks uploads.json for documents whose `text` is empty, extracts up to ~20KB
of text from the PDF (pypdf), and writes it back so the docket page's search
reaches inside attached documents. Safe to run repeatedly; no-ops when
everything is already extracted or pypdf is unavailable.
"""
import json, sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
INDEX = REPO_ROOT / "uploads.json"
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
            if d.get("text"):
                continue
            pdf = REPO_ROOT / Path(d.get("path", "")).relative_to("briefing-generator") \
                if str(d.get("path", "")).startswith("briefing-generator/") else None
            if not pdf or not pdf.exists():
                continue
            text = extract(pdf)
            if text is not None:
                d["text"] = text
                changed += 1
                print(f"  ✓ extracted {len(text)} chars from {pdf.name}")
    if changed:
        INDEX.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"=== Upload extraction done: {changed} document(s) processed ===")


if __name__ == "__main__":
    main()
