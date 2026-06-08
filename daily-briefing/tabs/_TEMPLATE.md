---
slug: example-topic
display_name: "Example Topic"
emoji: "📌"
tab_color: "#58a6ff"
voice_grade: litigation-grade
linkedin_enabled: true
linkedin_mode: other
sales_close_entity: "Turnpage Digital Markets"
project_dir_search:
  - "example-topic"
news_fetch_command: null
themes:
  - First theme to monitor
  - Second theme
  - Third theme
source_tiers:
  tier_1:
    - Reuters
    - Bloomberg
    - WSJ
    - AP
    - FT
  tier_3:
    - "Law firm A"
    - "Law firm B"
  exclude:
    - "New York Times"
    - Al Jazeera
hashtags:
  - "#Tag1"
  - "#Tag2"
watchlist:
  # Pre-filing / pre-event leading-indicator pipeline.
  # The Watchlist renders as a compact box under "Story of the Day" in the
  # center column of this tab's dashboard. Items must be situations developing
  # toward potential ripeness — NOT yet a filed case / charged action / adjudicated event.
  # Aim for 3-5 items per tab. Each item: name (bolded) + one-line signal.
  # The daily run reads research_themes to scan for new pre-filing names and
  # to retire items that became "ripe" (i.e., a filing / charge / adjudication occurred).
  research_themes:
    - First pre-filing / pre-event theme to monitor
    - Second theme
  items:
    - name: "Example Co."
      signal: "Short one-line description of the pre-filing signal (e.g., advisor hire, stock drop, regulator inquiry)."
---

# Notes on this tab

Replace this body with editorial notes:

- What makes this topic distinct from adjacent tabs
- Who the target audience is (in-house counsel, fund managers, partner firms)
- Recurring sub-themes the daily run should look for
- Cross-references to other tabs (e.g., "Cross-reference Tab NN when XYZ")
- Any signal tests for what counts as 'high urgency' versus normal
- Preferred analytical frame (transactional, litigation, regulatory)
