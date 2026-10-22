import { operatorBook } from "@/lib/store";

const messages = {
  not_found: "Pilgrim not found.",
  invalid: "That time is no longer available.",
  taken: "Someone already holds that time.",
  not_ready: "Not ready.",
} as const;

// Operator books a slot for a pilgrim from the dashboard calendar.
export async function POST(request: Request, ctx: RouteContext<"/api/pilgrims/[id]/slot">) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const result = await operatorBook(id, String(body?.slot ?? ""));
  if (result.ok) return Response.json({ ok: true });
  const status = { not_found: 404, not_ready: 403, invalid: 400, taken: 409 }[result.error];
  return Response.json({ error: messages[result.error] }, { status });
}
