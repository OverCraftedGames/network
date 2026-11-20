// Home page: the news feed (news/posts.json, mirrored from the Discord announcements
// channel by scripts/sync-news.mjs) and the Discord card in the sidebar.
(() => {
  "use strict";

  const cfg = window.STORE_CONFIG || {};
  const feed = document.getElementById("news-feed");
  const more = document.getElementById("news-more");
  const PAGE = 5;
  let posts = [];
  let shown = 0;

  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function dateParts(iso) {
    const d = new Date(iso);
    return {
      day: d.toLocaleDateString("en-US", { day: "2-digit" }),
      month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      full: d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    };
  }

  // Server tag -> accent colour variable (Network uses the brand teal).
  const tagVar = (tag) => {
    const id = String(tag || "").toLowerCase();
    return (window.NETWORK && NETWORK.servers.some((s) => s.id === id)) ? `var(--${id})` : "var(--teal)";
  };

  function postHtml(p) {
    const d = dateParts(p.date);
    const gallery = (p.images || []).map((src) => `<img src="${esc(src)}" alt="" loading="lazy">`).join("");
    return `
      <article class="post surface" id="post-${esc(p.id)}" style="--accent: ${tagVar(p.tag)}">
        <div class="post__date" aria-hidden="true"><b>${d.day}</b><span>${d.month}</span></div>
        <div class="post__main">
          <div class="post__meta">
            <span class="post__tag">${esc(p.tag)}</span>
            <time datetime="${esc(p.date)}">${d.full}</time>
            <span>· ${esc(p.author)}</span>
          </div>
          <h2 class="post__title"><a href="#post-${esc(p.id)}">${esc(p.title)}</a></h2>
          ${p.cover ? `<img class="post__cover" src="${esc(p.cover)}" alt="" loading="lazy">` : ""}
          <div class="post__body">${p.html}${gallery ? `<div class="post__gallery">${gallery}</div>` : ""}</div>
          <button class="post__more" type="button" hidden>Keep reading</button>
        </div>
      </article>`;
  }

  // Long posts start folded, like a forum front page; the button opens them in place.
  function foldLong(root) {
    root.querySelectorAll(".post").forEach((post) => {
      const body = post.querySelector(".post__body");
      const btn = post.querySelector(".post__more");
      if (body.scrollHeight > 380 && !post.classList.contains("open")) {
        post.classList.add("folded");
        btn.hidden = false;
      }
    });
  }

  function showMore() {
    const next = posts.slice(shown, shown + PAGE);
    const holder = document.createElement("div");
    holder.innerHTML = next.map(postHtml).join("");
    const added = Array.from(holder.children);
    added.forEach((el) => feed.appendChild(el));
    shown += next.length;
    more.hidden = shown >= posts.length;
    // Images change the height, so measure again once they've loaded.
    foldLong(feed);
    added.forEach((el) => el.querySelectorAll("img").forEach((img) => img.addEventListener("load", () => foldLong(feed), { once: true })));
  }

  async function loadNews() {
    if (!feed) return;
    try {
      const res = await fetch("news/posts.json", { cache: "no-cache" });
      posts = ((await res.json()).posts || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    } catch (e) {
      posts = [];
    }
    feed.innerHTML = "";
    if (!posts.length) {
      feed.innerHTML = `<div class="post surface post--empty"><div class="post__main">
        <h2 class="post__title">No news yet</h2>
        <p class="muted">Announcements from our Discord show up here. <a href="${esc(cfg.discord)}">Join the Discord</a> to hear first.</p></div></div>`;
      more.hidden = true;
      return;
    }
    // A link to an older post loads enough pages to include it.
    const target = location.hash.replace(/^#post-/, "");
    const idx = target ? posts.findIndex((p) => p.id === target) : -1;
    do { showMore(); } while (idx >= shown);
    if (idx >= 0) {
      const el = document.getElementById("post-" + target);
      el.classList.add("open");
      el.classList.remove("folded");
      el.querySelector(".post__more").hidden = true;
      el.scrollIntoView({ block: "start" });
    }
  }

  feed && feed.addEventListener("click", (e) => {
    const btn = e.target.closest(".post__more");
    if (btn) {
      const post = btn.closest(".post");
      post.classList.add("open");
      post.classList.remove("folded");
      btn.hidden = true;
      return;
    }
    const spoiler = e.target.closest(".spoiler");
    if (spoiler) spoiler.classList.add("shown");
  });
  more && more.addEventListener("click", showMore);

  // ---- Discord card ----
  async function loadDiscord() {
    const card = document.querySelector("[data-discord]");
    if (!card) return;
    const set = (sel, text) => { const el = card.querySelector(sel); if (el) el.textContent = text; };
    try {
      const res = await fetch(`https://discord.com/api/v10/invites/${encodeURIComponent(cfg.discordInvite || "")}?with_counts=true`);
      const inv = await res.json();
      if (inv.guild) {
        // The card keeps its own title (OCG Discord); only the icon comes from Discord.
        if (inv.guild.icon) {
          const img = card.querySelector("[data-discord-icon]");
          img.src = `https://cdn.discordapp.com/icons/${inv.guild.id}/${inv.guild.icon}.png?size=96`;
          img.hidden = false;
        }
      }
      if (inv.approximate_presence_count != null) {
        set("[data-discord-online]", inv.approximate_presence_count.toLocaleString("en-US"));
        set("[data-discord-members]", inv.approximate_member_count.toLocaleString("en-US"));
        card.querySelector(".discord-card__counts").hidden = false;
      }
    } catch (e) { /* counts stay hidden */ }
    if (!cfg.discordGuildId) return;
    try {
      const res = await fetch(`https://discord.com/api/guilds/${encodeURIComponent(cfg.discordGuildId)}/widget.json`);
      const w = await res.json();
      const people = (w.members || []).filter((m) => m.avatar_url).slice(0, 12);
      const holder = card.querySelector("[data-discord-people]");
      if (people.length && holder) {
        holder.innerHTML = people.map((m) =>
          `<img src="${esc(m.avatar_url)}" alt="" title="${esc(m.username)}" width="30" height="30" loading="lazy">`).join("");
        holder.hidden = false;
      }
    } catch (e) { /* the avatar row is optional */ }
  }

  loadNews();
  loadDiscord();
})();
