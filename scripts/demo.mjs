// Demo mode for recording a video: `npm run demo`
//   - writes a clean set of sample pilgrims into data-demo/ (your real data/ folder is never touched)
//   - starts the app on http://localhost:3001 using that demo data
// `npm run demo:reset` only resets the sample pilgrims (stop the demo server first, or just restart it).
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const root = process.cwd();
const dir = path.join(root, "data-demo");

const person = (name, mobile, token) => ({
  id: `demo-${token}`,
  token,
  name,
  mobile,
  docs: { aadhaar: { status: "missing" }, photo: { status: "missing" }, medical: { status: "missing" } },
  slot: null,
  calls: 0,
  registered: false,
});

rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
writeFileSync(
  path.join(dir, "db.json"),
  JSON.stringify(
    [
      person("Ramesh Kumar", "9876543210", "demoramesh01"),
      person("Sita Devi", "9876543211", "demositadevi1"),
      person("Mohan Lal", "9876543212", "demomohanlal1"),
    ],
    null,
    2,
  ),
);
console.log("Demo data reset: Ramesh Kumar, Sita Devi, Mohan Lal (all documents missing, no slots).");

if (process.argv.includes("--reset-only")) process.exit(0);

const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
console.log(`
  Demo mode
  ---------
  Operator dashboard : http://localhost:3001/dashboard   (password is OPERATOR_PASSWORD in .env.local)
  Pilgrim pages      : http://localhost:3001/upload/demoramesh01
                       http://localhost:3001/upload/demositadevi1
                       http://localhost:3001/upload/demomohanlal1
  Sample documents   : http://localhost:3001/demo-files
`);
const child = spawn(process.execPath, [nextBin, "dev", "-p", "3001"], {
  stdio: "inherit",
  env: { ...process.env, YATRA_DATA_DIR: "data-demo" },
});
child.on("exit", (code) => process.exit(code ?? 0));
