"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./upload.module.css";
import SlotPicker from "./slot-picker";
import { DOC_LABELS, DOC_TYPES, type DocState, type DocType } from "@/lib/types";

type Info = { name: string; docs: Record<DocType, DocState> };

export default function UploadForm({ token }: { token: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState<DocType | null>(null);
  const [errors, setErrors] = useState<Partial<Record<DocType, string>>>({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/p/${token}`, { cache: "no-store" });
    if (!res.ok) return setInvalid(true);
    setInfo(await res.json());
  }, [token]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function send(docType: DocType, file: File | undefined) {
    setErrors((e) => ({ ...e, [docType]: undefined }));
    if (!file) return;
    setBusy(docType);
    const form = new FormData();
    form.set("token", token);
    form.set("docType", docType);
    form.set("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form }).catch(() => null);
    setBusy(null);
    if (!res) setErrors((e) => ({ ...e, [docType]: "No internet connection. Please try again." }));
    else if (!res.ok) {
      const message = (await res.json()).error;
      setErrors((e) => ({ ...e, [docType]: message }));
    }
    await load();
  }

  if (invalid) return <main className={styles.page}><h1>Link not valid</h1><p>Please ask your tour operator for a new link.</p></main>;
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
            {busy === d ? (
              <p>Checking your document…</p>
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
