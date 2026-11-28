// recent buyers -> purchases/recent.json (names + uuids only)
// this month's top supporter -> purchases/top.json (name + uuid only, never amounts)
// node --env-file=.env scripts/sync-purchases.mjs
// needs TEBEX_SECRET, never commit it
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "purchases", "recent.json");
const TOP_OUT = join(ROOT, "purchases", "top.json");
const LIMIT = 12;

const secret = (process.env.TEBEX_SECRET || "").trim();
if (!secret) {
  console.error("TEBEX_SECRET is not set.");
  process.exit(1);
}

// this calendar month (UTC), for the top supporter
const now = new Date();
const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
const monthKey = now.toISOString().slice(0, 7);
const MAX_PAGES = 40;

async function fetchPage(page) {
  const res = await fetch(`https://plugin.tebex.io/payments?paged=${page}`, {
    headers: { "X-Tebex-Secret": secret, Accept: "application/json" }
  });
  if (!res.ok) {
    console.error(`Tebex returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
    process.exit(1);
  }
  return res.json();
}

// newest first; keep paging until we're past the start of the month
const all = [];
for (let page = 1; page <= MAX_PAGES; page++) {
  const body = await fetchPage(page);
  const rows = Array.isArray(body) ? body : (body.data || []);
  all.push(...rows);
  const oldest = Math.min(...rows.map((p) => new Date(p.date).getTime()).filter(Number.isFinite));
  const lastPage = Array.isArray(body) || !body.next_page_url || !rows.length;
  if (lastPage || oldest < monthStart) break;
}

const payments = all
  .filter((p) => !p.status || String(p.status).toLowerCase() === "complete")
  .sort((a, b) => new Date(b.date) - new Date(a.date));

const seen = new Set();
const buyers = [];
payments
  .forEach((p) => {
    const name = p.player && String(p.player.name || "").trim();
    if (!name || buyers.length >= LIMIT) return;
    const key = (p.player.uuid || name).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    buyers.push({ name, uuid: p.player.uuid || "" });
  });

// top supporter: most spent this month. Amounts stay in this script, only the name is written.
const totals = new Map();
for (const p of payments) {
  const when = new Date(p.date).getTime();
  const name = p.player && String(p.player.name || "").trim();
  if (!name || !(when >= monthStart)) continue;
  const key = (p.player.uuid || name).toLowerCase();
  const row = totals.get(key) || { name, uuid: p.player.uuid || "", spent: 0, first: when };
  row.spent += Number(p.amount) || 0;
  row.first = Math.min(row.first, when);
  totals.set(key, row);
}
// ties go to whoever bought first
const best = [...totals.values()].sort((a, b) => b.spent - a.spent || a.first - b.first)[0];
const top = { month: monthKey, name: best ? best.name : null, uuid: best ? best.uuid : "" };

async function save(file, data, what) {
  const next = JSON.stringify(data, null, 2) + "\n";
  let prev = "";
  try { prev = await readFile(file, "utf8"); } catch { /* first run */ }
  if (prev === next) {
    console.log(`${what}: no change.`);
    return;
  }
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, next);
  console.log(`${what}: updated.`);
}

await save(OUT, buyers, `Recent buyers (${buyers.length})`);
await save(TOP_OUT, top, `Top supporter for ${monthKey}`);
