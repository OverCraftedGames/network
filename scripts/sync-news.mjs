// Mirrors a Discord announcements channel into news/posts.json for the home page feed.
// Runs in GitHub Actions on a schedule (.github/workflows/sync-news.yml), or by hand:
//
//   node --env-file=.env scripts/sync-news.mjs                     (locally, token in .env)
//   DISCORD_BOT_TOKEN=... DISCORD_NEWS_CHANNEL_ID=... node scripts/sync-news.mjs
//   node scripts/sync-news.mjs --seed news/seed-messages.json      (offline, from a file)
//
// The bot needs View Channel and Read Message History on the channel, nothing else.
// Images are downloaded into news/media/ because Discord's attachment links expire.
//
// Writing a post in Discord:
//   - The first line is the title. "# Title" or "**Title**" both work, and so does a plain
//     first line of up to 100 characters when more text follows it.
//   - Start the title with [Survival], [Skyblock] or [Network] to tag it (default Network).
//   - The first image attached becomes the cover; later images go under the text.
//   - Put [noweb] anywhere in a message to keep it off the site.
//   - Editing or deleting the Discord message updates the site on the next sync.
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "news", "posts.json");
const MEDIA = join(ROOT, "news", "media");
const LIMIT = 50;
const TAGS = { survival: "Survival", skyblock: "Skyblock", network: "Network" };

// ---- Discord markdown -> HTML ----

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function formatStamp(unix, style) {
  const d = new Date(Number(unix) * 1000);
  const date = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }) + " UTC";
  if (style === "d" || style === "D") return date;
  if (style === "t" || style === "T") return time;
  return date + ", " + time;
}

