// Vote page (vote.html): vote sites, rewards and the recent voter feed for each server, picked
// with the server tabs (#survival, #skyblock). Server names and status come from data.js.
//
// The vote sites and rewards below mirror each server's config. Keep them in step when it changes:
//   Sites, per-vote rewards       VotingPlugin/VoteSites.yml
//   All-sites bonus, vote party   VotingPlugin/SpecialRewards.yml + Rewards/AllSitesKeys.yml
//   Vote streak                   CarbonCore/CarbonSpend/config.yml (vote-streak)
//   Vote tiers                    CMI/Settings/Ranks.yml (Votes: per tier)
//
// The feed reads votes/recent.json, written every 15 minutes by scripts/sync-votes.mjs.
// Demo mode reads assets/demo-votes.json instead.
window.VOTE = {
  survival: {
    sites: [
      { id: "MinecraftServers_org", name: "MinecraftServers.org", url: "https://minecraftservers.org/vote/690376" },
      { id: "MCSL", name: "Minecraft Server List", url: "https://minecraft-server-list.com/server/521849/vote/" },
      { id: "Minecraft_Buzz", name: "Minecraft.Buzz", url: "https://minecraft.buzz/vote/carboncraft" },
      { id: "TopG_org", name: "TopG", url: "https://topg.org/minecraft-servers/server-684319" },
      { id: "minecraft-serverlist-com", name: "Minecraft-Serverlist.com", url: "https://minecraft-serverlist.com/server/5848/vote" },
      { id: "TopMinecraftServers", name: "Top Minecraft Servers", url: "https://topminecraftservers.org/vote/44378" }
    ],
    // Hours between votes on one site.
    cooldown: 24,
    rewards: [
      {
        label: "Every vote",
        title: "Each site, every day",
        items: [["coin", "<b>$50</b> in-game money"], ["check", "<b>10</b> claim blocks"]],
        note: "That's up to $300 and 60 claim blocks a day across all six sites."
      },
      {
        label: "All sites",
        title: "All six in one day",
        items: [["key", "<b>2 Vote Keys</b>"], ["key", "<b>2 more</b> with double vote keys"]],
        note: "Double vote keys come with any OCG+ tier, or the Prism and Radiant ranks. You also get a shout-out in chat."
      },
      {
        label: "Vote party",
        title: "Every 100 server votes",
        items: [["key", "A <b>T2 crate key</b> for everyone online"]],
        note: "Every vote from every player counts towards it. Be online when it hits 100."
      }
    ],
    streak: {
      days: [2, 4, 6, 8, 10, 12, 14],
      windowHours: 36,
      text: "A day counts once you've voted on all six sites. Finish the next day within 36 hours, or the streak starts again from day 1. After day 7 a fresh week begins."
    },
    tiers: {
      every: 35,
      count: 50,
      color: "#C0CED5",
      perTier: ["<b>$2,000</b> in-game money", "<b>100</b> claim blocks"],
      // Every fifth tier unlocks its numeral as a chat suffix.
      suffixEvery: 5,
      extras: "Some tiers also add more homes, player warps, auction house slots and a player vault."
    },
    commands: [
      ["/vote", "the vote links in game"],
      ["/vote next", "when each site is ready again"],
      ["/votetiers", "your tier and what's next"]
    ]
  },
  skyblock: {
    // No vote sites yet. Fill this in like Survival when Skyblock opens.
    sites: []
  }
};

