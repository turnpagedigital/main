import React from "react";
import PageRenderer from "../components/PageRenderer.jsx";

/* AI Copyright page — section composition driven by src/data/page-compositions.json.
   To edit sections: /admin/pages → Copyright Claims.
   To edit card content: /admin/pages → Marketing Pages → AI Copyright. */
export default function Copyright() {
  return <PageRenderer pageKey="ai-copyright" />;
}
