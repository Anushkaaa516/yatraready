import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { upcomingSlots } from "./slots";
import { overallStatus } from "./status";
import { DOC_TYPES, type DocState, type DocType, type Pilgrim, type PilgrimAction } from "./types";

// Local test storage: a JSON file. Everything goes through these functions,
// so swapping in Supabase later only means changing this file.
const FILE = path.join(process.cwd(), "data", "db.json");

async function readAll(): Promise<Pilgrim[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

async function writeAll(pilgrims: Pilgrim[]) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(pilgrims, null, 2));
}

export async function listPilgrims(): Promise<Pilgrim[]> {
  return readAll();
}

export async function findByToken(token: string): Promise<Pilgrim | undefined> {
  return (await readAll()).find((p) => p.token === token);
}

export async function saveDocResult(
  token: string,
  docType: DocType,
  state: DocState,
  file: { bytes: Buffer; ext: string },
): Promise<Pilgrim | undefined> {
  const all = await readAll();
  const p = all.find((x) => x.token === token);
  if (!p) return undefined;
  const dir = path.join(path.dirname(FILE), "uploads", p.id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${docType}.${file.ext}`), file.bytes);
  p.docs[docType] = state;
  await writeAll(all);
  return p;
}

export type BookResult = { ok: true } | { ok: false; error: "not_found" | "not_ready" | "invalid" | "taken" };

export async function bookSlot(token: string, slot: string): Promise<BookResult> {
  const all = await readAll();
  const p = all.find((x) => x.token === token);
  if (!p) return { ok: false, error: "not_found" };
  if (overallStatus(p) !== "complete") return { ok: false, error: "not_ready" };
  if (!upcomingSlots().includes(slot)) return { ok: false, error: "invalid" };
  if (all.some((x) => x.id !== p.id && x.slot === slot)) return { ok: false, error: "taken" };
  p.slot = slot;
  await writeAll(all);
  return { ok: true };
}

export async function applyAction(id: string, action: PilgrimAction): Promise<Pilgrim | undefined> {
  const all = await readAll();
  const p = all.find((x) => x.id === id);
  if (!p) return undefined;
  if (action === "called") p.calls += 1;
  if (action === "registered") p.registered = true;
  if (action === "rebook") p.slot = null; // frees the slot; the pilgrim can pick a new one
  await writeAll(all);
  return p;
}

export async function addPilgrims(
  people: { name: string; mobile: string }[],
): Promise<Pilgrim[]> {
  const existing = await readAll();
  const created = people.map((p): Pilgrim => {
    const docs = Object.fromEntries(
      DOC_TYPES.map((d) => [d, { status: "missing" } satisfies DocState]),
    ) as Pilgrim["docs"];
    return {
      id: randomUUID(),
      token: randomUUID().replace(/-/g, "").slice(0, 12),
      name: p.name,
      mobile: p.mobile,
      docs,
      slot: null,
      calls: 0,
      registered: false,
    };
  });
  await writeAll([...existing, ...created]);
  return created;
}
