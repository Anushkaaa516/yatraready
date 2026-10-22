import type { DocType } from "./types";

// The only file that talks to Gemini. It returns facts about the photo;
// the pass/flag decision is made by plain code in lib/status.ts.
export type DocCheck = {
  documentType: "aadhaar" | "medical_certificate" | "passport_photo" | "other" | "not_a_document";
  readable: boolean;
  nameOnDocument: string;
  hasSignatureOrStamp: boolean;
  faceClearlyVisible: boolean;
  confidence: number;
  problem: string;
};

const WHAT_WE_EXPECT: Record<DocType, string> = {
  aadhaar: "an Indian Aadhaar card (front side showing name and photo)",
  medical: "a medical fitness certificate signed or stamped by a doctor",
  photo: "a passport-size photo of one person's face",
};

function buildPrompt(docType: DocType) {
  return `You check document photos for a pilgrimage tour operator in India.
The pilgrim was asked to upload: ${WHAT_WE_EXPECT[docType]}.

Look at the image and report only what you can actually see. Do not guess.
- documentType: what the image really is. Use "not_a_document" for a random photo (an animal, landscape, screenshot of chat) and "other" for a document of a different kind.
- readable: false if it is blurry, too dark, cropped, or the text cannot be read.
- nameOnDocument: the person's full name exactly as printed (empty string if none or unreadable). Copy Latin script; if only Hindi is shown, transliterate to English.
- hasSignatureOrStamp: true only if a doctor's signature or official stamp is visible.
- faceClearlyVisible: true only if one face is sharp and fully visible.
- confidence: 0 to 1, how sure you are of this whole assessment.
- problem: one short, polite sentence telling the pilgrim what to fix, or an empty string if all is fine.`;
}

// Each model has its own free quota (and its own busy moments), so we try several in turn.
// A model that says "quota exceeded" (429) or "not found" is skipped for a while instead of
// being retried on every upload, which is what made checks fail before.
// Measured: gemini-3-flash-preview with minimal thinking answers in about 1 second; the flash-lite
// model often returns 503 or stalls for 30+ seconds, so it is only a backup.
// The free plan allows only ~20 requests per day PER MODEL (and 5 per minute on some), so the list
// is long on purpose: when one model is used up, the next one takes over. Fast and reliable first.
const MODELS = [
  ...new Set([
    process.env.GEMINI_MODEL,
    "gemini-3.5-flash-lite",
    "gemini-3-flash-preview",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
    "gemini-3.7-flash",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.1-flash-lite",
  ]),
].filter((m): m is string => Boolean(m));
const MAX_COOLDOWN_MS = 6 * 60 * 60_000;
const COOLDOWN_BUSY_MS = 60_000;
const COOLDOWN_QUOTA_MS = 10 * 60_000;
const COOLDOWN_GONE_MS = 60 * 60_000;
const skipUntil = new Map<string, number>();

export async function checkDocument(
  docType: DocType,
  image: { bytes: Buffer; mimeType: string },
): Promise<DocCheck> {
  const now = Date.now();
  // If every model is cooling down, try them all anyway rather than failing instantly.
  const ready = MODELS.filter((m) => (skipUntil.get(m) ?? 0) <= now);
  const order = ready.length > 0 ? ready : MODELS;

  let lastError: unknown = new Error("No Gemini model available");
  for (const [index, model] of order.entries()) {
    // A normal answer takes 1-4 s. Do not sit on a slow model: move on after 8 s (the last one gets longer).
    const timeoutMs = index < order.length - 1 ? 8_000 : 20_000;
    try {
      try {
        return await askGemini(model, docType, image, true, timeoutMs);
      } catch (err) {
        // A model that does not know the "thinking" setting answers 400: ask once more without it.
        if (err instanceof GeminiHttpError && err.status === 400) return await askGemini(model, docType, image, false, timeoutMs);
        throw err;
      }
    } catch (err) {
      lastError = err;
      const status = err instanceof GeminiHttpError ? err.status : 0;
      console.error(`Gemini ${model}:`, status || (err as Error).name);
      // Whatever went wrong, do not keep waiting on this model: go to the next one, and leave this
      // one alone for a while so the following uploads are not slowed down by it.
      const hinted = err instanceof GeminiHttpError ? err.retryAfterMs : undefined; // Google says when the quota returns
      const rest =
        status === 429
          ? Math.min(hinted ?? COOLDOWN_QUOTA_MS, MAX_COOLDOWN_MS)
          : status === 404 || status === 400 || status === 403
            ? COOLDOWN_GONE_MS
            : COOLDOWN_BUSY_MS;
      skipUntil.set(model, Date.now() + rest);
    }
  }
  throw lastError;
}

class GeminiHttpError extends Error {
  constructor(
    public status: number,
    public retryAfterMs?: number,
  ) {
    super(`Gemini returned ${status}`);
  }
}

// A 429 body carries a hint such as {"retryDelay": "18s"}; turn it into milliseconds.
function retryHint(body: string): number | undefined {
  const match = body.match(/"retryDelay"\s*:\s*"([\d.]+)s"/);
  return match ? Math.ceil(Number(match[1]) * 1000) + 1000 : undefined;
}

async function askGemini(
  model: string,
  docType: DocType,
  image: { bytes: Buffer; mimeType: string },
  lowThinking: boolean,
  timeoutMs: number,
): Promise<DocCheck> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set in .env.local");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: buildPrompt(docType) },
              { inlineData: { mimeType: image.mimeType, data: image.bytes.toString("base64") } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          // Reading a photo needs no long reasoning; minimal thinking is several times faster.
          ...(lowThinking ? { thinkingConfig: { thinkingLevel: "minimal" } } : {}),
          responseSchema: {
            type: "OBJECT",
            properties: {
              documentType: {
                type: "STRING",
                enum: ["aadhaar", "medical_certificate", "passport_photo", "other", "not_a_document"],
              },
              readable: { type: "BOOLEAN" },
              nameOnDocument: { type: "STRING" },
              hasSignatureOrStamp: { type: "BOOLEAN" },
              faceClearlyVisible: { type: "BOOLEAN" },
              confidence: { type: "NUMBER" },
              problem: { type: "STRING" },
            },
            required: [
              "documentType",
              "readable",
              "nameOnDocument",
              "hasSignatureOrStamp",
              "faceClearlyVisible",
              "confidence",
              "problem",
            ],
          },
        },
      }),
    },
  );

  if (!res.ok) throw new GeminiHttpError(res.status, res.status === 429 ? retryHint(await res.text()) : undefined);
  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no answer");
  return JSON.parse(text) as DocCheck;
}
