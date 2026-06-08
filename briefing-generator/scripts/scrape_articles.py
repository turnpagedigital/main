#!/usr/bin/env python3
"""
Article scraping and extraction: fetch the actual articles behind news
headlines and use Claude Haiku to extract material updates (dates, figures,
docket numbers, rulings, settlement amounts, etc.).

This enriches the headlines discovered by fetch_news with real article
content before handing off to Sonnet for briefing analysis.
"""
import sys, re, urllib.request
import html as _html


def fetch_article_text(url, timeout=8, max_chars=25000):
    """Fetch and clean article text from URL. Returns (text, success_bool)."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "TurnpageBriefing/1.0"})
        response = urllib.request.urlopen(req, timeout=timeout)
        html = response.read().decode("utf-8", "replace")
        # Remove script/style tags
        html = re.sub(r'<script[^>]*>.*?</script>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
        html = re.sub(r'<style[^>]*>.*?</style>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
        # Strip HTML tags
        text = re.sub(r'<[^>]+>', ' ', html)
        # Decode entities
        text = _html.unescape(text)
        # Collapse whitespace
        text = ' '.join(text.split())
        return text[:max_chars], True
    except Exception as e:
        return "", False


def scrape_and_enrich(news_items, client, max_articles=6):
    """
    For each news item, fetch the article and extract the update with Haiku.

    Returns enriched items list: each has {title, source, date, url, extracted_update}.
    Falls back to headline-only if fetch/extraction fails for any item.

    Args:
        news_items: list of {title, source, date, url} from fetch_news
        client: Anthropic client instance
        max_articles: cap on articles to fetch per topic (bounds cost/time)
    """
    if not news_items:
        return []

    enriched = []
    for item in news_items[:max_articles]:
        print(f"      scrape: {item['title'][:50]}...", flush=True)
        article_text, fetched = fetch_article_text(item['url'])

        if not fetched or not article_text:
            # Fall back to headline
            enriched.append(item)
            continue

        try:
            response = client.messages.create(
                model="claude-haiku-4-5",
                max_tokens=200,
                messages=[{
                    "role": "user",
                    "content": f"""Extract the KEY UPDATE from this news article.
What actually happened? Include: dates, dollar figures, docket numbers, judge names, ruling, settlement terms, percentages, statutory citations.
Be concise: 1-2 sentences max.

Headline: {item['title']}
Source: {item['source']}

Article text:
{article_text[:6000]}

Output ONLY the extracted update. No preamble, no commentary."""
                }]
            )
            extracted = response.content[0].text.strip()
            item["extracted_update"] = extracted
            enriched.append(item)
        except Exception as e:
            print(f"        ! extraction failed: {e}", file=sys.stderr)
            # Fall back to headline
            enriched.append(item)

    return enriched


def build_enriched_news_block(items):
    """Build markdown news block from enriched items (headlines + extracted updates)."""
    if not items:
        return ("# Live news scan (last 72h)\n\nNo fresh whitelisted headlines retrieved. "
                "Fall back to incremental carry-forward per SKILL.md and mark any unverified "
                "claim with `(__[Source — needs verification](URL)__)`.\n\n")

    lines = [
        "# Live news scan (last 72h — scraped & extracted)\n",
        "Ground today's lede and DELTA sections on these real, recent updates. "
        "Cite the underlying primary source where possible; verify each link before relying on it.\n"
    ]

    for item in items:
        if "extracted_update" in item:
            lines.append(f"- **{item['title']}** — {item['source']}\n")
            lines.append(f"  {item['extracted_update']}\n")
            lines.append(f"  {item['url']}\n")
        else:
            # Fallback: headline only
            lines.append(f"- {item['title']} — {item['source']}\n")
            lines.append(f"  {item['url']}\n")

    return "\n".join(lines) + "\n\n"
