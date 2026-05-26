import React, { useState } from "react";
import { FONT, INK, INK_60 } from "../data/tokens.js";

/* FAQ accordion.
   items: [{ q, a, active?, pages? }]
   a can be a string or string[] (one paragraph per element).
   Inline [link text](url) syntax in answers is rendered as <a> tags. */

/* Parse [text](url) links in a single text string */
function renderInline(text, keyPfx) {
  if (typeof text !== "string") return String(text ?? "");
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  const nodes = [];
  let last = 0, m, li = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const isExt = /^https?:\/\//.test(m[2]);
    nodes.push(
      <a
        key={`${keyPfx}-${li++}`}
        href={m[2]}
        target={isExt ? "_blank" : undefined}
        rel={isExt ? "noopener noreferrer" : undefined}
        style={{ color: "inherit", textDecoration: "underline" }}
      >
        {m[1]}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  // Return a plain string if no links were found (avoids unnecessary array wrapping)
  return nodes.length === 1 && typeof nodes[0] === "string" ? nodes[0] : nodes;
}

export default function FAQ({ items = [], openFirst = true }) {
  const [openIdx, setOpenIdx] = useState(openFirst ? 0 : -1);
  return (
    <div>
      {items.map((it, i) => {
        const isOpen = openIdx === i;
        // Normalise answer to an array of paragraphs (split double-newlines if string)
        let paras;
        if (Array.isArray(it.a)) {
          paras = it.a;
        } else if (typeof it.a === "string") {
          // Split on blank lines; single newlines become spaces within a paragraph
          paras = it.a.split(/\n{2,}/).map(p => p.replace(/\n/g, " ").trim()).filter(Boolean);
          if (paras.length === 0) paras = [it.a];
        } else {
          paras = [String(it.a ?? "")];
        }
        return (
          <div key={i} className={`faq-item${isOpen ? " open" : ""}`}>
            <button
              className="faq-toggle"
              aria-expanded={isOpen}
              onClick={() => setOpenIdx(isOpen ? -1 : i)}
            >
              <span>{it.q}</span>
              <span className="faq-icon" aria-hidden>{isOpen ? "−" : "+"}</span>
            </button>
            <div className="faq-body">
              {paras.map((p, j) => (
                <p key={j}>{renderInline(p, `${i}-${j}`)}</p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