// Inline formatting on escaped text. Code spans, links, emoji and mentions are cut out into
// placeholders first, so the emphasis rules below never touch URLs or attributes.
function inline(text, ctx) {
  const stash = [];
  const keep = (html) => { stash.push(html); return `\u0000${stash.length - 1}\u0000`; };
  let s = esc(text)
    .replace(/`([^`\n]+)`/g, (_, c) => keep(`<code>${c}</code>`))
    .replace(/&lt;t:(\d+)(?::([tTdDfFR]))?&gt;/g, (_, u, st) => formatStamp(u, st))
    .replace(/&lt;a?:(\w+):(\d+)&gt;/g, (_, name, id) =>
      keep(`<img class="emoji" src="https://cdn.discordapp.com/emojis/${id}.webp?size=48" alt=":${name}:" width="22" height="22">`))
    .replace(/&lt;@!?(\d+)&gt;/g, (_, id) => ctx.users[id] ? keep(`<span class="mention">@${esc(ctx.users[id])}</span>`) : "")
    .replace(/&lt;@&amp;\d+&gt;|&lt;#\d+&gt;|@everyone|@here/g, "")
    .replace(/&lt;id:\w+&gt;/g, "")
    .replace(/\[([^\]\n]+)\]\(&lt;?(https?:\/\/[^\s)]+?)(?:&gt;)?\)/g, (_, t, u) => keep(`<a href="${u}" rel="noopener">`) + t + keep("</a>"))
    .replace(/(^|[\s(])&lt;(https?:\/\/[^\s<]+?)&gt;/g, (_, pre, u) => pre + keep(`<a href="${u}" rel="noopener">${u}</a>`))
    .replace(/(^|[\s(])(https?:\/\/[^\s<\u0000]+[^\s<.,:;"')\]\u0000])/g, (_, pre, u) => pre + keep(`<a href="${u}" rel="noopener">${u}</a>`));
  s = s
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/(^|[^\w*])\*(?!\s)(.+?)(?<!\s)\*(?!\w)/g, "$1<em>$2</em>")
    .replace(/(^|[^\w])_(?!\s)(.+?)(?<!\s)_(?!\w)/g, "$1<em>$2</em>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>")
    .replace(/\|\|(.+?)\|\|/g, '<span class="spoiler">$1</span>');
  return s.replace(/ {2,}/g, " ").replace(/\u0000(\d+)\u0000/g, (_, i) => stash[i]).trim();
}

function toHtml(md, ctx) {
  const lines = md.replace(/\r/g, "").split("\n");
  const out = [];
  let list = null; // { type: "ul"|"ol", items: [] }
  let para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${para.map((l) => inline(l, ctx)).join("<br>")}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.type}>${list.items.map((i) => `<li>${inline(i, ctx)}</li>`).join("")}</${list.type}>`); list = null; } };
  const flush = () => { flushPara(); flushList(); };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line)) {
      flush();
      const body = [];
      for (i++; i < lines.length && !/^```/.test(lines[i]); i++) body.push(lines[i]);
      out.push(`<pre><code>${esc(body.join("\n"))}</code></pre>`);
      continue;
    }
    if (/^>>> ?/.test(line)) {
      flush();
      const rest = [line.replace(/^>>> ?/, "")].concat(lines.slice(i + 1));
      out.push(`<blockquote>${toHtml(rest.join("\n"), ctx)}</blockquote>`);
      break;
    }
    if (/^> ?/.test(line)) {
      flush();
      const body = [];
      for (; i < lines.length && /^> ?/.test(lines[i]); i++) body.push(lines[i].replace(/^> ?/, ""));
      i--;
      out.push(`<blockquote>${toHtml(body.join("\n"), ctx)}</blockquote>`);
      continue;
    }
    let m;
    if ((m = /^(#{1,3}) (.+)$/.exec(line))) {
      flush();
      const level = Math.min(m[1].length + 2, 5); // # -> h3, ## -> h4, ### -> h5 (the post title is h2)
      out.push(`<h${level}>${inline(m[2], ctx)}</h${level}>`);
      continue;
    }
    if ((m = /^-# (.+)$/.exec(line))) { flush(); out.push(`<p class="subtext">${inline(m[1], ctx)}</p>`); continue; }
    if ((m = /^\s*[-*•] (.+)$/.exec(line))) {
      flushPara();
      if (!list || list.type !== "ul") { flushList(); list = { type: "ul", items: [] }; }
      list.items.push(m[1]);
      continue;
    }
    if ((m = /^\s*\d+[.)] (.+)$/.exec(line))) {
      flushPara();
      if (!list || list.type !== "ol") { flushList(); list = { type: "ol", items: [] }; }
      list.items.push(m[1]);
      continue;
    }
    if (!line.trim()) { flush(); continue; }
    flushList();
    para.push(line);
  }
  flush();
  return out.join("\n");
}

const plain = (html) => html.replace(/<\/(p|li|h\d|blockquote|pre)>|<br>/g, " ").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();

// ---- message -> post ----

const isImage = (a) => /^image\//.test(a.content_type || "") || /\.(png|jpe?g|gif|webp)$/i.test(a.filename || a.url || "");

async function exists(p) { try { await access(p); return true; } catch { return false; } }

async function saveMedia(url, name, offline) {
  if (offline) return url; // seed mode: keep the given path as is
  const file = join(MEDIA, name);
  if (!(await exists(file))) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Image download failed (${res.status}): ${name}`);
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
  }
  return "news/media/" + name;
}

