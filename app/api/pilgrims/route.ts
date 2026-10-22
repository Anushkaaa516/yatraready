import { addPilgrims, listPilgrims } from "@/lib/store";
import { cleanMobile } from "@/lib/status";

export async function GET() {
  return Response.json({ pilgrims: await listPilgrims() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rows: unknown = body?.pilgrims;
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 5) {
    return Response.json({ error: "Add between 1 and 5 pilgrims." }, { status: 400 });
  }

  const people: { name: string; mobile: string }[] = [];
  for (const [i, row] of rows.entries()) {
    const name = String(row?.name ?? "").trim();
    const mobile = cleanMobile(String(row?.mobile ?? ""));
    if (!name) return Response.json({ error: `Row ${i + 1}: name is empty.` }, { status: 400 });
    if (!mobile) {
      return Response.json(
        { error: `Row ${i + 1}: mobile must be a 10-digit Indian number.` },
        { status: 400 },
      );
    }
    people.push({ name, mobile });
  }

  return Response.json({ pilgrims: await addPilgrims(people) }, { status: 201 });
}
