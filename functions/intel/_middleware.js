/* functions/intel/_middleware.js
   Gate the briefing dashboards (/intel/*) behind the SAME admin session the
   /admin panel uses — replacing the former Supabase magic-link auth, which
   depended on a shared external project and kept misrouting logins.

   Any /intel/* request without a valid admin session cookie gets a small
   password gate that posts to /api/admin/login; on success the page reloads
   and, now carrying the cookie, serves normally. The cookie is Path=/ and
   SameSite=Strict, so it's present on these same-site navigations. */

import { isAuthed } from "../api/admin/_utils.js";

/* Installed-web-app assets, served WITHOUT a session.

   iOS fetches the home-screen icon from a system process that carries no
   cookie, so gating it returned this file's 401 HTML instead of a PNG and the
   install fell back to a grey letter tile. (The manifest itself survived only
   because the <link> carries crossorigin="use-credentials" and the tab was
   signed in — the icon fetch has no such escape hatch.)

   Ungating these leaks nothing: an app name, two colours, and brand artwork.
   The gate page below is already titled "Sign in — Turnpage Intel" and renders
   the same logo. Case data, dockets, and notes stay behind the session. */
const PUBLIC_MANIFEST = /^\/intel\/manifest\.webmanifest$/;
const PUBLIC_IMAGE = /^\/intel\/assets\/[\w.-]+\.(png|jpe?g|svg|webp|ico)$/;

export async function onRequest(context) {
  const { request, env, next } = context;
  const path = new URL(request.url).pathname;

  if (PUBLIC_MANIFEST.test(path)) {
    // Short cache, not immutable: the manifest has no content hash in its URL,
    // so a rename or colour change needs to be able to actually reach devices.
    const res = await next();
    const capped = new Response(res.body, res);
    capped.headers.set("Cache-Control", "public, max-age=300, must-revalidate");
    return capped;
  }
  if (PUBLIC_IMAGE.test(path)) {
    // Matches the immutable policy the authed branch applies to images below.
    // NB the manifest's icon URLs are not ?v=-stamped (unlike images referenced
    // from HTML, which copy-intel.mjs stamps), so changing an app icon means
    // shipping a NEW FILENAME and updating manifest.webmanifest — overwriting
    // icon-192.png in place would sit behind this year-long cache.
    const res = await next();
    const capped = new Response(res.body, res);
    capped.headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return capped;
  }

  if (await isAuthed(request, env)) {
    const res = await next(); // valid admin session — serve the static intel asset
    // Intel app code ships fixes several times a day; Pages' default 4h
    // max-age left stale tabs running hours-old JS. _headers rules don't
    // modify function-fronted responses, so cap the cache here.
    if (/\.(js|css)(\?|$)/.test(path)) {
      const capped = new Response(res.body, res);
      capped.headers.set("Cache-Control", "public, max-age=300, must-revalidate");
      return capped;
    }
    // Data JSON (case summaries, bondoro feed, notes, votes, …) updates
    // multiple times a day via bots and admin edits — same function-fronted
    // gap as .js above, but capped much shorter since staleness here means
    // showing outdated filings/news, not just a stale script.
    if (/\.json(\?|$)/.test(path)) {
      const capped = new Response(res.body, res);
      capped.headers.set("Cache-Control", "public, max-age=60, must-revalidate");
      return capped;
    }
    // Logo/favicon/etc under assets/ — same function-fronted gap as above
    // (the _headers file's /*.png rule never reaches a function-fronted
    // response), but these are content-hash-stamped in the HTML that
    // references them (copy-intel.mjs stampImages()), so a real change
    // always ships a new ?v= URL. Safe to cache hard, matching the main
    // site's own immutable policy for its content-hashed /assets/*.
    if (/\.(png|jpe?g|svg|webp|ico)(\?|$)/.test(path)) {
      const capped = new Response(res.body, res);
      capped.headers.set("Cache-Control", "public, max-age=31536000, immutable");
      return capped;
    }
    return res;
  }
  return new Response(GATE_HTML, {
    status: 401,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

const GATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sign in — Turnpage Intel</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
  /* System mode only — the gate follows the OS light/dark preference.
     No toggle, no stored theme: it's one screen, shown before any session
     exists. Dark palette mirrors the intel dark theme. */
  :root{color-scheme:light dark;--bg:#fff;--ink:#0A0A0A;--ink60:rgba(10,10,10,0.6);--line:rgba(10,10,10,0.14);--neon:#D4FF00;--btn-fg:#fff;--err:#C84141;}
  @media (prefers-color-scheme: dark){
    :root{--bg:#0D0D0D;--ink:#E5E7EB;--ink60:rgba(229,231,235,0.62);--line:rgba(229,231,235,0.18);--btn-fg:#0A0A0A;--err:#E36A6A;}
  }
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Archivo',sans-serif;background:var(--bg);color:var(--ink);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px;}
  .card{max-width:400px;width:100%;border:1px solid var(--line);padding:48px 40px;}
  .brand{font-weight:800;font-size:13px;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink60);margin-bottom:28px;}
  h1{font-size:30px;font-weight:800;letter-spacing:-0.02em;line-height:1.1;margin-bottom:10px;}
  .sub{font-size:14px;color:var(--ink60);margin-bottom:28px;line-height:1.5;}
  label{display:block;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:var(--ink60);margin-bottom:8px;}
  input{width:100%;padding:14px 12px;border:1px solid var(--line);background:transparent;color:var(--ink);font-family:inherit;font-size:15px;outline:none;border-radius:0;}
  input:focus{border-color:var(--ink);}
  button{width:100%;margin-top:18px;padding:14px;background:var(--ink);color:var(--btn-fg);border:1px solid var(--ink);font-family:inherit;font-size:14px;font-weight:700;letter-spacing:0.04em;cursor:pointer;border-radius:0;}
  button:hover{background:var(--neon);color:#0A0A0A;border-color:var(--neon);}
  button:disabled{opacity:0.5;cursor:not-allowed;}
  .msg{margin-top:16px;font-size:13px;line-height:1.5;}
  .msg.error{color:var(--err);}
  .footer{margin-top:36px;font-size:11px;color:var(--ink60);letter-spacing:0.04em;}
</style>
</head>
<body>
<div class="card">
  <div class="brand">Turnpage Digital Markets</div>
  <h1>Intel Briefings</h1>
  <p class="sub">Enter the admin password to view today's briefings. Same password as the admin panel.</p>
  <form id="f">
    <label for="pw">Password</label>
    <input type="password" id="pw" autocomplete="current-password" autofocus required>
    <button type="submit" id="b">Sign in &rarr;</button>
    <div id="m" class="msg"></div>
  </form>
  <div class="footer">Authorized readers only.</div>
</div>
<script>
  var f=document.getElementById('f'),b=document.getElementById('b'),m=document.getElementById('m'),pw=document.getElementById('pw');
  f.addEventListener('submit',async function(e){
    e.preventDefault();
    b.disabled=true;b.textContent='Checking\\u2026';m.textContent='';m.className='msg';
    try{
      var r=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({password:pw.value})});
      var j=await r.json().catch(function(){return{};});
      if(r.ok&&j.ok){location.reload();return;}
      m.textContent=j.error||'Sign-in failed';m.className='msg error';
    }catch(err){m.textContent='Network error \\u2014 try again';m.className='msg error';}
    b.disabled=false;b.textContent='Sign in \\u2192';pw.focus();
  });
</script>
</body>
</html>`;
