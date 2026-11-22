// Writes the most recent store buyers to purchases/recent.json for the "Recent supporters"
// row on the store page. Runs in GitHub Actions on a schedule (.github/workflows/sync-purchases.yml),
// or by hand:
//
//   node --env-file=.env scripts/sync-purchases.mjs          (locally, key in .env)
//   TEBEX_SECRET=... node scripts/sync-purchases.mjs
//
// Uses the Tebex Plugin API, which needs the store's SECRET key (Tebex > Integrations >
// Game Servers). That key can take payments and run commands, so it must never be in the
// site's own files: keep it in the TEBEX_SECRET repository secret only.
//
// Only the player name and UUID are written out. Amounts, packages, emails and payment IDs
// never reach the repo. Each player appears once, newest purchase first.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "purchases", "recent.json");
const LIMIT = 12;

const secret = (process.env.TEBEX_SECRET || "").trim();
if (!secret) {
  console.error("TEBEX_SECRET is not set.");
  process.exit(1);
}

const res = await fetch("https://plugin.tebex.io/payments?paged=1", {
  headers: { "X-Tebex-Secret": secret, Accept: "application/json" }
});
if (!res.ok) {
  console.error(`Tebex returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}
const body = await res.json();
const payments = Array.isArray(body) ? body : (body.data || []);

const seen = new Set();
const buyers = [];
payments
  .filter((p) => !p.status || String(p.status).toLowerCase() === "complete")
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .forEach((p) => {
    const name = p.player && String(p.player.name || "").trim();
    if (!name || buyers.length >= LIMIT) return;
    const key = (p.player.uuid || name).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    buyers.push({ name, uuid: p.player.uuid || "" });
  });

const next = JSON.stringify(buyers, null, 2) + "\n";
let prev = "";
try { prev = await readFile(OUT, "utf8"); } catch { /* first run */ }
if (prev === next) {
  console.log("No change.");
} else {
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, next);
  console.log(`Wrote ${buyers.length} recent buyers.`);
}
