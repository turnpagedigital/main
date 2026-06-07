import React from "react";
import { FONT, INK_60 } from "../../../data/tokens.js";

/* PreviewFrame — browser-window chrome around the live page preview.
   Mimics the framing used by GoDaddy/Wix editors: gray title bar with
   traffic-light circles + a fake URL bar showing the current path. */
export default function PreviewFrame({ path = "/", children }) {
  return (
    <div style={{
      border: "1px solid #E5E7EB",
      borderRadius: 6,
      overflow: "hidden",
      background: "#fff",
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    }}>
      {/* Fake browser title bar */}
      <div style={{
        background: "#F4F5F7",
        borderBottom: "1px solid #E5E7EB",
        padding: "0.5rem 0.85rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
      }}>
        {/* Traffic-light dots */}
        <div style={{ display: "flex", gap: 6 }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map(c => (
            <span key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c, opacity: 0.85 }} />
          ))}
        </div>
        {/* Fake URL bar */}
        <div style={{
          flex: 1,
          background: "#fff",
          border: "1px solid #E5E7EB",
          borderRadius: 4,
          padding: "0.25rem 0.6rem",
          fontFamily: "monospace",
          fontSize: "0.74rem",
          color: INK_60,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <span style={{ opacity: 0.5 }}>🔒</span>
          <span>https://www.turnpagedigital.com{path}</span>
        </div>
      </div>

      {/* Page body — height is controlled by CenterPreview's clip div */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}
