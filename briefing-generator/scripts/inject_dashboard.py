#!/usr/bin/env python3
"""For each topic, use the richest advisory.md (largest file) as the controlling
content for the dashboard's center column. Parse markdown handling all citation
formats: [Text](URL), __[Text](URL)__, and reversed [URL](text). Wrap every link
as a brand-styled source-arrow tooltip. Preserve overview + sidebars."""
import re
import datetime as dt
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
TOPICS = ["rewind-tariffs","llm-class-action","crypto-insolvency","fraud-recovery",
          "billion-dollar-class-actions","bankruptcy-creditor-rights"]

# Today's date in the dashboard's display format ("Friday, June 12, 2026").
DATE_PRETTY = dt.date.today().strftime("%A, %B %-d, %Y")
# Matches a "Weekday, Month D, YYYY" date (non-capturing) so we can swap it in
# the header stamp + byline without disturbing the surrounding markup.
_DATE_PAT = (r"(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+"
             r"(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+"
             r"\d{1,2},\s+\d{4}")

def refresh_stamps(html):
    """Update the visible date stamp(s) to today. The body injection only swaps
    the advisory prose; previously the header stamp and byline date stayed frozen
    at whatever was baked into the chassis. Returns (html, count_replaced)."""
    total = 0
    # Header: <div class="stamp">10:00 AM ET &middot; Tuesday, May 19, 2026</div>
    html, n1 = re.subn(
        r'(<div class="stamp">[^<]*?&middot;\s*)' + _DATE_PAT + r'(\s*</div>)',
        lambda m: m.group(1) + DATE_PRETTY + m.group(2), html)
    # Byline: <span class="byline-date">Tuesday, May 19, 2026</span>
    html, n2 = re.subn(
        r'(<span class="byline-date">)' + _DATE_PAT + r'(</span>)',
        lambda m: m.group(1) + DATE_PRETTY + m.group(2), html)
    return html, n1 + n2

ARROW_SVG = '<svg class="src" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 8.5 L8.5 3.5 M5 3.5 L8.5 3.5 L8.5 7" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'

def html_escape(s):
  return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', '&quot;')

def domain_of(url):
  try:
    h = urlparse(url).hostname or ""
    return h.replace("www.", "")
  except Exception:
    return "Source"

def cite_arrow(url, label, excerpt):
  return (f'<span class="src-tip">'
          f'<a class="src-arrow" href="{url}" target="_blank" rel="noopener">{ARROW_SVG}</a>'
          f'<span class="src-tooltip"><span class="src-tooltip-label">{html_escape(label)}</span>{html_escape(excerpt)}</span>'
          f'</span>')

def richest_advisory(slug):
  """Return today's advisory if it exists; otherwise the largest .md file."""
  import datetime as _dt
  pdir = ROOT / slug / "public"
  if not pdir.exists(): return None
  files = list(pdir.glob("advisory-*.md"))
  if not files: return None
  today = _dt.date.today().isoformat()
  today_file = pdir / f"advisory-{today}.md"
  if today_file.exists():
    return today_file
  files.sort(key=lambda p: p.stat().st_size, reverse=True)
  return files[0]

def parse_sources_block(md):
  """Parse '## Sources' block: -[Title](URL) — Publisher (Tier), Date."""
  out = {}
  m = re.search(r"##\s*Sources\s*\n(.*?)(?=\n##|\Z)", md, re.DOTALL)
  if not m: return out
  for line in m.group(1).split("\n"):
    line = line.strip()
    if not line.startswith("-"): continue
    m2 = re.match(
      r"-\s*\[([^\]]+)\]\(([^)]+)\)\s*[—-]\s*([^,(\n]+?)\s*(?:\(([^)]+)\))?\s*,?\s*([^\n]+)?$",
      line
    )
    if m2:
      title = m2.group(1).strip()
      url = m2.group(2).strip()
      publisher = m2.group(3).strip().rstrip(",;:").strip()
      tier = m2.group(4) or ""
      date = (m2.group(5) or "").strip().lstrip(",").strip()
      out[url] = {"title": title, "publisher": publisher, "tier": tier, "date": date}
  return out

def normalize_link_label(label):
  """Strip leading/trailing markdown formatting underscores."""
  label = label.strip()
  while label.startswith("__"): label = label[2:]
  while label.endswith("__"): label = label[:-2]
  while label.startswith("*"): label = label[1:]
  while label.endswith("*"): label = label[:-1]
  return label.strip()

