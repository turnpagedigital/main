/* _pdf-checks.js — advisory metadata checks on an uploaded claim-form PDF.
 *
 * Reality check (verified against a genuine Bartz claim confirmation):
 * claimants produce these PDFs themselves by printing/saving the JND
 * submission page from their own browser (e.g. Producer "iOS Version …",
 * Creator "Safari", no digital signature). So metadata can NEVER prove a
 * document came from the claims administrator — legit producers vary with
 * every device. What it CAN do is surface red flags of post-creation
 * editing. These results are advisory, shown only in the internal
 * notification email for human due diligence — never an automatic gate.
 *
 * Input is the raw PDF bytes as a latin1 string (base64-decoded upstream).
 */

const EDITOR_TOOLS = /photoshop|illustrator|indesign|acrobat pro|acrobat dc|microsoft.{0,10}word|libreoffice|openoffice|pages|canva|ilovepdf|sejda|smallpdf|foxit|nitro|pdfelement|pdf editor|pdfescape|soda pdf|deftpdf|pdfsam/i;

function pdfString(bytes, key) {
  // (literal string) form
  let m = bytes.match(new RegExp(key + "\\s*\\(((?:[^()\\\\]|\\\\.){0,300})\\)"));
  if (m) return m[1].replace(/\\([()\\])/g, "$1");
  // <hex string> form
  m = bytes.match(new RegExp(key + "\\s*<([0-9A-Fa-f]{4,600})>"));
  if (m) {
    let out = "";
    const hex = m[1];
    for (let i = 0; i + 1 < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    // strip UTF-16 BOM/NULs commonly present in hex-encoded info strings
    // eslint-disable-next-line no-control-regex
    return out.replace(/^\xFE\xFF/, "").replace(/\x00/g, "");
  }
  return "";
}

function parsePdfDate(s) {
  const m = /D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?/.exec(s || "");
  if (!m) return null;
  return `${m[1]}-${m[2] || "01"}-${m[3] || "01"} ${m[4] || "00"}:${m[5] || "00"}:${m[6] || "00"}`;
}

/* Returns { info: {producer, creator, created, modified, signed}, flags: [str] } */
export function checkClaimPdf(bytes) {
  const producer = pdfString(bytes, "/Producer");
  const creator  = pdfString(bytes, "/Creator");
  const created  = pdfString(bytes, "/CreationDate");
  const modified = pdfString(bytes, "/ModDate");
  const signed   = /\/ByteRange/.test(bytes) && /\/(?:Sig|DocTimeStamp)\b/.test(bytes);
  const eofCount = (bytes.match(/%%EOF/g) || []).length;

  const flags = [];
  const toolString = `${producer} ${creator}`;
  if (EDITOR_TOOLS.test(toolString)) {
    flags.push(`Created or edited with an editing tool (${(producer || creator).slice(0, 60)}) — genuine claim confirmations are usually browser print-to-PDF.`);
  }
  const c = parsePdfDate(created);
  const mo = parsePdfDate(modified);
  if (c && mo && mo !== c) {
    flags.push(`Modified after creation (created ${c}, modified ${mo}).`);
  }
  if (eofCount > 1) {
    flags.push(`File contains ${eofCount} incremental saves — it was changed after it was first written.`);
  }
  if (!producer && !creator) {
    flags.push("No producer/creator metadata at all — unusual for a browser-saved PDF.");
  }

  return {
    info: {
      producer: producer.slice(0, 100),
      creator: creator.slice(0, 100),
      created: c || "",
      modified: mo || "",
      signed,
    },
    flags,
  };
}
