import type { DocCheck } from "./gemini";
import { DOC_LABELS, DOC_TYPES, type DocState, type DocType, type OverallStatus, type Pilgrim } from "./types";

const MIN_CONFIDENCE = 0.7;

const EXPECTED_KIND: Record<DocType, DocCheck["documentType"]> = {
  aadhaar: "aadhaar",
  medical: "medical_certificate",
  photo: "passport_photo",
};

function words(s: string) {
  return s.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
}

// One-letter spelling slips are fine ("Ramesh" vs "Rameshh").
function close(a: string, b: string) {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a.slice(i + 1) === b.slice(i) || a.slice(i) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i + 1);
}

export function nameMatches(expected: string, found: string) {
  const want = words(expected);
  const have = words(found);
  if (want.length === 0 || have.length === 0) return false;
  const hits = want.filter((w) => have.some((h) => close(w, h))).length;
  return hits >= Math.min(2, want.length);
}

// The pass/flag decision for one uploaded document. Plain rules, no AI.
export function judge(docType: DocType, pilgrimName: string, c: DocCheck): DocState {
  const flag = (reason: string): DocState => ({ status: "flagged", reason });
  const label = DOC_LABELS[docType];

  if (c.documentType === "not_a_document") return flag(`This doesn't look like a ${label}. Please send a photo of the document.`);
  if (c.documentType !== EXPECTED_KIND[docType]) return flag(`This doesn't look like a ${label}. Please send the correct document.`);
  if (!c.readable) return flag(c.problem || `The ${label} is blurry or cut off. Please send a clearer photo.`);
  if (c.confidence < MIN_CONFIDENCE) return flag(c.problem || `We couldn't read the ${label} clearly. Please send a clearer photo.`);

  if (docType === "photo") {
    if (!c.faceClearlyVisible) return flag(c.problem || "Your face isn't clearly visible. Please send a clear passport-size photo.");
    return { status: "complete" };
  }
  if (!nameMatches(pilgrimName, c.nameOnDocument)) {
    return flag(`The name on the ${label} ("${c.nameOnDocument || "not readable"}") doesn't match ${pilgrimName}. The operator will check.`);
  }
  if (docType === "medical" && !c.hasSignatureOrStamp) return flag("The medical certificate needs a doctor's signature or stamp.");
  return { status: "complete" };
}

// Plain rules, no AI: one flagged document flags the pilgrim,
// all three complete means complete, anything else is still missing.
export function overallStatus(p: Pilgrim): OverallStatus {
  const states = DOC_TYPES.map((d) => p.docs[d].status);
  if (states.includes("flagged")) return "flagged";
  if (states.every((s) => s === "complete")) return "complete";
  return "missing";
}

export function summarize(pilgrims: Pilgrim[]) {
  const counts = { complete: 0, flagged: 0, missing: 0 };
  for (const p of pilgrims) counts[overallStatus(p)]++;
  return { total: pilgrims.length, ...counts };
}

// Indian mobile number: 10 digits starting 6-9, optional +91 / 0 prefix.
export function cleanMobile(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}
