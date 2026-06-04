import React from "react";
import PageRenderer from "../components/PageRenderer.jsx";

/* Crypto page — section composition driven by src/data/page-compositions.json.
   To edit sections: /admin/pages → Locked Crypto.
   To edit card content: /admin/pages → Marketing Pages → Crypto. */
export default function Crypto() {
  return <PageRenderer pageKey="crypto" />;
}
