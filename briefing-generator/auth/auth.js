// Gates every page in the site. Drops a magic-link signin if no session.
// Load with `<script type="module" src="/auth/auth.js"></script>` at the top of <body>.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.SUPABASE_CONFIG;
if (!cfg || !cfg.url || cfg.url.startsWith("__")) {
  console.error("Supabase config missing — fill in /auth/config.js");
} else {
  const supabase = createClient(cfg.url, cfg.anonKey);
  window._supabase = supabase;

  // Block page render until session is verified
  document.documentElement.style.visibility = "hidden";

  (async () => {
    // Handle magic-link callback if present in URL hash
    if (window.location.hash.includes("access_token")) {
      // Supabase JS auto-handles the hash and stores the session
      await new Promise(r => setTimeout(r, 200));
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // Not logged in — redirect to /login.html with a return URL
      const ret = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace(`/login.html?return=${ret}`);
      return;
    }

    // Verify allowed email
    const email = (session.user.email || "").toLowerCase();
    if (cfg.allowedEmails.length && !cfg.allowedEmails.map(e => e.toLowerCase()).includes(email)) {
      await supabase.auth.signOut();
      window.location.replace(`/login.html?error=unauthorized`);
      return;
    }

    // OK — show the page
    document.documentElement.style.visibility = "visible";

    // Add a tiny "Sign out" pill in the top-right corner
    const btn = document.createElement("button");
    btn.textContent = "Sign out";
    btn.style.cssText = "position:fixed;top:14px;right:14px;z-index:9999;background:transparent;border:1px solid currentColor;color:inherit;padding:6px 12px;font-family:Archivo,sans-serif;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;border-radius:0;opacity:0.55;";
    btn.onmouseover = () => btn.style.opacity = "1";
    btn.onmouseout = () => btn.style.opacity = "0.55";
    btn.onclick = async () => {
      await supabase.auth.signOut();
      window.location.replace("/login.html");
    };
    document.body.appendChild(btn);
  })().catch(err => {
    console.error("Auth check failed:", err);
    document.documentElement.style.visibility = "visible";
    // On error, allow render — better than locking out
  });
}
