(function () {
  "use strict";

  /* Site footer on the intel pages — same structure and content as the public
     site's footer (Footer.jsx): logo, the admin-managed link columns from
     footer.json, and the copyright/social bottom row, restyled with the intel
     pages' theme variables so dark mode works. Data files are copied into
     /intel at build time (copy-intel.mjs), so admin footer edits land here on
     the next deploy. External file — CSP kills inline JS on /intel/*. */

  var mount = document.getElementById("tn-site-footer");
  if (!mount) return;
  var P = location.pathname.indexOf("/cases/") !== -1 ? "../" : "";

  // Sticky footer WITHOUT making <body> a flex container directly — that broke
  // the max-width + margin:auto centering of the page sections (they shrank to
  // content and centered instead of spanning full width). Wrap everything above
  // the footer in one flex-growing block; inside it, normal block flow (and so
  // margin:auto centering) is restored, while the wrapper's flex:1 still pushes
  // the footer to the bottom on short pages.
  if (!document.getElementById("tn-content-wrap")) {
    var wrap = document.createElement("div");
    wrap.id = "tn-content-wrap";
    var moved = [], n = document.body.firstChild;
    while (n && n !== mount) { var nx = n.nextSibling; moved.push(n); n = nx; }
    document.body.insertBefore(wrap, mount);
    moved.forEach(function (node) { wrap.appendChild(node); });
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  var EXT_ARROW = '<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" style="opacity:0.55"><path d="M4 2h6v6M10 2l-7 7" stroke-linecap="round"/></svg>';

  function socialIcon(url) {
    if (/^mailto:/i.test(url)) {
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>';
    }
    if (/wa\.me|whatsapp/i.test(url)) {
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.65-4.95A8.5 8.5 0 1 1 8 19.35Z"/><path d="M9 10a5 5 0 0 0 5 5l1.5-1.5-2-1-1 .5a3 3 0 0 1-1.5-1.5l.5-1-1-2Z"/></svg>';
    }
    if (/t\.me|telegram/i.test(url)) {
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-11 11"/><path d="M22 2 15 22l-4-9-9-4Z"/></svg>';
    }
    if (/linkedin/i.test(url)) {
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.22 8.16h4.56V23H.22V8.16Zm7.44 0h4.37v2.02h.06c.61-1.15 2.1-2.37 4.32-2.37 4.62 0 5.47 3.04 5.47 7v8.19h-4.55v-7.26c0-1.73-.03-3.96-2.41-3.96-2.42 0-2.79 1.89-2.79 3.84V23H7.66V8.16Z"/></svg>';
    }
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"/></svg>';
  }

  var css =
    // Sticky footer: make the page a full-height flex column so the footer's
    // margin-top:auto pushes it to the bottom of the viewport when the content
    // above is too short to fill the page (and sits right after it otherwise).
    "body{min-height:100vh;display:flex;flex-direction:column;}" +
    "#tn-content-wrap{flex:1 0 auto;min-width:0;}" +
    "#tn-site-footer{background:var(--paper-2,#F4F5F7);color:var(--ink,#0A0A0A);border-top:1px solid var(--line-strong,rgba(10,10,10,0.14));flex-shrink:0;}" +
    "#tn-site-footer .tf-inner{max-width:1440px;margin:0 auto;padding:clamp(3rem,5vw,4.5rem) clamp(1.5rem,5vw,4rem) 2rem;}" +
    "#tn-site-footer .tf-grid{display:grid;grid-template-columns:minmax(0,1.6fr) repeat(var(--tf-cols,4),minmax(0,1fr));gap:clamp(2rem,4vw,3.5rem);margin-bottom:clamp(3rem,5vw,4rem);}" +
    "#tn-site-footer .tf-logo img{height:56px;width:auto;display:block;}" +
    "[data-theme=dark] #tn-site-footer .tf-logo img{filter:invert(1) hue-rotate(180deg);}" +
    "#tn-site-footer .tf-col-title{font-size:0.82rem;color:var(--ink-60,rgba(10,10,10,0.6));margin:0 0 0.9rem;font-weight:500;}" +
    "#tn-site-footer ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:0.55rem;}" +
    "#tn-site-footer .tf-grid a{font-size:0.95rem;color:var(--ink,#0A0A0A);text-decoration:none;display:inline-flex;align-items:center;gap:0.35em;}" +
    "#tn-site-footer .tf-grid a:hover{color:var(--ink-60,rgba(10,10,10,0.6));}" +
    "#tn-site-footer .tf-bottom{padding-top:1.5rem;border-top:1px solid var(--line,rgba(10,10,10,0.08));display:flex;flex-wrap:wrap;gap:1rem 2rem;justify-content:space-between;align-items:center;}" +
    "#tn-site-footer .tf-copy{font-size:0.82rem;color:var(--ink-60,rgba(10,10,10,0.6));margin:0;}" +
    "#tn-site-footer .tf-social{display:flex;align-items:center;gap:0.9rem;}" +
    "#tn-site-footer .tf-social a{color:var(--ink-60,rgba(10,10,10,0.6));display:inline-flex;}" +
    "#tn-site-footer .tf-social a:hover{color:var(--ink,#0A0A0A);}" +
    "@media (max-width:900px){#tn-site-footer .tf-grid{grid-template-columns:1fr 1fr;gap:2rem;}#tn-site-footer .tf-logo{grid-column:1/-1;}}" +
    "@media (max-width:540px){#tn-site-footer .tf-grid{grid-template-columns:1fr;}#tn-site-footer .tf-logo{grid-column:auto;}}";

  function render(footer, contact) {
    var cols = (footer.columns || []).filter(function (c) { return !c.hidden; });
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    mount.style.setProperty("--tf-cols", String(cols.length || 1));

    var colsHtml = cols.map(function (col) {
      var links = (col.links || []).filter(function (l) { return !l.hidden && l.href; });
      return (
        "<div>" +
          '<p class="tf-col-title">' + esc(col.title || "") + "</p>" +
          "<ul>" + links.map(function (l) {
            var ext = !!l.external;
            return "<li><a href=\"" + esc(l.href) + "\"" +
              (ext ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" +
              esc(l.label || l.id || "") + (ext ? " " + EXT_ARROW : "") + "</a></li>";
          }).join("") + "</ul>" +
        "</div>"
      );
    }).join("");

    var socials = ((contact && contact.social_links) || []).filter(function (s) { return s && s.url; });
    var socialHtml = socials.length
      ? '<div class="tf-social">' + socials.map(function (s) {
          return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + socialIcon(s.url) + "</a>";
        }).join("") + "</div>"
      : "";

    mount.innerHTML =
      '<div class="tf-inner">' +
        '<div class="tf-grid">' +
          '<div class="tf-logo"><a href="https://www.turnpagedigital.com/"><img src="/turnpage-logo.png" alt="Turnpage Digital Markets" loading="lazy"></a></div>' +
          colsHtml +
        "</div>" +
        '<div class="tf-bottom">' +
          '<p class="tf-copy">' + esc(footer.copyright || "") + "</p>" +
          socialHtml +
        "</div>" +
      "</div>";
  }

  function getJson(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  Promise.all([
    getJson(P + "footer.json"),
    getJson(P + "contact-form.json").catch(function () { return null; }),
  ]).then(function (res) {
    render(res[0] || { columns: [] }, res[1]);
  }).catch(function () { /* footer is decorative — never break the page */ });
})();
