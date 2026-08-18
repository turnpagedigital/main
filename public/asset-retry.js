/* Deploy-transition self-healing: hashed assets can briefly 404 while a new
   deployment propagates (those 404s are served no-store by the middleware).
   If the app shell fails to load because of that, retry the page ONCE —
   never more than once per 30s per tab, so a genuine outage can't cause a
   reload loop. External file (not inline): the site CSP allows script-src
   'self' but not unhashed inline scripts. */
(function () {
  var KEY = "tpdm-asset-retry";
  function retry() {
    var last = Number(sessionStorage.getItem(KEY)) || 0;
    if (Date.now() - last < 30000) return;
    sessionStorage.setItem(KEY, String(Date.now()));
    setTimeout(function () { location.reload(); }, 1500);
  }
  window.addEventListener("error", function (e) {
    var t = e.target;
    if (t && t.tagName === "SCRIPT" && t.src && t.src.indexOf("/assets/") !== -1) retry();
  }, true);
  window.addEventListener("unhandledrejection", function (e) {
    var m = (e.reason && (e.reason.message || String(e.reason))) || "";
    if (/dynamically imported module|Importing a module script failed|error loading dynamically imported/i.test(m)) retry();
  });
})();
