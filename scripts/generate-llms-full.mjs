/* generate-llms-full.mjs — write dist/llms-full.txt after the Vite build.
 *
 * The long-form companion to public/llms.txt (llmstxt.org convention): the
 * complete AI Learning Bot Guide as plain markdown, built from the SAME data
 * that renders /ai-guide (src/data/ai-guide.json + live FAQs, deals, bio and
 * testimonials). Editing those files in the admin keeps all three outputs —
 * the React page, the crawler HTML from functions/_middleware.js, and this
 * file — in lockstep on the next deploy.
 */

import { readFile, writeFile } from "node:fs/promises";
import { assembleGuide, buildAiGuideMarkdown } from "../functions/_ai-guide.js";

const ORIGIN = "https://turnpagedigital.com";
const OUT = "dist/llms-full.txt";

const J = async (p) => JSON.parse(await readFile(p, "utf8"));

const data = assembleGuide({
  guide: await J("src/data/ai-guide.json"),
  faqs: await J("src/data/faqs.json"),
  deals: await J("src/data/deals.json"),
  bio: await J("src/data/bio.json"),
  testimonials: await J("src/data/testimonials.json"),
});

const text = buildAiGuideMarkdown(data, ORIGIN);
await writeFile(OUT, text + "\n");
console.log(`llms-full: ${text.length} chars, ${data.faqs.length} FAQs, ${data.deals.length} deals → ${OUT}`);
