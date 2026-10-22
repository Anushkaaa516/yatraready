"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./upload.module.css";
import SlotPicker from "./slot-picker";
import { DOC_LABELS, DOC_TYPES, type DocState, type DocType } from "@/lib/types";

type Info = { name: string; docs: Record<DocType, DocState> };

// Phone photos are often 4-12 MB, which the host would reject. Shrink to at most 1600px
// as a JPEG (still easy to read). If anything goes wrong, send the original file.
async function shrink(file: File): Promise<File> {
  try {
    if (!file.type.startsWith("image/")) return file;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export default function UploadForm({ token }: { token: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [invalid, setInvalid] = useState(false);
  // "waiting" = chosen, but another document is still being checked. We send one at a time,
  // so two documents never race each other (and we stay inside the AI service's rate limit).
  const [busy, setBusy] = useState<Partial<Record<DocType, "waiting" | "checking" | "retrying">>>({});
  const [errors, setErrors] = useState<Partial<Record<DocType, string>>>({});
  const queue = useRef<Promise<void>>(Promise.resolve());

  const load = useCallback(async () => {
    const res = await fetch(`/api/p/${token}`, { cache: "no-store" });
    if (!res.ok) return setInvalid(true);
    setInfo(await res.json());
  }, [token]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const setBusyFor = (d: DocType, v: "waiting" | "checking" | "retrying" | undefined) =>
    setBusy((b) => ({ ...b, [d]: v }));

  function send(docType: DocType, file: File | undefined) {
    setErrors((e) => ({ ...e, [docType]: undefined }));
    if (!file) return;
    setBusyFor(docType, "waiting");
    queue.current = queue.current.then(() => upload(docType, file));
  }

  async function upload(docType: DocType, file: File) {
    setBusyFor(docType, "checking");
    const small = await shrink(file);
    let res: Response | null = null;
    // If the checking service is busy (a 502), wait a few seconds and try once more automatically.
    for (let attempt = 0; attempt < 2; attempt++) {
      const form = new FormData();
      form.set("token", token);
      form.set("docType", docType);
      form.set("file", small);
      res = await fetch("/api/upload", { method: "POST", body: form }).catch(() => null);
      if (res && res.status !== 502) break;
      if (attempt === 0) {
        setBusyFor(docType, "retrying");
        await new Promise((r) => setTimeout(r, 4000));
        setBusyFor(docType, "checking");
      }
    }
    setBusyFor(docType, undefined);
    if (!res) setErrors((e) => ({ ...e, [docType]: "No internet connection. Please try again." }));
    else if (!res.ok) {
      // Errors from our server are JSON; one from the hosting layer (e.g. file too big) is not.
      const body = await res.json().catch(() => null);
      const message = body?.error ?? "The upload didn't go through. Please try a smaller photo.";
      setErrors((e) => ({ ...e, [docType]: message }));
    }
    await load();
  }

  if (invalid) return <main className={styles.page}><h1>This link isn&apos;t working</h1><p>It may be mistyped or out of date. Please ask your tour operator to send you a new link.</p></main>;
  if (!info) return <main className={styles.page}><p>Loading…</p></main>;

  return (
    <>
    <header className="hero">
      <div className="om" aria-hidden="true">ॐ</div>
      <div className="namaste">नमस्ते · Namaste</div>
      <h1>{info.name}</h1>
      <p>Your yatra is almost ready. Please upload clear photos of these 3 documents.</p>
    </header>
    <main className={styles.page}>
      {DOC_TYPES.map((d) => {
        const s = info.docs[d];
        return (
          <section key={d} className={`${styles.card} ${styles[s.status]}`}>
            <h2>{DOC_LABELS[d]}</h2>
            <p className={styles.state}>
              {s.status === "complete" && "✓ Received and checked"}
              {s.status === "missing" && "Not uploaded yet"}
              {s.status === "flagged" && `Please send again: ${s.reason}`}
            </p>
            {errors[d] && <p className={styles.error}>{errors[d]}</p>}
            {busy[d] ? (
              <p className={styles.progress}>
                {busy[d] === "waiting" && "⏳ In line. We'll check this right after the previous document."}
                {busy[d] === "checking" && "🔍 Checking your document. This can take up to 30 seconds, please wait…"}
                {busy[d] === "retrying" && "The checking service was busy. Trying again automatically…"}
              </p>
            ) : (
              s.status !== "complete" && (
                <input type="file" accept="image/*" onChange={(e) => send(d, e.target.files?.[0])} />
              )
            )}
          </section>
        );
      })}
      {DOC_TYPES.every((d) => info.docs[d].status === "complete") && <SlotPicker token={token} />}
    </main>
    </>
  );
}
