/* GET /api/partner/leads — the authenticated partner's referred leads,
   straight from Attio (the system of record):
     - people: everyone whose "Referred by" points at the partner
       (contact-form inquiries AND registrants)
     - deals: registration deals linked to the partner, with live stage
   Amounts (deal value / fees) are deliberately NOT exposed here. */

import { jsonResponse, authedPartner } from "./_auth.js";
import {
  queryReferredRecords, attioTextValue, attioCreatedAt, attioFetch,
  PERSON_REFERRED_BY_SLUG, DEAL_REFERRED_BY_SLUG,
} from "../_attio.js";

/* Resolve company record ids → display names, one GET per unique id,
   capped so a huge partner list can't fan out unboundedly. Failures just
   leave the name blank — grouping falls back to "individual". */
const COMPANY_RESOLVE_CAP = 30;
async function resolveCompanyNames(env, ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length > COMPANY_RESOLVE_CAP) {
    console.error(`partner leads: ${unique.length} companies, resolving first ${COMPANY_RESOLVE_CAP}`);
  }
  const names = {};
  await Promise.all(unique.slice(0, COMPANY_RESOLVE_CAP).map(async (id) => {
    try {
      const res = await attioFetch(env, `https://api.attio.com/v2/objects/companies/records/${id}`);
      if (!res.ok) return;
      const body = await res.json();
      const nv = body?.data?.values?.name;
      if (Array.isArray(nv) && nv[0] && nv[0].value) names[id] = nv[0].value;
    } catch (err) {
      console.error("company name resolve:", err.message);
    }
  }));
  return names;
}

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
      const companyVal = r?.values?.company;
      return {
        recordId: r?.id?.record_id || "",
        claims: [],
        date: attioTextValue(r, "first_submission") || attioCreatedAt(r),
        name: (Array.isArray(nameVal) && nameVal[0] && nameVal[0].full_name) || "",
        email: (Array.isArray(emailVal) && emailVal[0] && emailVal[0].email_address) || "",
        source: attioTextValue(r, "submission_source"),
        // "Referral comment" on People — Attio-AI-generated (and Andrew-
        // editable) partner-facing status line. Missing attribute → "".
        comment: attioTextValue(r, "referral_comment"),
        companyId:
          (Array.isArray(companyVal) && companyVal[0] && companyVal[0].target_record_id) || "",
      };
    });
    const companyNames = await resolveCompanyNames(env, people.map((x) => x.companyId));
    people = people.map(({ companyId, ...rest }) => ({
      ...rest,
      company: companyNames[companyId] || "",
    }));
  } catch (err) {
    console.error("partner leads people query:", err.message);
    peopleError = "Referred contacts are unavailable right now.";
  }

  try {
    const records = await queryReferredRecords(env, "deals", DEAL_REFERRED_BY_SLUG, partner);
    deals = records.map((r) => {
      const stageVal = r?.values?.stage;
      const refs = [...(r?.values?.seller || []), ...(r?.values?.associated_people || [])];
      return {
        date: attioCreatedAt(r),
        name: attioTextValue(r, "name"),
        stage:
          (Array.isArray(stageVal) && stageVal[0] &&
            (stageVal[0].status?.title || stageVal[0].status?.id?.status_id || "")) || "",
        personIds: refs.map((x) => x && x.target_record_id).filter(Boolean),
      };
    });
  } catch (err) {
    console.error("partner leads deals query:", err.message);
    dealsError = "Registrations are unavailable right now.";
  }

  /* Consolidate: one row per referred person, flagged as a registered
     claim (with its latest deal stage) or a plain inquiry. Deals whose
     person isn't in the referred list (shouldn't happen, but a partial
     Attio write could produce one) still surface as synthetic rows so a
     registration is never invisible to the partner. */
  const byPerson = new Map(people.map((p) => [p.recordId, p]));
  const orphanDeals = [];
  for (const d of deals) {
    const pid = d.personIds.find((id) => byPerson.has(id));
    if (pid) byPerson.get(pid).claims.push({ stage: d.stage, date: d.date });
    else orphanDeals.push(d);
  }
  const leads = [
    ...people.map(({ recordId: _recordId, claims, ...rest }) => ({
      ...rest,
      registered: claims.length > 0,
      claimStage: claims.length ? claims[0].stage : "",
      claimCount: claims.length,
    })),
    ...orphanDeals.map((d) => ({
      date: d.date,
      name: (d.name.split("|")[1] || d.name).trim(),
      email: "", company: "", source: "", comment: "",
      registered: true, claimStage: d.stage, claimCount: 1,
    })),
  ];

  return jsonResponse({
    ok: true,
    partner: { code: partner.code, name: partner.name },
    leads, peopleError, dealsError,
    generatedAt: new Date().toISOString(),
  });
}