def convert_markdown_inline(text, sources_map):
  """Convert all inline markdown link variants to brand-styled src-arrow tooltips.

  Handles three orderings:
    1. __[Text](URL)__  → bold link
    2. [Text](URL)
    3. [URL](Text)      → reversed
  """
  def link_repl(m):
    a = m.group(1).strip()
    b = m.group(2).strip()
    if a.startswith(("http://", "https://", "www.")):
      url, visible = a, b
    else:
      visible, url = a, b
    visible = normalize_link_label(visible)
    if url in sources_map:
      pub = sources_map[url]["publisher"]
      excerpt = sources_map[url]["title"]
      date = sources_map[url].get("date", "")
      if date: excerpt += f" ({date})"
    else:
      pub = domain_of(url)
      excerpt = visible or url
    # Keep the visible text in the prose, then append the arrow
    return f"{visible}{cite_arrow(url, pub, excerpt)}"

  # __[X](Y)__ handled by stripping __ around the link first via greedy strip
  text = re.sub(r"__\[([^\]]+)\]\(([^)]+)\)__", lambda m: f'[{m.group(1)}]({m.group(2)})', text)
  # Now handle [X](Y)
  text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", link_repl, text)
  # Bold
  text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
  # Italic (single *) — careful not to eat strikethrough or already-converted strong
  text = re.sub(r"(?<!\*)\*([^*\n]+?)\*(?!\*)", r"<em>\1</em>", text)
  return text

def md_body_to_html(md):
  """Convert advisory.md body to HTML with citations. Strip frontmatter and source blocks."""
  sources = parse_sources_block(md)
  # Drop frontmatter / horizontal-rule blocks
  body = md
  if "---" in body:
    parts = body.split("---", 2)
    if len(parts) >= 3:
      body = parts[2]
  # Drop top-level # title
  body = re.sub(r"^#\s+.*?\n", "", body, count=1)
  # Drop source / proposed-articles / tracker / linkedin sections
  for label in ["Sources","Proposed Articles","Proposed Articles for the Briefing Site",
                "Tracker Update","LinkedIn","Lead","Linkedin Post","Approval Action Items"]:
    body = re.sub(rf"##\s*{label}[^\n]*\n.*?(?=\n##|\Z)", "", body, flags=re.DOTALL)
  body = body.strip()

  # Build HTML line-by-line
  lines = body.split("\n")
  out = []
  para_buf = []
  list_buf = []

  def flush_para():
    if not para_buf: return
    raw = " ".join(para_buf).strip()
    if not raw: para_buf.clear(); return
    converted = convert_markdown_inline(raw, sources)
    out.append(f"<p>{converted}</p>")
    para_buf.clear()

  def flush_list():
    if not list_buf: return
    out.append("<ul>")
    for item in list_buf:
      out.append(f"<li>{convert_markdown_inline(item, sources)}</li>")
    out.append("</ul>")
    list_buf.clear()

  for line in lines:
    s = line.strip()
    if not s:
      flush_para(); flush_list(); continue
    if s.startswith("### "):
      flush_para(); flush_list()
      heading = s[4:].strip()
      out.append(f"<h3 class=\"advisory-h3\">{convert_markdown_inline(heading, sources)}</h3>")
      continue
    if s.startswith("## "):
      flush_para(); flush_list()
      heading = s[3:].strip()
      out.append(f"<h2>{convert_markdown_inline(heading, sources)}</h2>")
      continue
    if s.startswith("# "):
      flush_para(); flush_list(); continue
    if s.startswith("- "):
      flush_para()
      list_buf.append(s[2:]); continue
    if s.startswith("*") and s.endswith("*") and not s.startswith("**"):
      flush_para(); flush_list()
      out.append(f"<p class='advisory-disclaimer'><em>{convert_markdown_inline(s[1:-1], sources)}</em></p>")
      continue
    if list_buf: flush_list()
    para_buf.append(s)
  flush_para(); flush_list()
  return "\n".join(out)

def patch(slug):
  src = richest_advisory(slug)
  if not src:
    print(f"  ! {slug}: no advisory.md found"); return
  with open(src, encoding="utf-8") as f: md = f.read()
  body_html = md_body_to_html(md)

  dash = ROOT / slug / "dashboard.html"
  if not dash.exists(): return
  with open(dash, encoding="utf-8") as f: original = f.read()

  # Refresh the visible date stamp(s) first, then inject the advisory body.
  html, stamp_n = refresh_stamps(original)

  # Find the advisory-body section
  body_m = re.search(r'(<div class="advisory-body">)(.*?)(</div>\s*\n\s*</div>)', html, re.DOTALL)
  if not body_m:
    print(f"  ✗ {slug}: advisory-body not found")
    if html != original:  # still persist a date-stamp refresh
      with open(dash, "w", encoding="utf-8") as f: f.write(html)
      print(f"  ✓ {slug}: date stamp refreshed → {DATE_PRETTY}")
    return
  head, body, tail = body_m.group(1), body_m.group(2), body_m.group(3)

  # Preserve "Today at a Glance" overview section + recommended actions area
  glance_m = re.search(r'<h2>Today at a Glance</h2>\s*<p>.*?</p>\s*', body, re.DOTALL)
  glance_html = glance_m.group(0) if glance_m else ""

  # Reconstruct the body with glance + new advisory content
  new_body = "\n" + glance_html + "\n" + body_html + "\n      "
  new_html = html.replace(head + body + tail, head + new_body + tail, 1)

  if new_html != original:
    arrows = body_html.count('class="src-arrow"')
    with open(dash, "w", encoding="utf-8") as f: f.write(new_html)
    print(f"  ✓ {slug}: rich content from {src.name} ({arrows} citations; {stamp_n} date stamp(s) → {DATE_PRETTY})")

def main():
  for slug in TOPICS: patch(slug)

if __name__ == "__main__":
  main()
