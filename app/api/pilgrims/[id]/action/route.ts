import { applyAction } from "@/lib/store";
import type { PilgrimAction } from "@/lib/types";

const ACTIONS: PilgrimAction[] = ["called", "registered", "rebook"];

export async function POST(request: Request, ctx: RouteContext<"/api/pilgrims/[id]/action">) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const action = body?.action as PilgrimAction;
  if (!ACTIONS.includes(action)) return Response.json({ error: "Unknown action." }, { status: 400 });
  const pilgrim = await applyAction(id, action);
  if (!pilgrim) return Response.json({ error: "Pilgrim not found." }, { status: 404 });
  return Response.json({ pilgrim });
}
