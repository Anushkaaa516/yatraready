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

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

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

export async function checkDocument(
  docType: DocType,
  image: { bytes: Buffer; mimeType: string },
): Promise<DocCheck> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set in .env.local");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: AbortSignal.timeout(30_000),
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
          // Thinking is not needed for reading a photo and only adds delay.
          thinkingConfig: { thinkingBudget: 0 },
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

  if (!res.ok) throw new Error(`Gemini returned ${res.status}`);
  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no answer");
  return JSON.parse(text) as DocCheck;
}
