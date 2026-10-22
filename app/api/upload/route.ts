import { checkDocument } from "@/lib/gemini";
import { judge } from "@/lib/status";
import { findByToken, saveDocResult } from "@/lib/store";
import { DOC_TYPES, type DocType } from "@/lib/types";

const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return bad("Could not read the upload.");

  const token = String(form.get("token") ?? "");
  const docType = String(form.get("docType") ?? "") as DocType;
  const file = form.get("file");

  if (!DOC_TYPES.includes(docType)) return bad("Unknown document type.");
  const pilgrim = await findByToken(token);
  if (!pilgrim) return bad("This link is not valid.", 404);

  // Plain checks first, so bad files never cost an AI call.
  if (!(file instanceof File) || file.size === 0) return bad("Please choose a photo to upload.");
  if (!EXT[file.type]) return bad("Please upload a photo (JPG, PNG or WebP), not another kind of file.");
  if (file.size > MAX_BYTES) return bad("That photo is too large. Please send one under 5 MB.");

  const bytes = Buffer.from(await file.arrayBuffer());

  let state;
  try {
    const check = await checkDocument(docType, { bytes, mimeType: file.type });
    state = judge(docType, pilgrim.name, check);
  } catch (err) {
    console.error("Document check failed:", err);
    return bad("We couldn't check the document just now. Please try again in a minute.", 502);
  }

  await saveDocResult(token, docType, state, { bytes, ext: EXT[file.type], mime: file.type });
  return Response.json({ status: state.status, reason: state.reason ?? null });
}
