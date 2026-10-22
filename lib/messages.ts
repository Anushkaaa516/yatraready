import { slotLabel } from "./slots";
import { DOC_LABELS, DOC_TYPES, type Pilgrim } from "./types";

// WhatsApp wording. Plain templates, no AI: same text every time.
const link = (origin: string, p: Pilgrim) => `${origin}/upload/${p.token}`;

export function docsReminder(p: Pilgrim, origin: string) {
  const todo = DOC_TYPES.filter((d) => p.docs[d].status !== "complete").map((d) => {
    const s = p.docs[d];
    return s.status === "flagged" ? `- ${DOC_LABELS[d]} (please resend: ${s.reason})` : `- ${DOC_LABELS[d]}`;
  });
  return `Namaste ${p.name}, for your yatra registration we still need:\n${todo.join("\n")}\n\nUpload clear photos here: ${link(origin, p)}`;
}

export function bookingMessage(p: Pilgrim, origin: string) {
  return `Namaste ${p.name}, all your documents are received. Please pick a time for your registration call: ${link(origin, p)}`;
}

export function slotReminder(p: Pilgrim) {
  return `Namaste ${p.name}, reminder: your registration call is on ${slotLabel(p.slot!)} (India time). Please keep your phone and Aadhaar card ready.`;
}

export function whatsappLink(mobile: string, text: string) {
  return `https://wa.me/91${mobile}?text=${encodeURIComponent(text)}`;
}
