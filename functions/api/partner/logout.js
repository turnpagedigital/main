import { jsonResponse, buildPartnerCookie } from "./_auth.js";

export async function onRequestPost() {
  return jsonResponse({ ok: true }, 200, { "Set-Cookie": buildPartnerCookie("", 0) });
}
