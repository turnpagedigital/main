/**
 * Cloudflare Pages Function: /api/extract-claim
 *
 * Reads an uploaded Bartz v. Anthropic settlement claim form (PDF or image)
 * with Claude and returns structured data the registration flow uses to
 * auto-fill itself: the claimant's contact info, the list of claimed works,
 * and — per work — whether the claimant is the sole owner and whether the
 * work has a co-author. From that we classify each work for pricing
 * (self = full rate, publisher-shared = half rate, co-authored = excluded).
 *
 * The number that actually gets quoted is recomputed by the browser and again
 * server-side in /api/register from these counts, so this endpoint only has to
 * extract faithfully — it never decides the price.
 *
 * Env: ANTHROPIC_API_KEY (shared with /api/admin/flow-generator).
 */

import { classifyWork, summarizeWorks } from "./_claim-links.js";

const MODEL = "claude-haiku-4-5-20251001"; // fast + cheap; bump for accuracy if needed
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_WORKS = 300;
const DOC_TYPES = new Set(["application/pdf"]);
const IMG_TYPES = new Set(["image/png", "image/jpeg"]);

const ALLOWED_ORIGINS = [
  "https://turnpagedigital.com",
  "https://www.turnpagedigital.com",
];
function corsHeadersFor(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/[a-z0-9-]+\.turnpagedigital\.pages\.dev$/i.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "https://turnpagedigital.com",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const SYSTEM_PROMPT = `You are a data-extraction assistant for a Bartz v. Anthropic copyright settlement CLAIM. The claimant filled it out. Read the document and return ONLY the claimant's contact info and the works they claimed.

The document may be EITHER the official mail-in claim form (with "Section A/B/C" headings) OR an online-submission confirmation PDF (with "Contact Information", "Works Information", and "Other Rightsholders" headings). The wording and layout differ, but the same information is present in both — extract it regardless of format. Ignore page headers, footers, URLs, confirmation numbers, and legal boilerplate.

Extract these:

CONTACT (the claimant's own info):
- "firstName" / "lastName": split the claimant's name as best you can.
- "email", "phone": the claimant's email address and phone number ("" if absent).

WORKS: one object per claimed work. Each work lists a Title, optionally an Author and Publisher, an ISBN or ASIN number, a U.S. Copyright Office Registration Number, and the answer to "Are you the sole owner of the reproduction rights?" (Yes/No). Each work may also have one or more "other / additional rightsholders", each with a Rightsholder Type (Author, Author Loan-Out, Literary Trust, Literary Estate, Publisher, or Other). For each work output:
  "title": string,
  "author": string ("" if blank),
  "publisher": string ("" if blank),
  "isbn": string (the ISBN or ASIN if given, else ""),
  "registration": string ("" if blank),
  "soleOwner": boolean  — true ONLY if the "sole owner of the reproduction rights" answer for that work is clearly Yes,
  "hasCoAuthor": boolean — true if the work lists an additional/other rightsholder whose type is an AUTHOR kind (Author, Author Loan-Out, Literary Trust, or Literary Estate). A Publisher-type co-owner is NOT a co-author, so it does NOT make hasCoAuthor true.

Rules:
- Include only works that are actually filled in. Ignore blank rows and template placeholder text.
- Match each work to its own sole-owner answer and its own other-rightsholders — don't mix data across works.
- If a value is unreadable or missing, use "" (or false for booleans). Never invent data.
- If the sole-owner answer is blank or ambiguous for a work, set soleOwner=false.

Respond with ONLY this JSON, no markdown fences or commentary:
{
  "contact": { "firstName": "", "lastName": "", "email": "", "phone": "" },
  "works": [ { "title": "", "author": "", "publisher": "", "isbn": "", "registration": "", "soleOwner": false, "hasCoAuthor": false } ]
}`;

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = corsHeadersFor(request);
  const fail = (msg, status = 400) =>
    new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (!env.ANTHROPIC_API_KEY) return fail("Claim reading is not configured", 500);

    let body;
    try { body = await request.json(); }
    catch { return fail("Bad request"); }

    const dataBase64 = body && typeof body.dataBase64 === "string" ? body.dataBase64 : "";
    const fileType = body && typeof body.type === "string" ? body.type : "";
    if (!dataBase64 || !/^[A-Za-z0-9+/=]+$/.test(dataBase64)) return fail("Missing or malformed file");
    if ((dataBase64.length * 3) / 4 > MAX_FILE_BYTES) return fail("File is over the 8 MB limit");

    let sourceBlock;
    if (DOC_TYPES.has(fileType)) {
      sourceBlock = { type: "document", source: { type: "base64", media_type: "application/pdf", data: dataBase64 } };
    } else if (IMG_TYPES.has(fileType)) {
      sourceBlock = { type: "image", source: { type: "base64", media_type: fileType, data: dataBase64 } };
    } else {
      return fail("Unsupported file type — upload a PDF, PNG, or JPG");
    }

    let apiResp;
    try {
      apiResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 8000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: [sourceBlock, { type: "text", text: "Extract the claimant contact info and works from this claim form." }] }],
        }),
      });
    } catch (err) {
      return fail(`Could not reach the claim reader: ${err.message}`, 502);
    }
    if (!apiResp.ok) {
      const t = await apiResp.text().catch(() => "");
      console.error("extract-claim Anthropic error", apiResp.status, t.slice(0, 300));
      return fail("The claim reader had a problem. You can enter your details manually instead.", 502);
    }

    const apiBody = await apiResp.json();
    const raw = (apiBody?.content?.[0]?.text || "").trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();

    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch {
      return fail("Couldn't read the claim form automatically. You can enter your details manually.", 422);
    }

    const contactIn = parsed && typeof parsed.contact === "object" && parsed.contact ? parsed.contact : {};
    const contact = {
      firstName: str(contactIn.firstName, 80),
      lastName: str(contactIn.lastName, 80),
      email: str(contactIn.email, 160),
      phone: str(contactIn.phone, 40),
    };

    const worksIn = Array.isArray(parsed && parsed.works) ? parsed.works.slice(0, MAX_WORKS) : [];
    const works = worksIn
      .map((w) => (w && typeof w === "object" ? w : {}))
      .filter((w) => str(w.title, 300) || str(w.isbn, 60))
      .map((w) => {
        const work = {
          title: str(w.title, 300),
          author: str(w.author, 200),
          publisher: str(w.publisher, 200),
          isbn: str(w.isbn, 60),
          registration: str(w.registration, 60),
          soleOwner: w.soleOwner === true,
          hasCoAuthor: w.hasCoAuthor === true,
        };
        work.category = classifyWork(work);
        return work;
      });

    const counts = summarizeWorks(works);

    return new Response(JSON.stringify({ contact, works, counts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("extract-claim error", err.message);
    return fail("Something went wrong reading the claim form.", 500);
  }
}

function str(v, max) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function onRequestOptions(context) {
  return new Response(null, { headers: corsHeadersFor(context.request) });
}
