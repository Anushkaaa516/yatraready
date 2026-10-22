import { bookSlot, findByToken, listPilgrims } from "@/lib/store";
import { upcomingSlots } from "@/lib/slots";
import { overallStatus } from "@/lib/status";

const messages = {
  not_found: "This link is not valid.",
  not_ready: "Please upload your Aadhaar and passport photo first. Booking opens once they are checked.",
  invalid: "That time is no longer available. Please pick another.",
  taken: "Sorry, someone just booked that time. Please pick another.",
} as const;

// Free and taken slots for a pilgrim. Other pilgrims' names are never shown.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const me = await findByToken(token);
  if (!me) return Response.json({ error: messages.not_found }, { status: 404 });
  if (overallStatus(me) !== "complete") return Response.json({ error: messages.not_ready }, { status: 403 });

  const taken = new Set((await listPilgrims()).filter((p) => p.id !== me.id && p.slot).map((p) => p.slot));
  return Response.json({
    mySlot: me.slot,
    slots: upcomingSlots().map((start) => ({ start, taken: taken.has(start) })),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await bookSlot(String(body?.token ?? ""), String(body?.slot ?? ""));
  if (result.ok) return Response.json({ ok: true });
  const status = { not_found: 404, not_ready: 403, invalid: 400, taken: 409 }[result.error];
  return Response.json({ error: messages[result.error] }, { status });
}
