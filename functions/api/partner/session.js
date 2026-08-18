import { jsonResponse, authedPartner } from "./_auth.js";

export async function onRequestGet({ request, env }) {
  const partner = await authedPartner(request, env);
  if (!partner) return jsonResponse({ ok: false }, 401);
  return jsonResponse({ ok: true, partner: { code: partner.code, name: partner.name } });
}
