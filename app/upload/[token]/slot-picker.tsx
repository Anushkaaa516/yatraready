"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./upload.module.css";
import { dayLabel, slotLabel, timeLabel } from "@/lib/slots";

type Slot = { start: string; taken: boolean };

export default function SlotPicker({ token }: { token: string }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [mySlot, setMySlot] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [changing, setChanging] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/slots?token=${token}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setSlots(data.slots);
    setMySlot(data.mySlot);
  }, [token]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function book(slot: string) {
    setError("");
    const res = await fetch("/api/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, slot }),
    });
    if (!res.ok) setError((await res.json()).error);
    else setChanging(false);
    load();
  }

  const days = [...new Set(slots.map((s) => dayLabel(s.start)))];
  const showPicker = !mySlot || changing;

  return (
    <section className={`${styles.card} ${styles.complete}`}>
      <h2>Book your registration call</h2>
      {mySlot && !changing && (
        <>
          <p className={styles.state}>✓ Booked for {slotLabel(mySlot)} (India time). Please keep your phone and Aadhaar ready.</p>
          <button className={styles.slot} onClick={() => setChanging(true)}>Change time</button>
        </>
      )}
      {showPicker && (
        <>
          <p className={styles.state}>All documents received. Pick a time when we can call you to complete your registration.</p>
          {days.map((day) => (
            <div key={day}>
              <h3 className={styles.day}>{day}</h3>
              <div className={styles.slots}>
                {slots
                  .filter((s) => dayLabel(s.start) === day)
                  .map((s) => (
                    <button
                      key={s.start}
                      className={styles.slot}
                      disabled={s.taken}
                      onClick={() => book(s.start)}
                    >
                      {timeLabel(s.start)}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
