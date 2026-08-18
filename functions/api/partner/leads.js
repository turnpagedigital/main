/* GET /api/partner/leads — the authenticated partner's referred leads,
   straight from Attio (the system of record):
     - people: everyone whose "Referred by" points at the partner
       (contact-form inquiries AND registrants)
     - deals: registration deals linked to the partner, with live stage
   Amounts (deal value / fees) are deliberately NOT exposed here. */

import { jsonResponse, authedPartner } from "./_auth.js";
import {
  queryReferredRecords, attioTextValue, attioCreatedAt,
  PERSON_REFERRED_BY_SLUG, DEAL_REFERRED_BY_SLUG,
} from "../_attio.js";

export async function onRequestGet({ request, env }) {
  const partner = await authedPartner(request, env);
  if (!partner) return jsonResponse({ ok: false, error: "Not signed in" }, 401);
  if (!env.ATTIO_API_KEY) return jsonResponse({ ok: false, error: "CRM not configured" }, 500);

  let people = [];
  let deals = [];
  let peopleError = null;
  let dealsError = null;

  try {
    const records = await queryReferredRecords(env, "people", PERSON_REFERRED_BY_SLUG, partner);
    people = records.map((r) => {
      const nameVal = r?.values?.name;
      const emailVal = r?.values?.email_addresses;
      return {
        date: attioCreatedAt(r),
        name: (Array.isArray(nameVal) && nameVal[0] && nameVal[0].full_name) || "",
        email: (Array.isArray(emailVal) && emailVal[0] && emailVal[0].email_address) || "",
      };
    });
  } catch (err) {
    console.error("partner leads people query:", err.message);
    peopleError = "Referred contacts are unavailable right now.";
  }

  try {
    const records = await queryReferredRecords(env, "deals", DEAL_REFERRED_BY_SLUG, partner);
    deals = records.map((r) => {
      const stageVal = r?.values?.stage;
      return {
        date: attioCreatedAt(r),
        name: attioTextValue(r, "name"),
        stage:
          (Array.isArray(stageVal) && stageVal[0] &&
            (stageVal[0].status?.title || stageVal[0].status?.id?.status_id || "")) || "",
      };
    });
  } catch (err) {
    console.error("partner leads deals query:", err.message);
    dealsError = "Registrations are unavailable right now.";
  }

  return jsonResponse({
    ok: true,
    partner: { code: partner.code, name: partner.name },
    people, deals, peopleError, dealsError,
    generatedAt: new Date().toISOString(),
  });
}
