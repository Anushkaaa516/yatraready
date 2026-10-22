"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./page.module.css";
import { bookingMessage, docsReminder, slotReminder, whatsappLink } from "@/lib/messages";
import { dayLabel, slotLabel, timeLabel, upcomingSlots } from "@/lib/slots";
import { overallStatus, summarize } from "@/lib/status";
import { DOC_LABELS, DOC_TYPES, type Pilgrim, type PilgrimAction } from "@/lib/types";

const emptyRows = () => Array.from({ length: 5 }, () => ({ name: "", mobile: "" }));

// Who to call next: booked-and-ready first (soonest slot), then ready without a slot,
// then people still missing or flagged.
function callOrder(p: Pilgrim) {
  const s = overallStatus(p);
  if (s === "complete" && p.slot) return 0;
  if (s === "complete") return 1;
  return s === "flagged" ? 2 : 3;
}

// If the session has expired (or someone is not logged in), send them to the login page.
function kickIfLoggedOut(res: Response) {
  if (res.status !== 401) return false;
  window.location.href = "/login";
  return true;
}

export default function Board() {
  const [pilgrims, setPilgrims] = useState<Pilgrim[]>([]);
  const [rows, setRows] = useState(emptyRows());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [picking, setPicking] = useState<string | null>(null); // calendar slot the operator clicked
  const [bookError, setBookError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/pilgrims", { cache: "no-store" });
    if (kickIfLoggedOut(res)) return;
    setPilgrims((await res.json()).pilgrims);
    setSlots(upcomingSlots()); // read the clock here, not during render
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(load, 5000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const filled = rows.filter((r) => r.name.trim() || r.mobile.trim());
    if (filled.length === 0) return setError("Enter at least one pilgrim.");
    setSaving(true);
    const res = await fetch("/api/pilgrims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pilgrims: filled }),
    });
    setSaving(false);
    if (kickIfLoggedOut(res)) return;
    if (!res.ok) return setError((await res.json()).error);
    setRows(emptyRows());
    load();
  }

  async function act(id: string, action: PilgrimAction) {
    const res = await fetch(`/api/pilgrims/${id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (kickIfLoggedOut(res)) return;
    load();
  }

  async function logOut() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function bookFor(id: string, slot: string) {
    setBookError("");
    const res = await fetch(`/api/pilgrims/${id}/slot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot }),
    });
    if (kickIfLoggedOut(res)) return;
    if (!res.ok) return setBookError((await res.json().catch(() => null))?.error ?? "Could not book that time.");
    setPicking(null);
    load();
  }

  async function copyLink(p: Pilgrim) {
    const url = `${window.location.origin}/upload/${p.token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link:", url);
    }
    setCopied(p.id);
    setTimeout(() => setCopied(null), 2000);
  }

  const s = summarize(pilgrims);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const open = pilgrims.filter((p) => !p.registered);
  const callList = [...open].sort(
    (a, b) => callOrder(a) - callOrder(b) || (a.slot ?? "").localeCompare(b.slot ?? ""),
  );
  const reminders = open.flatMap((p) => {
    if (overallStatus(p) !== "complete") return [{ p, label: "Documents reminder", text: docsReminder(p, origin) }];
    if (!p.slot) return [{ p, label: "Booking link", text: bookingMessage(p, origin) }];
    return [{ p, label: "Slot reminder", text: slotReminder(p) }];
  });

  const bookedBy = new Map(pilgrims.filter((p) => p.slot).map((p) => [p.slot, p.name]));
  const days = [...new Set(slots.map(dayLabel))];
  const slotHolder = picking ? pilgrims.find((p) => p.slot === picking) : undefined;
  const unbooked = pilgrims.filter((p) => !p.slot && !p.registered);

  return (
    <>
    <header className="hero">
      <div className="om" aria-hidden="true">ॐ</div>
      <div className="namaste">नमस्ते · Namaste</div>
      <h1>
        Yatra<span>Ready</span>
      </h1>
      <p>
        Operator dashboard · <Link href="/" style={{ textDecoration: "underline" }}>Back to home</Link> ·{" "}
        <button onClick={logOut} style={{ background: "none", border: 0, color: "inherit", textDecoration: "underline", font: "inherit", cursor: "pointer" }}>
          Log out
        </button>
      </p>
    </header>
    <main className={styles.page}>

      <form onSubmit={createGroup} className={styles.card}>
        <h2>Add a group (up to 5 test pilgrims)</h2>
        {rows.map((r, i) => (
          <div key={i} className={styles.formRow}>
            <input
              placeholder="Name"
              value={r.name}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            />
            <input
              placeholder="Mobile (10 digits)"
              inputMode="numeric"
              value={r.mobile}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, mobile: e.target.value } : x)))}
            />
          </div>
        ))}
        {error && <p className={styles.error}>{error}</p>}
        <button disabled={saving}>{saving ? "Creating…" : "Create group"}</button>
      </form>

      <section className={styles.card}>
        <h2>
          {s.total === 0
            ? "No pilgrims yet"
            : `${s.complete} of ${s.total} complete · ${s.flagged} flagged · ${s.missing} missing`}
        </h2>
        {s.total > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Pilgrim</th>
                {DOC_TYPES.map((d) => (
                  <th key={d}>{DOC_LABELS[d]}</th>
                ))}
                <th>Status</th>
                <th>Registration call</th>
                <th>Calls</th>
              </tr>
            </thead>
            <tbody>
              {pilgrims.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.name}
                    <br />
                    <small>{p.mobile}</small>
                    <div className={styles.linkRow}>
                      <a className={styles.linkOpen} href={`/upload/${p.token}`} target="_blank" rel="noreferrer">
                        Open upload page
                      </a>
                      <button className={styles.linkCopy} onClick={() => copyLink(p)}>
                        {copied === p.id ? "Copied!" : "Copy link"}
                      </button>
                    </div>
                  </td>
                  {DOC_TYPES.map((d) => (
                    <td key={d} title={p.docs[d].reason}>
                      <span className={`${styles.pill} ${styles[p.docs[d].status]}`}>{p.docs[d].status}</span>
                    </td>
                  ))}
                  <td>
                    <span className={`${styles.pill} ${styles[overallStatus(p)]}`}>{overallStatus(p)}</span>
                  </td>
                  <td>{p.registered ? "✓ Registered" : p.slot ? slotLabel(p.slot) : "—"}</td>
                  <td>{p.calls}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {open.length > 0 && (
        <section className={styles.card}>
          <h2>Call list</h2>
          <p className={styles.hint}>Ready pilgrims come first. Tap Called after every attempt, because registration can take several calls.</p>
          <ul className={styles.list}>
            {callList.map((p) => {
              const st = overallStatus(p);
              const note =
                st === "complete"
                  ? p.slot
                    ? `Ready. Call at ${slotLabel(p.slot)}`
                    : "Ready. No slot booked yet"
                  : st === "flagged"
                    ? `Flagged: ${DOC_TYPES.map((d) => p.docs[d].reason).filter(Boolean)[0]}`
                    : "Documents still missing";
              return (
                <li key={p.id}>
                  <div>
                    <strong>{p.name}</strong> · {p.mobile} · {p.calls} call{p.calls === 1 ? "" : "s"}
                    <br />
                    <small>{note}</small>
                  </div>
                  <div className={styles.actions}>
                    <button onClick={() => act(p.id, "called")}>Called</button>
                    {p.slot && <button onClick={() => act(p.id, "rebook")}>Rebook</button>}
                    {st === "complete" && <button onClick={() => act(p.id, "registered")}>Registered</button>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {pilgrims.length > 0 && (
        <section className={styles.card}>
          <h2>WhatsApp messages</h2>
          <button onClick={() => setShowReminders((v) => !v)}>
            {showReminders ? "Hide" : "Remind all pending"}
          </button>
          {showReminders && (
            <ul className={styles.list}>
              {reminders.length === 0 && <li>Nobody is pending. Everyone is registered.</li>}
              {reminders.map(({ p, label, text }) => (
                <li key={p.id}>
                  <div>
                    <strong>{p.name}</strong> · {label}
                    <pre className={styles.msg}>{text}</pre>
                  </div>
                  <a className={styles.wa} href={whatsappLink(p.mobile, text)} target="_blank" rel="noreferrer">
                    Open WhatsApp
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className={styles.card}>
        <h2>Registration calendar (India time)</h2>
        {days.map((day) => (
          <div key={day}>
            <h3 className={styles.day}>{day}</h3>
            <div className={styles.cal}>
              {slots
                .filter((x) => dayLabel(x) === day)
                .map((x) => (
                  <button
                    key={x}
                    type="button"
                    className={`${bookedBy.has(x) ? styles.booked : styles.free} ${picking === x ? styles.picked : ""}`}
                    onClick={() => {
                      setBookError("");
                      setPicking(picking === x ? null : x);
                    }}
                  >
                    {timeLabel(x)}
                    <br />
                    <small>{bookedBy.get(x) ?? "free"}</small>
                  </button>
                ))}
            </div>
          </div>
        ))}
        {picking && (
          <div className={styles.picker}>
            <strong>{slotLabel(picking)}</strong>
            {slotHolder ? (
              <>
                <p>Booked by {slotHolder.name}.</p>
                <button
                  onClick={async () => {
                    await act(slotHolder.id, "rebook");
                    setPicking(null);
                  }}
                >
                  Free this slot
                </button>
              </>
            ) : (
              <>
                <p>Book this time for:</p>
                {unbooked.length === 0 && <p className={styles.hint}>Everyone already has a slot, or is registered.</p>}
                <div className={styles.actions}>
                  {unbooked.map((p) => (
                    <button key={p.id} onClick={() => bookFor(p.id, picking)}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </>
            )}
            {bookError && <p className={styles.error}>{bookError}</p>}
            <button className={styles.linkCopy} onClick={() => setPicking(null)}>Close</button>
          </div>
        )}
        <p className={styles.hint}>Click a time to book it for a pilgrim, or to free a booked one.</p>
      </section>
    </main>
    </>
  );
}
