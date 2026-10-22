export const DOC_TYPES = ["aadhaar", "photo", "medical"] as const;
export type DocType = (typeof DOC_TYPES)[number];

// Every pilgrim must give these. The medical certificate is only needed for some yatras,
// so it is optional: it is checked and kept if uploaded, but never blocks booking.
export const MANDATORY_DOCS: readonly DocType[] = ["aadhaar", "photo"];
export const isMandatory = (d: DocType) => MANDATORY_DOCS.includes(d);

export const DOC_LABELS: Record<DocType, string> = {
  aadhaar: "Aadhaar",
  photo: "Passport photo",
  medical: "Medical certificate",
};

export type DocState = {
  status: "missing" | "complete" | "flagged";
  reason?: string;
};

export type Pilgrim = {
  id: string;
  name: string;
  mobile: string;
  token: string;
  docs: Record<DocType, DocState>;
  slot: string | null; // ISO start time of the booked registration call
  calls: number;
  registered: boolean;
};

export type PilgrimAction = "called" | "registered" | "rebook";

export type OverallStatus = "missing" | "flagged" | "complete";
