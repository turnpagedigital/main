/* social-draft — POST { prospect } → a one-time situational briefing plus
   LinkedIn / X drafts for a prospect, WITHOUT adding it to the tracker.

   Behind the /intel/_middleware admin gate. Uses the site's ANTHROPIC_API_KEY.
   Grounded in the prospect's already-verified fields (scan_prospects surfaced
   them with a source + rationale), so no web search / no extra latency.

   Writes AS ANDREW: the tone comes from the "drafting as Andrew" voice
   (intelligence-settings.json → voice.andrew), edited on the intel site
   (Manage → Voice). Same voice the nightly social pass uses. */

import { getFileFromGitHub } from "../../api/admin/_github.js";

const MODEL = "claude-sonnet-4-6";

function json(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
}

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ ok: false, error: "Social drafting isn't configured (ANTHROPIC_API_KEY missing)." }, 500);
  }
  let p;
  try { p = (await request.json()).prospect || {}; } catch { return json({ ok: false, error: "Bad request" }, 400); }
  const name = String(p.case_name || "").trim();
  if (!name) return json({ ok: false, error: "Missing case_name" }, 400);

  // "Drafting as Andrew" voice, edited on the intel site (Manage → Voice).
  // Best-effort: if the read fails, fall through to the content guardrails only.
  let andrewVoice = "";
  try {
    const vs = await getFileFromGitHub(env, "src/data/intelligence-settings.json", "intelligence-settings.json");
    andrewVoice = String((vs && vs.ok && vs.data && vs.data.voice && vs.data.voice.andrew) || "").trim();
  } catch { /* guardrails-only */ }
  const voiceBlock = andrewVoice
    ? `VOICE — write as Andrew, in his personal voice (managed on the intel site → Manage → Voice; authoritative for tone):\n\n${andrewVoice.slice(0, 6000)}\n\n`
    : "";

  const prompt =
`You are writing a ONE-TIME situational briefing and social posts for Turnpage Digital Markets about a specific legal matter — written AS ANDREW, in his own voice. Use ONLY the verified facts below — do not invent facts, numbers, dates, or outcomes.

MATTER
Headline: ${name}
Parties: ${p.parties || "—"}
Court: ${p.court || "—"}   Case no.: ${p.case_number || "—"}
Why it matters: ${p.why || "—"}
Source: ${p.source_name || "—"} — ${p.source_url || "—"}
Date: ${p.date || "—"}

${voiceBlock}CONTENT RULES (always apply, on top of the voice above)
- Lead with the single sharpest development — a number, a date, or a ruling. No throat-clearing, no "exciting news".
- Be concrete: case names, courts, dollar figures, record dates.
- Never promise outcomes or returns. Never give legal advice. No emojis except an optional single one in the LinkedIn first line.

Return EXACTLY this markdown and nothing else:

## Briefing
<3-5 sentence situational briefing: what happened, why it matters, what's next.>

## LinkedIn
<900-1400 character LinkedIn post; end with one practical takeaway for claimants/creditors, then 3-5 CamelCase hashtags on the final line.>

## X.com
<under 280 characters, telegraph style with "—" separators, 1-3 hashtags>`;

  let resp;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 2000, messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(55000),
    });
  } catch (e) {
    return json({ ok: false, error: "Could not reach the drafting model — try again." }, 502);
  }
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    return json({ ok: false, error: `Drafting model error (${resp.status}). Try again shortly.`, detail: t.slice(0, 200) }, 502);
  }
  const body = await resp.json();
  const md = ((body && body.content && body.content[0] && body.content[0].text) || "").trim();
  const sec = (label) => {
    const m = new RegExp("## " + label + "\\s*\\n+([\\s\\S]*?)(?=\\n## |$)").exec(md);
    return m ? m[1].trim() : "";
  };
  return json({
    ok: true,
    briefing: sec("Briefing"),
    linkedin: sec("LinkedIn"),
    x: sec("X\\.com") || sec("X"),
    raw: md,
  });
}
