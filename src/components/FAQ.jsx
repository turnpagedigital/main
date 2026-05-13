import React, { useState } from "react";
import { FONT, INK, INK_60 } from "../data/tokens.js";

/* OffDeal-style FAQ accordion. Items: [{ q, a }] where a can be string or
   string[] (one paragraph per item). */
export default function FAQ({ items = [], openFirst = true }) {
  const [openIdx, setOpenIdx] = useState(openFirst ? 0 : -1);
  return (
    <div>
      {items.map((it, i) => {
        const isOpen = openIdx === i;
        const paragraphs = Array.isArray(it.a) ? it.a : [it.a];
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
              {paragraphs.map((p, j) => <p key={j}>{p}</p>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
