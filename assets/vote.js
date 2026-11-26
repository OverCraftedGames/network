// vote page
window.VOTE = {
  sites: [
    { id: "MinecraftServers_org", name: "MinecraftServers.org", url: "https://minecraftservers.org/vote/690376" },
    { id: "MCSL", name: "Minecraft Server List", url: "https://minecraft-server-list.com/server/521849/vote/" },
    { id: "Minecraft_Buzz", name: "Minecraft.Buzz", url: "https://minecraft.buzz/vote/carboncraft" },
    { id: "TopG_org", name: "TopG", url: "https://topg.org/minecraft-servers/server-684319" },
    { id: "minecraft-serverlist-com", name: "Minecraft-Serverlist.com", url: "https://minecraft-serverlist.com/server/5848/vote" },
    { id: "TopMinecraftServers", name: "Top Minecraft Servers", url: "https://topminecraftservers.org/vote/44378" },
    { id: "MinecraftServersList", name: "MinecraftServers-List", url: "https://minecraftservers-list.com/server/ocg-network/vote" }
  ],
  cooldown: 24,
  commands: [
    ["/vote", "the vote links in game"],
    ["/vote next", "when each site is ready again"],
    ["/votetiers", "your tier and what's next"]
  ],
  servers: {
    survival: {
      rewards: [
        {
          label: "Every vote",
          title: "Each site, every day",
          items: [["coin", "<b>$50</b> in-game money"], ["check", "<b>10</b> claim blocks"]],
          note: "That's up to $350 and 70 claim blocks a day across all seven sites."
        },
        {
          label: "All sites",
          title: "All seven in one day",
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
        text: "A day counts once you've voted on all seven sites. Finish the next day within 36 hours, or the streak starts again from day 1. After day 7 a fresh week begins."
      },
      tiers: {
        every: 35,
        count: 50,
        color: "#C0CED5",
        perTier: ["<b>$2,000</b> in-game money", "<b>100</b> claim blocks"],
        suffixEvery: 5,
        extras: "Some tiers also add more homes, player warps, auction house slots and a player vault."
      }
    },
    skyblock: {
      // TODO: skyblock rewards
    }
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

  // remember which sites were opened today
  const opened = {
    key: (server, site) => `ocg.vote.${server}.${site}`,
    get(server, site) { try { return Number(localStorage.getItem(this.key(server, site))) || 0; } catch (e) { return 0; } },
    set(server, site) { try { localStorage.setItem(this.key(server, site), String(Date.now())); } catch (e) { /* optional */ } }
  };

  const REWARDS = VOTE.servers || {};
  const SITES = VOTE.sites || [];
  const COOLDOWN = VOTE.cooldown || 24;
  const servers = NET.servers.filter((s) => REWARDS[s.id]);
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

  function sitesHtml() {
    const def = { sites: SITES };
    const cooldown = COOLDOWN;
    const done = SITES.filter((s) => hoursLeft("network", s.id, cooldown) > 0).length;
    const cards = SITES.map((s, i) => {
      const left = hoursLeft("network", s.id, cooldown);
      return `
        <a class="vsite surface${left ? " vsite--done" : ""}" href="${esc(s.url)}" target="_blank" rel="noopener"
          data-vote-site="${esc(s.id)}">
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
        <div class="vote-progress__bar" style="--done:${done / SITES.length}"><span></span></div>
        <span class="vote-progress__text"><b>${done}</b> of ${SITES.length} opened in the last ${cooldown}h</span>
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

  function feedHtml() {
    if (!feed) return `<p class="muted small">Loading voters…</p>`;
    const seen = new Map();
    Object.values(feed).flat().filter((v) => v && v.name).forEach((v) => {
      const key = (v.uuid || v.name).toLowerCase();
      const had = seen.get(key);
      if (!had || v.at > had.at) seen.set(key, had ? { ...v, sites: Math.max(v.sites || 0, had.sites || 0) } : v);
    });
    const list = Array.from(seen.values()).sort((a, b) => b.at - a.at).slice(0, 10);
    if (!list.length) return `<p class="muted small">No votes yet. Be the first!</p>`;
    const total = SITES.length;
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

  function render() {
    const server = servers.find((s) => s.id === current);
    const def = REWARDS[server.id];
    const many = servers.length > 1;
    const commands = VOTE.commands;
    const tabs = servers.map((s) => `
      <button type="button" role="tab" data-vote-server="${esc(s.id)}" aria-selected="${s.id === current}"
        style="--accent: var(--${esc(s.id)})">OCG ${esc(s.name)}${s.status !== "live" ? ` <span class="pill">Soon</span>` : ""}</button>`).join("");

    const hasRewards = (def.rewards || []).length || def.streak || def.tiers;
    root.innerHTML = `
      <div class="steps vote-steps">
        <div class="step surface">
          <h3>Pick a site</h3>
          <p>Click <b>Vote</b> on any site below. Each one resets every ${COOLDOWN} hours.</p>
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
          ${sitesHtml()}
          ${commands ? `
          <div class="vote-ingame surface">
            <p class="label">In game</p>
            <ul class="vote-cmds">${commands.map(([c, d]) => `<li><span class="cmd">${esc(c)}</span><span>${esc(d)}</span></li>`).join("")}</ul>
          </div>` : ""}
        </div>
        <aside class="vote-side">
          <div class="side-card surface">
            <p class="label">Recent voters</p>
            <div data-voters>${feedHtml()}</div>
            <p class="muted small vote-feed-note">Updates every 15 minutes.</p>
          </div>
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
    fitFeed();
  }

  // cap the feed to the height of the sites column
  function fitFeed() {
    const main = root.querySelector(".vote-main");
    const card = root.querySelector(".vote-side .side-card");
    if (!main || !card) return;
    const voters = Array.from(card.querySelectorAll(".voter"));
    voters.forEach((v) => { v.hidden = false; });
    if (card.getBoundingClientRect().top - main.getBoundingClientRect().top > 4) return;
    for (let n = voters.length - 1; n >= 3 && card.offsetHeight > main.offsetHeight; n--) {
      voters[n].hidden = true;
    }
  }
  let fitTimer = 0;
  window.addEventListener("resize", () => { clearTimeout(fitTimer); fitTimer = setTimeout(fitFeed, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitFeed);

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
      opened.set("network", site.dataset.voteSite);
      setTimeout(render, 50);
    }
  });

  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    if (id !== current && servers.some((s) => s.id === id)) { current = id; render(); }
  });

  document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });

  async function loadFeed() {
    try {
      const res = await fetch(demo ? "assets/demo-votes.json" : "votes/recent.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(res.status);
      const body = await res.json();
      const out = {};
      Object.entries(body || {}).forEach(([id, list]) => {
        if (!Array.isArray(list)) return;
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