async function toPost(msg, offline) {
  let text = msg.content || "";
  // Bot-style announcements put everything in an embed.
  for (const e of msg.embeds || []) {
    if (e.type && e.type !== "rich") continue;
    const parts = [];
    if (e.title) parts.push("# " + e.title);
    if (e.description) parts.push(e.description);
    for (const f of e.fields || []) parts.push(`**${f.name}**\n${f.value}`);
    if (parts.length) text += (text ? "\n\n" : "") + parts.join("\n\n");
  }
  if (!text.trim() && !(msg.attachments || []).length) return null;
  if (/\[noweb\]/i.test(text)) return null;

  const lines = text.replace(/\r/g, "").split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();
  let first = lines[0] || "";
  let title = "";
  let m;
  if ((m = /^#{1,3} (.+)$/.exec(first)) || (m = /^\*\*(.+)\*\*$/.exec(first.trim()))) {
    title = m[1];
    lines.shift();
  }
  let tag = "Network";
  const tagMatch = /^\s*\[(\w+)\]\s*/.exec(title || first);
  if (tagMatch && TAGS[tagMatch[1].toLowerCase()]) {
    tag = TAGS[tagMatch[1].toLowerCase()];
    if (title) title = title.slice(tagMatch[0].length);
    else lines[0] = lines[0].replace(tagMatch[0], "");
  }
  // No heading markup: a short first line followed by more text still reads as the title.
  if (!title && lines.length > 1 && lines.slice(1).some((l) => l.trim())) {
    const candidate = lines[0].trim();
    if (candidate && candidate.length <= 100) {
      title = candidate.replace(/^\*\*(.+)\*\*$/, "$1").replace(/^__(.+)__$/, "$1");
      lines.shift();
    }
  }

  const users = {};
  for (const u of msg.mentions || []) users[u.id] = u.global_name || u.username;
  const ctx = { users };
  const html = toHtml(lines.join("\n"), ctx);
  if (!title) {
    const p = plain(html);
    title = p.length > 70 ? p.slice(0, 67).replace(/\s+\S*$/, "") + "…" : p || "Announcement";
  }

  const images = [];
  let n = 0;
  for (const a of (msg.attachments || []).filter(isImage)) {
    const ext = (extname(a.filename || "") || ".png").toLowerCase();
    images.push(await saveMedia(a.url, `${msg.id}-${n++}${ext}`, offline));
  }
  for (const e of msg.embeds || []) {
    const url = e.image && (e.image.url || e.image.proxy_url);
    if (url) images.push(await saveMedia(url, `${msg.id}-${n++}.png`, offline));
  }

  const author = msg.author || {};
  const excerpt = plain(html);
  return {
    id: msg.id,
    date: msg.timestamp,
    edited: msg.edited_timestamp || null,
    title: plain(inline(title, ctx)),
    tag,
    author: author.global_name || author.username || "OCG Team",
    cover: images[0] || null,
    images: images.slice(1),
    html,
    excerpt: excerpt.length > 220 ? excerpt.slice(0, 217).replace(/\s+\S*$/, "") + "…" : excerpt
  };
}

// ---- main ----

async function fetchMessages() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channel = process.env.DISCORD_NEWS_CHANNEL_ID;
  if (!token || !channel) throw new Error("Set DISCORD_BOT_TOKEN and DISCORD_NEWS_CHANNEL_ID.");
  const res = await fetch(`https://discord.com/api/v10/channels/${channel}/messages?limit=${LIMIT}`, {
    headers: { Authorization: `Bot ${token}` }
  });
  if (!res.ok) throw new Error(`Discord API ${res.status}: ${await res.text()}`);
  const messages = await res.json();
  // Without the Message Content intent Discord returns every message with empty text.
  if (messages.length && messages.every((m) => !m.content && !(m.embeds || []).length && !(m.attachments || []).length)) {
    throw new Error("Every message came back empty. Turn on Message Content Intent for the bot (Developer Portal > Bot), then run again.");
  }
  return messages;
}

async function main() {
  const seedIdx = process.argv.indexOf("--seed");
  const offline = seedIdx !== -1;
  const messages = offline
    ? JSON.parse(await readFile(join(ROOT, process.argv[seedIdx + 1]), "utf8"))
    : await fetchMessages();
  await mkdir(MEDIA, { recursive: true });

  const posts = [];
  for (const msg of messages) {
    if (msg.type && msg.type !== 0 && msg.type !== 19) continue; // normal messages and replies only
    const post = await toPost(msg, offline);
    if (post) posts.push(post);
  }
  posts.sort((a, b) => b.date.localeCompare(a.date));

  const next = JSON.stringify({ posts }, null, 2) + "\n";
  const prev = await readFile(OUT, "utf8").catch(() => "");
  if (prev === next) { console.log("News unchanged."); return; }
  await writeFile(OUT, next);
  console.log(`Wrote ${posts.length} posts to news/posts.json.`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
