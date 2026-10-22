export const DOC_TYPES = ["aadhaar", "medical", "photo"] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const DOC_LABELS: Record<DocType, string> = {
  aadhaar: "Aadhaar",
  medical: "Medical certificate",
  photo: "Passport photo",
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
