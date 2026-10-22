import Link from "next/link";
import styles from "./landing.module.css";
import { company } from "@/lib/company";

const problems = [
  { icon: "📞", title: "Endless calling", text: "Operators call and WhatsApp every pilgrim, again and again, for documents, numbers and OTPs." },
  { icon: "💬", title: "Lost in chats", text: "Photos get buried in WhatsApp threads. Someone scrolls, saves and renames them by hand." },
  { icon: "📓", title: "Tracking in memory", text: "Who is missing what lives in a notebook or in the operator's head, until the season gets busy." },
];

const steps = [
  { n: "1", title: "Add your group", text: "Type names and mobile numbers. Every pilgrim gets a personal upload link." },
  { n: "2", title: "Pilgrims upload", text: "Aadhaar, medical certificate and passport photo, straight from their phone." },
  { n: "3", title: "AI checks instantly", text: "Wrong document, blurry photo or mismatched name? They hear back within seconds." },
  { n: "4", title: "Book the call", text: "Ready pilgrims pick a registration slot. The operator's calendar blocks it." },
];

const features = [
  { icon: "🔍", title: "AI document check", text: "Reads the photo, confirms the type and the name, and says exactly what to fix." },
  { icon: "🟢", title: "One status board", text: "Complete, flagged or missing for every pilgrim, updated as documents arrive." },
  { icon: "📅", title: "Slot booking", text: "Pilgrims choose a time. Rebook as often as registration needs." },
  { icon: "📲", title: "WhatsApp messages", text: "Ready-written reminders and booking links, opened in WhatsApp in one tap." },
];

export default function Landing() {
  return (
    <>
      <header className={`hero ${styles.hero}`}>
        <div className="om" aria-hidden="true">ॐ</div>
        <div className="namaste">नमस्ते · Namaste</div>
        <h1>
          Yatra<span>Ready</span>
        </h1>
        <p className={styles.lead}>{company.tagline}</p>
        <p className={styles.sublead}>
          For pilgrimage tour operators in India running Char Dham, Amarnath and Vaishno Devi groups.
        </p>
        <div className={styles.cta}>
          <Link href="/dashboard" className={styles.primary}>Open operator dashboard</Link>
          <a href="#how" className={styles.secondary}>See how it works</a>
        </div>
      </header>

      <main className={styles.page}>
        <section className={styles.stat}>
          <strong>45 lakh+</strong>
          <span>pilgrims registered for Char Dham in a single 2026 season, all within a few weeks (NDTV, as reported)</span>
        </section>

        <section>
          <h2 className={styles.h2}>The problem</h2>
          <p className={styles.intro}>
            In peak yatra season, tour operators spend hours every day chasing pilgrims. The documents are scattered
            across calls and chats, and nobody has one view of who is still missing what.
          </p>
          <div className={styles.grid3}>
            {problems.map((p) => (
              <div key={p.title} className={styles.card}>
                <div className={styles.icon}>{p.icon}</div>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how">
          <h2 className={styles.h2}>How it works</h2>
          <ol className={styles.steps}>
            {steps.map((s) => (
              <li key={s.n}>
                <span className={styles.num}>{s.n}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className={styles.h2}>What you get</h2>
          <div className={styles.grid2}>
            {features.map((f) => (
              <div key={f.title} className={styles.card}>
                <div className={styles.icon}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.trust}>
          <h2 className={styles.h2}>AI where it helps. People where it matters.</h2>
          <div className={styles.cols}>
            <div>
              <h3>AI does</h3>
              <ul>
                <li>Reads document photos</li>
                <li>Spots blurry, wrong or mismatched documents</li>
                <li>Asks the pilgrim to resend, instantly</li>
              </ul>
            </div>
            <div>
              <h3>People do</h3>
              <ul>
                <li>Call pilgrims who need a call</li>
                <li>Review anything the AI is unsure about</li>
                <li>Complete the portal registration and read the OTP live</li>
              </ul>
            </div>
          </div>
          <p className={styles.note}>
            YatraReady never sends, reads or stores OTPs, and never automates the government portal.
          </p>
        </section>

        <section className={styles.about}>
          <h2 className={styles.h2}>About us</h2>
          <p>
            YatraReady started with a family yatra. In 2026, our founder collected documents for 14 relatives by
            phone and WhatsApp, and saw first-hand how much time it takes, and how easily a document gets lost.
          </p>
          <p>
            We are building the tool we wished we had: one board that shows who is ready, who needs a resend, and
            who needs a call, so operators can spend their season with pilgrims instead of chasing paperwork.
          </p>
          <p className={styles.note}>
            YatraReady is an early prototype built for a hackathon. The product name is a placeholder, and the demo
            uses test data only.
          </p>
        </section>

        <section className={styles.final}>
          <h2>Ready to stop chasing?</h2>
          <Link href="/dashboard" className={styles.primary}>Open operator dashboard</Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <strong>{company.product}</strong> · Pilgrim paperwork, made simple
        {company.email && (
          <>
            {" "}· <a href={`mailto:${company.email}`}>{company.email}</a>
          </>
        )}
      </footer>
    </>
  );
}
