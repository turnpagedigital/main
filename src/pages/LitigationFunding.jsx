import React from "react";
import PageRenderer from "../components/PageRenderer.jsx";

/* Litigation Finance page — section composition driven by src/data/page-compositions.json.
   To edit sections: /admin/pages → Litigation Finance.
   To edit card content: /admin/pages → Marketing Pages → Litigation Finance. */
export default function LitigationFunding() {
  return <PageRenderer pageKey="litigation-finance" />;
}
