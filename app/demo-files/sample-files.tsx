"use client";

import { useEffect, useState } from "react";

const NAMES = ["Ramesh Kumar", "Sita Devi", "Mohan Lal"];

type Sample = { file: string; label: string; url: string };

function drawAadhaar(name: string) {
  const c = document.createElement("canvas");
  c.width = 800;
  c.height = 500;
  const x = c.getContext("2d")!;
  x.fillStyle = "#fff";
  x.fillRect(0, 0, 800, 500);
  x.fillStyle = "#f97316";
  x.fillRect(0, 0, 800, 60);
  x.fillStyle = "#16a34a";
  x.fillRect(0, 460, 800, 40);
  x.fillStyle = "#000";
  x.font = "bold 28px Arial";
  x.fillText("Government of India", 230, 40);
  x.fillStyle = "#ddd";
  x.fillRect(40, 100, 170, 210);
  x.fillStyle = "#999";
  x.beginPath();
  x.arc(125, 170, 45, 0, 7);
  x.fill();
  x.fillRect(75, 225, 100, 85);
  x.fillStyle = "#000";
  x.font = "bold 34px Arial";
  x.fillText(name, 250, 150);
  x.font = "26px Arial";
  x.fillText("DOB: 12/05/1975   Male", 250, 200);
  x.font = "bold 44px Arial";
  x.fillText("1234 5678 9012", 250, 330);
  x.font = "24px Arial";
  x.fillText("Aadhaar - Aam Aadmi ka Adhikar", 200, 400);
  return c.toDataURL("image/png");
}

function drawMedical(name: string) {
  const c = document.createElement("canvas");
  c.width = 800;
  c.height = 500;
  const x = c.getContext("2d")!;
  x.fillStyle = "#fff";
  x.fillRect(0, 0, 800, 500);
  x.fillStyle = "#000";
  x.font = "bold 30px Arial";
  x.fillText("MEDICAL FITNESS CERTIFICATE", 130, 60);
  x.font = "22px Arial";
  x.fillText("City Hospital, Pune", 280, 95);
  x.font = "24px Arial";
  x.fillText(`This is to certify that ${name},`, 60, 170);
  x.fillText("aged 50 years, has been examined and is", 60, 210);
  x.fillText("medically fit to undertake the Char Dham Yatra.", 60, 250);
  x.fillText("Date: 10/10/2026", 60, 330);
  x.font = "italic 34px serif";
  x.fillText("Dr. A. Mehta", 520, 380);
  x.font = "20px Arial";
  x.fillText("Dr. A. Mehta, MBBS, Reg. No. 45821", 430, 410);
  x.strokeStyle = "#1d4ed8";
  x.lineWidth = 4;
  x.beginPath();
  x.arc(660, 300, 60, 0, 7);
  x.stroke();
  x.fillStyle = "#1d4ed8";
  x.font = "bold 16px Arial";
  x.fillText("CITY HOSPITAL", 610, 305);
  return c.toDataURL("image/png");
}

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-");

export default function SampleFiles() {
  const [samples, setSamples] = useState<Sample[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSamples([
        ...NAMES.map((n) => ({ file: `aadhaar-${slug(n)}.png`, label: `Sample Aadhaar: ${n}`, url: drawAadhaar(n) })),
        { file: "medical-certificate-ramesh-kumar.png", label: "Sample medical certificate: Ramesh Kumar", url: drawMedical("Ramesh Kumar") },
      ]);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "24px 16px 64px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Sample documents for the demo video</h1>
      <p style={{ margin: "8px 0 16px", lineHeight: 1.5 }}>
        These are <strong>made-up</strong> sample documents (fake numbers), safe to show in a video. Click
        &ldquo;Download&rdquo; and upload them on a pilgrim&apos;s page. The <strong>passport photo</strong> must be a real
        face photo (yours or a stock photo), because the checker rejects drawings.
      </p>
      {samples.map((s) => (
        <section key={s.file} style={{ margin: "18px 0" }}>
          <h2 style={{ fontSize: 18 }}>{s.label}</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.url} alt={s.label} style={{ width: "100%", maxWidth: 480, border: "1px solid #ddd", borderRadius: 8 }} />
          <div>
            <a
              href={s.url}
              download={s.file}
              style={{ display: "inline-block", marginTop: 8, padding: "8px 14px", borderRadius: 8, background: "#b91c1c", color: "#fff" }}
            >
              Download {s.file}
            </a>
          </div>
        </section>
      ))}
    </main>
  );
}
