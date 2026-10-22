# Recording the demo video

Record from your own computer, not the live link. Demo mode starts the app with clean sample pilgrims,
keeps your real data untouched, and can be reset in one command, so every take looks the same and the
video can loop.

## Set up (once per take)

1. Stop any other `npm run dev` window (only one app can run in this folder at a time).
2. In the project folder run:

   ```bash
   npm run demo
   ```

3. Open these in the browser (the terminal also prints them):
   - Home page: http://localhost:3001
   - Operator dashboard: http://localhost:3001/dashboard (password = `OPERATOR_PASSWORD` in `.env.local`)
   - Pilgrim page: http://localhost:3001/upload/demoramesh01
   - Sample documents to download: http://localhost:3001/demo-files

4. Download the sample files from `/demo-files`. They are made up (fake numbers).
   For the **passport photo**, use a real face photo (yours or a stock photo). The checker rejects drawings.
5. **Warm up once:** upload the sample Aadhaar on a pilgrim page, then run `npm run demo:reset`
   and refresh. The very first checks can be slow; after that they take 1-3 seconds.
6. For a new take, run `npm run demo:reset` (the app can keep running), then refresh the page.

The AI checker has a daily free limit (about 20 checks per model, and the app spreads them across several
models), so do not rehearse dozens of times in one day.

## Shot list (about 60 seconds, ends where it starts so it loops)

| Time | Screen | Action |
|---|---|---|
| 0:00 | Home page | Slowly scroll the page: problem, how it works. |
| 0:10 | Dashboard | Click "Open operator dashboard", log in. Show the 3 pilgrims (all "missing"). |
| 0:18 | Dashboard | Click "Copy link" / "Open upload page" on Ramesh Kumar. |
| 0:22 | Pilgrim page | Upload the sample Aadhaar. Wait for "Received and checked". |
| 0:30 | Pilgrim page | Upload a blurry photo to the Passport photo box (or a non-face image) to show "Please send again: ..." |
| 0:38 | Pilgrim page | Upload the real passport photo. Both required documents go green, booking unlocks. |
| 0:45 | Pilgrim page | Pick a slot. Show "Booked for ...". |
| 0:50 | Dashboard | Show Ramesh "complete" with the slot, the calendar blocked, the call list. |
| 0:57 | Home page | Click "Back to home". The video ends on the same screen it started on, so it loops. |

## Make it a loop

- Windows built-in recorder: press **Win + Alt + R** to start and stop (Xbox Game Bar), or use Clipchamp.
- To loop: upload the clip to a video player or editor that has a "loop" or "repeat" option, or export a GIF.
  Because the video starts and ends on the home page, the repeat looks seamless.
- Tip: set the browser window to a consistent size, hide bookmarks, and zoom to 110-125% so text is readable.

## If something looks wrong

- "Wrong password": use the `OPERATOR_PASSWORD` line in `.env.local`.
- A check says "try again": wait a few seconds and upload again; the app retries other models automatically.
- Start over any time: `npm run demo:reset`, then refresh.
