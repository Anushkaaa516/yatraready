import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { upcomingSlots } from "./slots";
import { overallStatus } from "./status";
import { DOC_TYPES, type DocState, type DocType, type Pilgrim, type PilgrimAction } from "./types";

// Everything the app stores goes through this file. Two backends sit behind one small interface:
// - Supabase (shared and permanent) when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.
// - A JSON file otherwise, which is fine on a laptop. On Vercel it is NOT reliable, because
//   each server instance has its own temp folder, so set the Supabase keys there.

class SlotTakenError extends Error {}

type Backend = {
  readAll(): Promise<Pilgrim[]>;
  find(token: string): Promise<Pilgrim | undefined>;
  insert(pilgrims: Pilgrim[]): Promise<void>;
  save(p: Pilgrim): Promise<void>;
  saveFile(p: Pilgrim, docType: DocType, file: { bytes: Buffer; ext: string; mime: string }): Promise<void>;
};

// ---------- File backend (local development) ----------

const DATA_DIR = process.env.VERCEL ? path.join(os.tmpdir(), "yatraready") : path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "db.json");

async function readFileDb(): Promise<Pilgrim[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

async function writeFileDb(pilgrims: Pilgrim[]) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(pilgrims, null, 2));
}

const fileBackend: Backend = {
  readAll: readFileDb,
  async find(token) {
    return (await readFileDb()).find((p) => p.token === token);
  },
  async insert(pilgrims) {
    await writeFileDb([...(await readFileDb()), ...pilgrims]);
  },
  async save(p) {
    const all = await readFileDb();
    await writeFileDb(all.map((x) => (x.id === p.id ? p : x)));
  },
  async saveFile(p, docType, file) {
    const dir = path.join(DATA_DIR, "uploads", p.id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${docType}.${file.ext}`), file.bytes);
  },
};

// ---------- Supabase backend (shared, permanent) ----------

function supabase(): Backend | null {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  // New-style secret keys (sb_secret_...) go in `apikey` only; legacy JWT keys also work as a bearer token.
  const headers: Record<string, string> = { apikey: key };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;

  async function call(pathAndQuery: string, init: RequestInit = {}) {
    const res = await fetch(`${url}${pathAndQuery}`, {
      ...init,
      headers: { ...headers, ...init.headers },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      if (body.includes("23505")) throw new SlotTakenError(); // unique index on the booked slot
      throw new Error(`Supabase ${res.status}: ${body.slice(0, 200)}`);
    }
    return res;
  }

  const json = { "Content-Type": "application/json" };
  const rows = async (q: string) => ((await (await call(`/rest/v1/pilgrims?${q}`)).json()) as { data: Pilgrim }[]).map((r) => r.data);

  return {
    readAll: () => rows("select=data&order=created_at.asc"),
    async find(token) {
      return (await rows(`select=data&token=eq.${encodeURIComponent(token)}`))[0];
    },
    async insert(pilgrims) {
      await call("/rest/v1/pilgrims", {
        method: "POST",
        headers: { ...json, Prefer: "return=minimal" },
        body: JSON.stringify(pilgrims.map((p) => ({ id: p.id, token: p.token, data: p }))),
      });
    },
    async save(p) {
      await call(`/rest/v1/pilgrims?id=eq.${encodeURIComponent(p.id)}`, {
        method: "PATCH",
        headers: { ...json, Prefer: "return=minimal" },
        body: JSON.stringify({ data: p }),
      });
    },
    async saveFile(p, docType, file) {
      await call(`/storage/v1/object/documents/${p.id}/${docType}.${file.ext}`, {
        method: "POST",
        headers: { "Content-Type": file.mime, "x-upsert": "true" },
        body: new Uint8Array(file.bytes),
      });
    },
  };
}

const backend = (): Backend => supabase() ?? fileBackend;

// ---------- The app's operations ----------

export async function listPilgrims(): Promise<Pilgrim[]> {
  return backend().readAll();
}

export async function findByToken(token: string): Promise<Pilgrim | undefined> {
  return backend().find(token);
}

export async function saveDocResult(
  token: string,
  docType: DocType,
  state: DocState,
  file: { bytes: Buffer; ext: string; mime: string },
): Promise<Pilgrim | undefined> {
  const db = backend();
  const p = await db.find(token);
  if (!p) return undefined;
  await db.saveFile(p, docType, file);
  p.docs[docType] = state;
  await db.save(p);
  return p;
}

export type BookResult = { ok: true } | { ok: false; error: "not_found" | "not_ready" | "invalid" | "taken" };

export async function bookSlot(token: string, slot: string): Promise<BookResult> {
  const db = backend();
  const all = await db.readAll();
  const p = all.find((x) => x.token === token);
  if (!p) return { ok: false, error: "not_found" };
  if (overallStatus(p) !== "complete") return { ok: false, error: "not_ready" };
  if (!upcomingSlots().includes(slot)) return { ok: false, error: "invalid" };
  if (all.some((x) => x.id !== p.id && x.slot === slot)) return { ok: false, error: "taken" };
  p.slot = slot;
  try {
    await db.save(p);
  } catch (err) {
    if (err instanceof SlotTakenError) return { ok: false, error: "taken" };
    throw err;
  }
  return { ok: true };
}

// The operator books a slot for a pilgrim directly from the calendar. Unlike a pilgrim booking,
// this does not need all three documents to be complete: the operator decides.
export async function operatorBook(id: string, slot: string): Promise<BookResult> {
  const db = backend();
  const all = await db.readAll();
  const p = all.find((x) => x.id === id);
  if (!p) return { ok: false, error: "not_found" };
  if (!upcomingSlots().includes(slot)) return { ok: false, error: "invalid" };
  if (all.some((x) => x.id !== p.id && x.slot === slot)) return { ok: false, error: "taken" };
  p.slot = slot;
  try {
    await db.save(p);
  } catch (err) {
    if (err instanceof SlotTakenError) return { ok: false, error: "taken" };
    throw err;
  }
  return { ok: true };
}

export async function applyAction(id: string, action: PilgrimAction): Promise<Pilgrim | undefined> {
  const db = backend();
  const p = (await db.readAll()).find((x) => x.id === id);
  if (!p) return undefined;
  if (action === "called") p.calls += 1;
  if (action === "registered") p.registered = true;
  if (action === "rebook") p.slot = null; // frees the slot; the pilgrim can pick a new one
  await db.save(p);
  return p;
}

export async function addPilgrims(people: { name: string; mobile: string }[]): Promise<Pilgrim[]> {
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
  await backend().insert(created);
  return created;
}