(() => {
  "use strict";

  const root = document.querySelector("[data-vote]");
  if (!root) return;

  const cfg = window.STORE_CONFIG || {};
  const NET = window.NETWORK || { servers: [] };
  const VOTE = window.VOTE || {};
  const params = new URLSearchParams(location.search);
  const demo = !(cfg.publicToken || "").trim() || params.has("demo") || (!!cfg.forceDemo && !params.has("live"));

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, size) => `<svg width="${size}" height="${size}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const ROMAN = [[50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  const roman = (n) => ROMAN.reduce((out, [v, s]) => { while (n >= v) { out += s; n -= v; } return out; }, "");
  const num = (n) => n.toLocaleString("en-US");

  // Which sites this browser has opened, so players can see what's left today. Only a
  // reminder: opening a site isn't the same as voting on it. Storage can throw; it's optional.
  const opened = {
    key: (server, site) => `ocg.vote.${server}.${site}`,
    get(server, site) { try { return Number(localStorage.getItem(this.key(server, site))) || 0; } catch (e) { return 0; } },
    set(server, site) { try { localStorage.setItem(this.key(server, site), String(Date.now())); } catch (e) { /* optional */ } }
  };

  const servers = NET.servers.filter((s) => VOTE[s.id]);
  if (!servers.length) return;
  const fromHash = location.hash.slice(1);
  let current = servers.some((s) => s.id === fromHash) ? fromHash
    : (servers.find((s) => s.status === "live") || servers[0]).id;
  let feed = null;

  function ago(ms) {
    const min = Math.max(0, Math.round((Date.now() - ms) / 60000));
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    return d === 1 ? "yesterday" : `${d} days ago`;
  }

  function hoursLeft(server, site, cooldown) {
    const at = opened.get(server, site);
    if (!at) return 0;
    const left = at + cooldown * 3600000 - Date.now();
    return left > 0 ? Math.ceil(left / 3600000) : 0;
  }

  function sitesHtml(server, def) {
    const cooldown = def.cooldown || 24;
    const done = def.sites.filter((s) => hoursLeft(server.id, s.id, cooldown) > 0).length;
    const cards = def.sites.map((s, i) => {
      const left = hoursLeft(server.id, s.id, cooldown);
      return `
        <a class="vsite surface${left ? " vsite--done" : ""}" href="${esc(s.url)}" target="_blank" rel="noopener"
          data-vote-site="${esc(s.id)}" data-site-server="${esc(server.id)}">
          <span class="vsite__num">${String(i + 1).padStart(2, "0")}</span>
          <span class="vsite__name">${esc(s.name)}</span>
          <span class="vsite__state">${left
            ? `${icon("check", 16)} Again in ${left}h`
            : `Every ${cooldown}h`}</span>
          <span class="btn btn--sm${left ? " btn--ghost" : " btn--accent"} vsite__go">${left ? "Open again" : "Vote"}</span>
        </a>`;
    }).join("");
    return `
      <div class="vote-progress">
        <div class="vote-progress__bar" style="--done:${done / def.sites.length}"><span></span></div>
        <span class="vote-progress__text"><b>${done}</b> of ${def.sites.length} opened in the last ${cooldown}h</span>
      </div>
      <div class="vsites">${cards}</div>
      <p class="muted small vote-note">The ticks only remember which links you opened in this browser.
        Your real votes are counted by the sites.</p>`;
  }

  function rewardsHtml(def) {
    const cards = (def.rewards || []).map((r) => `
      <div class="vreward surface">
        <span class="vreward__label">${esc(r.label)}</span>
        <h3>${esc(r.title)}</h3>
        <ul>${r.items.map(([ic, text]) => `<li>${icon(ic, 20)}<span>${text}</span></li>`).join("")}</ul>
        ${r.note ? `<p>${esc(r.note)}</p>` : ""}
      </div>`).join("");

    const st = def.streak;
    const streak = st ? `
      <div class="vstreak surface">
        <div class="vstreak__text">
          <span class="vreward__label">Vote streak</span>
          <h3>Seven days, ${num(st.days.reduce((a, b) => a + b, 0))} Credits</h3>
          <p>${esc(st.text)}</p>
        </div>
        <ol class="vstreak__days">${st.days.map((c, i) => `
          <li><span>Day ${i + 1}</span><b>${c}</b><small>Credits</small></li>`).join("")}
        </ol>
      </div>` : "";

    const t = def.tiers;
    let tiers = "";
    if (t) {
      const milestones = [];
      for (let n = t.suffixEvery; n <= t.count; n += t.suffixEvery) milestones.push(n);
      tiers = `
        <div class="vtiers surface" style="--tier:${esc(t.color)}">
          <div class="vtiers__head">
            <div>
              <span class="vreward__label">Vote tiers</span>
              <h3>${t.count} tiers, one every ${t.every} votes</h3>
              <p>Your all-time votes climb the ladder. Every tier pays out, and every
                ${t.suffixEvery === 5 ? "fifth" : esc(t.suffixEvery) + "th"} unlocks its numeral as a chat suffix.</p>
            </div>
            <ul class="vtiers__pay">${t.perTier.map((p) => `<li>${icon("check", 18)}<span>${p} <small>every tier</small></span></li>`).join("")}</ul>
          </div>
          <ol class="vtiers__ladder" aria-label="Suffix tiers">${milestones.map((n) => `
            <li><span class="mc-suffix">[${roman(n)}]</span><small>${num(n * t.every)} votes</small></li>`).join("")}
          </ol>
          ${t.extras ? `<p class="muted small">${esc(t.extras)}</p>` : ""}
        </div>`;
    }
    return `<div class="vrewards">${cards}</div>${streak}${tiers}`;
  }

  function feedHtml(server, def) {
    if (!feed) return `<p class="muted small">Loading voters…</p>`;
    const list = (feed[server.id] || []).filter((v) => v && v.name).slice(0, 10);
    if (!list.length) return `<p class="muted small">No votes yet. Be the first!</p>`;
    const total = def.sites.length;
    return `<ol class="voters">${list.map((v) => {
      const all = total && v.sites >= total;
      return `
        <li class="voter">
          <img src="https://mc-heads.net/avatar/${encodeURIComponent(v.uuid || v.name)}/48" alt="" width="36" height="36" loading="lazy"
            onerror="this.onerror=null;this.src='https://mc-heads.net/avatar/MHF_Steve/48'">
          <span class="voter__name">${esc(v.name)}</span>
          <span class="voter__meta">${v.sites && total ? `<span class="voter__sites${all ? " voter__sites--all" : ""}">${all ? "All sites" : `${v.sites}/${total}`}</span>` : ""}
            <time datetime="${new Date(v.at).toISOString()}">${ago(v.at)}</time></span>
        </li>`;
    }).join("")}</ol>`;
  }

  function soonHtml(server) {
    return `
      <div class="callout callout--warn">OCG ${esc(server.name)} isn't open yet. Its vote rewards
        go up here when it launches.</div>`;
  }

  // Vote sites and the feed show every server at once, grouped by server. The tabs under
  // "What voting gets you" only switch the rewards.
  function render() {
    const server = servers.find((s) => s.id === current);
    const def = VOTE[server.id];
    const voting = servers.filter((s) => (VOTE[s.id].sites || []).length);
    const waiting = servers.filter((s) => !(VOTE[s.id].sites || []).length);
    const many = servers.length > 1;
    const firstDef = voting.length ? VOTE[voting[0].id] : def;
    const commands = voting.map((s) => VOTE[s.id].commands).find(Boolean);
    const tabs = servers.map((s) => `
      <button type="button" role="tab" data-vote-server="${esc(s.id)}" aria-selected="${s.id === current}"
        style="--accent: var(--${esc(s.id)})">OCG ${esc(s.name)}${s.status !== "live" ? ` <span class="pill">Soon</span>` : ""}</button>`).join("");

    const groups = voting.map((s) => `
      <div class="vote-group" style="--accent: var(--${esc(s.id)})">
        ${many ? `<h3 class="vote-group__title">OCG <span>${esc(s.name)}</span></h3>` : ""}
        ${sitesHtml(s, VOTE[s.id])}
      </div>`).join("") + waiting.map((s) => `
      <p class="vote-group__soon" style="--accent: var(--${esc(s.id)})">OCG <span>${esc(s.name)}</span>: vote sites open when it launches.</p>`).join("");

    const feeds = voting.map((s) => `
      <div class="side-card surface" style="--accent: var(--${esc(s.id)})">
        <p class="label">Recent voters${voting.length > 1 ? ` · ${esc(s.name)}` : ""}</p>
        <div data-voters>${feedHtml(s, VOTE[s.id])}</div>
        <p class="muted small vote-feed-note">Updates every 15 minutes.</p>
      </div>`).join("");

    const hasRewards = (def.rewards || []).length || def.streak || def.tiers;
    root.innerHTML = `
      <div class="steps vote-steps">
        <div class="step surface">
          <h3>Pick a site</h3>
          <p>Click <b>Vote</b> on any site below. Each one resets every ${firstDef.cooldown || 24} hours.</p>
        </div>
        <div class="step surface">
          <h3>Enter your name</h3>
          <p>Type your username exactly as it is in game. On Bedrock, start it with a dot: <span class="cmd">.Steve</span></p>
        </div>
        <div class="step surface">
          <h3>Get rewarded</h3>
          <p>Rewards land in game right away. Offline? They wait for your next join.</p>
        </div>
      </div>
      <div class="vote-layout">
        <div class="vote-main">
          <div class="vote-sites-head">
            <h2>Vote sites</h2>
          </div>
          ${groups}
        </div>
        <aside class="vote-side">
          ${feeds}
          ${commands ? `
          <div class="side-card surface">
            <p class="label">In game</p>
            <ul class="vote-cmds">${commands.map(([c, d]) => `<li><span class="cmd">${esc(c)}</span><span>${esc(d)}</span></li>`).join("")}</ul>
          </div>` : ""}
        </aside>
      </div>
      <div class="section-head vote-rewards-head">
        <div>
          <p class="label">Rewards</p>
          <h2>What voting gets you</h2>
          <p>Everything below stacks: one vote on every site, every day, pays all of it.</p>
        </div>
      </div>
      ${many ? `<div class="rank-tabs vote-tabs" role="tablist" aria-label="Rewards for">${tabs}</div>` : ""}
      <div class="vote-rewards" style="--accent: var(--${esc(server.id)})">
        ${hasRewards ? rewardsHtml(def) : soonHtml(server)}
      </div>`;
  }

  root.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-vote-server]");
    if (tab) {
      current = tab.dataset.voteServer;
      history.replaceState(null, "", "#" + current);
      render();
      return;
    }
    const site = e.target.closest("[data-vote-site]");
    if (site) {
      opened.set(site.dataset.siteServer, site.dataset.voteSite);
      // Let the new tab open first, then show the tick.
      setTimeout(render, 50);
    }
  });

  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    if (id !== current && servers.some((s) => s.id === id)) { current = id; render(); }
  });

  // Coming back to the tab after voting: refresh the ticks and the "x ago" times.
  document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });

  async function loadFeed() {
    try {
      const res = await fetch(demo ? "assets/demo-votes.json" : "votes/recent.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(res.status);
      const body = await res.json();
      const out = {};
      Object.entries(body || {}).forEach(([id, list]) => {
        if (!Array.isArray(list)) return;
        // Demo entries give minutesAgo so the preview always looks recent.
        out[id] = list.map((v) => ({
          ...v,
          at: v.minutesAgo != null ? Date.now() - v.minutesAgo * 60000 : Date.parse(v.at)
        })).filter((v) => Number.isFinite(v.at)).sort((a, b) => b.at - a.at);
      });
      feed = out;
    } catch (e) {
      feed = {};
    }
    render();
  }

  render();
  loadFeed();
})();
