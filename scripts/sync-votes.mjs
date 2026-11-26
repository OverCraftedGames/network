// recent voters -> votes/recent.json
// npm i --no-save mysql2@3.11.0 && node --env-file=.env scripts/sync-votes.mjs
// VOTES_DB_<SERVER>=mysql://user:pass@host:3306/db, optional VOTES_TABLE_<SERVER>
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "votes", "recent.json");
const SERVERS = ["survival", "skyblock"];
const LIMIT = 12;
const DAY = 24 * 3600 * 1000;

// LastVotes: "SiteKey//epochMillis" joined by "%" (or ",")
function parseLastVotes(raw) {
  return String(raw || "")
    .split(/[%,]/)
    .map((entry) => entry.trim().match(/^(.+?)\/\/(\d{10,})$/))
    .filter(Boolean)
    .map(([, site, time]) => ({ site, at: Number(time) }))
    .filter((v) => v.at > 0 && v.at <= Date.now() + 60000);
}

async function votersFor(id) {
  const url = (process.env["VOTES_DB_" + id.toUpperCase()] || "").trim();
  if (!url) return null;
  const table = (process.env["VOTES_TABLE_" + id.toUpperCase()] || "VotingPlugin_Users").trim();
  if (!/^[A-Za-z0-9_]+$/.test(table)) throw new Error(`Bad table name for ${id}: ${table}`);

  const db = await mysql.createConnection({ uri: url, connectTimeout: 20000 });
  try {
    const [rows] = await db.query(
      `SELECT uuid, PlayerName, LastVotes FROM \`${table}\` WHERE LastVotes IS NOT NULL AND LastVotes <> ''`
    );
    const voters = [];
    for (const row of rows) {
      const name = String(row.PlayerName || "").trim();
      const votes = parseLastVotes(row.LastVotes);
      if (!name || !votes.length) continue;
      const latest = Math.max(...votes.map((v) => v.at));
      // sites voted in the 24h before their latest vote
      const sites = new Set(votes.filter((v) => v.at > latest - DAY).map((v) => v.site)).size;
      voters.push({
        name,
        uuid: String(row.uuid || "").replace(/-/g, ""),
        at: new Date(latest).toISOString(),
        sites
      });
    }
    voters.sort((a, b) => b.at.localeCompare(a.at));
    console.log(`${id}: ${rows.length} players with votes, writing ${Math.min(LIMIT, voters.length)}.`);
    return voters.slice(0, LIMIT);
  } finally {
    await db.end();
  }
}

let prev = "";
try { prev = await readFile(OUT, "utf8"); } catch { /* first run */ }
let data = {};
try { data = JSON.parse(prev || "{}"); } catch { data = {}; }

let configured = 0;
for (const id of SERVERS) {
  const voters = await votersFor(id);
  if (voters === null) continue;
  configured++;
  data[id] = voters;
}
if (!configured) {
  console.error("No VOTES_DB_<SERVER> variables are set.");
  process.exit(1);
}

const next = JSON.stringify(data, null, 2) + "\n";
if (prev === next) {
  console.log("No change.");
} else {
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, next);
  console.log("Wrote votes/recent.json.");
}
