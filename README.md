# YatraReady

A hackathon MVP for pilgrimage tour operators in India. Pilgrims upload their documents (Aadhaar and passport photo are required; the medical
certificate is optional, for yatras that need one), Gemini checks each photo, and the operator sees one status board with a call
list, a registration-slot calendar and ready-written WhatsApp messages.

The product name is a placeholder. Use test data only.

## What it does

- **Landing page** (`/`) explains the product.
- **Operator dashboard** (`/dashboard`): add a group of up to 5 pilgrims, see each pilgrim's documents as
  complete, flagged or missing, track calls, and see booked registration slots on a calendar.
- **Pilgrim page** (`/upload/<code>`): upload Aadhaar and passport photo (medical certificate optional), get an instant "please resend" with the
  reason if one is bad, then book a registration call on the same page once the two required ones pass.
- **AI** is used in one place, `lib/gemini.ts`: it reads a document photo and reports what it sees. Plain
  rules in `lib/status.ts` decide complete or flagged.
- OTPs are never sent, read or stored. The operator reads them live on the call.

## Run it locally

You need Node.js (LTS).

```bash
npm install
cp .env.example .env.local   # then put your Gemini key in .env.local
npm run dev
```

Open http://localhost:3000. Get a key at https://aistudio.google.com/apikey. `.env.local` is ignored by Git.

## Notes

- **Storage.** With `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set (in `.env.local`, and in the Vercel
  project settings), pilgrims and document photos are stored in Supabase. Run `supabase/schema.sql` once in the
  Supabase SQL Editor first. Without those keys the app falls back to a local `data/db.json` file, which is fine
  on a laptop but NOT reliable on Vercel (each server instance has its own temp folder, so new pilgrims can
  "disappear"). All of this lives in `lib/store.ts`.
- Company name and contact are set in `lib/company.ts`.
- Slots are 30 minutes, 10:00-18:00 India time, for the next 3 days (`lib/slots.ts`).
