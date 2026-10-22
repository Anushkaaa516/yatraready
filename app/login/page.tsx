"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./login.module.css";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    if (res?.ok) {
      window.location.href = "/dashboard";
      return;
    }
    setBusy(false);
    setError(res ? ((await res.json().catch(() => null))?.error ?? "Could not log in.") : "No internet connection.");
  }

  return (
    <>
      <header className="hero">
        <div className="om" aria-hidden="true">ॐ</div>
        <div className="namaste">नमस्ते · Namaste</div>
        <h1>
          Yatra<span>Ready</span>
        </h1>
        <p>Operator login</p>
      </header>
      <main className={styles.page}>
        <form onSubmit={submit} className={styles.card}>
          <h2>Log in to your dashboard</h2>
          <p className={styles.hint}>This page is for tour operators. Pilgrims use the personal link they were sent.</p>
          <label htmlFor="password">Operator password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className={styles.error}>{error}</p>}
          <button disabled={busy || !password}>{busy ? "Checking…" : "Log in"}</button>
        </form>
        <p className={styles.back}>
          <Link href="/">Back to home</Link>
        </p>
      </main>
    </>
  );
}
