import { findByToken } from "@/lib/store";

// What the pilgrim's upload page may see: their name and document states, never the mobile number.
export async function GET(_req: Request, ctx: RouteContext<"/api/p/[token]">) {
  const { token } = await ctx.params;
  const p = await findByToken(token);
  if (!p) return Response.json({ error: "This link is not valid." }, { status: 404 });
  return Response.json({ name: p.name, docs: p.docs, slot: p.slot ?? null });
}
