import React from "react";
import PageRenderer from "../components/PageRenderer.jsx";

/* Home page — section composition driven by src/data/page-compositions.json.
   To reorder, hide, or add sections: /admin/pages.
   To edit individual content (bio, deals, FAQ, etc.): use the relevant
   Content tab in admin. */
export default function Home() {
  return <PageRenderer pageKey="home" />;
}
