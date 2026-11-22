// OCG Network site and store front end on the Tebex Headless API.
// Live mode needs only the public token (assets/config.js); payment runs in Tebex's own
// checkout (Tebex.js popup, or a redirect to the basket's checkout link as a fallback).
// Demo mode (no token, config forceDemo, or ?demo) reads assets/demo-catalogue.json and
// keeps the basket locally. ?live overrides forceDemo for testing.
// The basket, player chip and server status run on every page (chrome from layout.js).
// Catalogue sections render wherever the page has their container:
//   #home-categories   category cards (store hub)       #package-grid  tabbed all-packages
//   [data-packages=slug] package cards for one category  [data-plus]    OCG+ tier cards
//   [data-ranks=server]  rank comparison table          [data-servers] server cards (data.js)
(() => {
  "use strict";

  const cfg = window.STORE_CONFIG || {};
  const NET = window.NETWORK || { servers: [], plus: [], ranks: {}, creditUses: {} };
  const ART = window.NETWORK_ART || {};
  const CATS = cfg.categories || {};
  const API = "https://headless.tebex.io/api";
  const token = (cfg.publicToken || "").trim();
  const params = new URLSearchParams(location.search);
  const demo = !token || params.has("demo") || (!!cfg.forceDemo && !params.has("live"));

  const $ = (id) => document.getElementById(id);
  const els = {
    tabs: $("category-tabs"), grid: $("package-grid"), count: $("basket-count"),
    drawer: $("basket"), scrim: $("scrim"), lines: $("basket-lines"), total: $("basket-total"),
    forWho: $("basket-for"), checkout: $("checkout-btn"), coupon: $("coupon-form"),
    couponCode: $("coupon-code"), chipName: $("player-name"), chipHead: $("player-head"),
    userModal: $("user-modal"), userForm: $("user-form"), userInput: $("user-input"),
    pkgModal: $("pkg-modal"), pkgDetail: $("pkg-detail"), toast: $("toast"),
    homeCats: $("home-categories")
  };

  // localStorage can throw (private windows, blocked storage); the store works without it.
  const saved = {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) {
      try {
        if (value == null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch (e) { /* not persisted */ }
    }
  };

  let categories = [];
  const packages = new Map();
  let activeSlug = null;
  let basket = null;
  let username = saved.get("ocg.username");
  let busy = false;

  // ---- helpers ----

  function esc(text) {
    return String(text == null ? "" : text).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  function money(amount, currency) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(amount);
    } catch (e) {
      return "$" + Number(amount).toFixed(2);
    }
  }

  let toastTimer = 0;
  function toast(message, isError) {
    els.toast.textContent = message;
    els.toast.classList.toggle("error", !!isError);
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, isError ? 6000 : 3200);
  }

  class ApiError extends Error {
    constructor(message, status) { super(message); this.status = status; }
  }

  async function api(path, options) {
    const opts = options || {};
    const init = { method: opts.method || "GET", headers: {} };
    if (opts.body !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    const res = await fetch(API + path, init);
    let json = null;
    try { json = await res.json(); } catch (e) { /* empty or HTML body */ }
    if (!res.ok) {
      const msg = (json && (json.detail || json.title || json.message)) || ("Store error " + res.status);
      throw new ApiError(msg, res.status);
    }
    return json;
  }

  const account = (path) => "/accounts/" + encodeURIComponent(token) + path;

  // "OCG+ [3 Month]" -> title "OCG+", variant "3 Month".
  function splitName(name) {
    const m = /^(.*?)\s*\[(.+)\]\s*$/.exec(String(name || ""));
    return m ? { title: m[1], variant: m[2] } : { title: String(name || ""), variant: "" };
  }

  function savePercent(p) {
    return p.discount > 0 ? Math.round((p.discount / (p.total_price + p.discount)) * 100) : 0;
  }

  // Tebex's base_price is already the sale price; the pre-sale price is price + discount.
  function priceHtml(p) {
    const sub = p.type === "subscription" && p.expiry_period;
    const period = !sub ? "" : p.expiry_period.count === 1
      ? `<span class="period">/ ${p.expiry_period.unit}</span>`
      : `<span class="period">/ ${p.expiry_period.count} ${p.expiry_period.unit}s</span>`;
    const was = p.discount > 0 ? `<s>${money(p.total_price + p.discount, p.currency)}</s>` : "";
    const notes = [];
    if (sub && p.expiry_period.unit === "day" && p.expiry_period.count >= 60) {
      const months = Math.round(p.expiry_period.count / 30);
      notes.push(money(p.total_price / months, p.currency) + " a month");
    }
    if (p.discount > 0) notes.push("save " + savePercent(p) + "%");
    const note = notes.length ? `<span class="price__note">${notes.join(" · ")}</span>` : "";
    return `<div class="price"><b>${money(p.total_price, p.currency)}</b>${period}${was}${note}</div>`;
  }
  const pageUrl = () => location.origin + location.pathname;

  // ---- catalogue ----

  async function loadCatalogue() {
    if (demo) {
      const res = await fetch("assets/demo-catalogue.json");
      return (await res.json()).data;
    }
    const json = await api(account("/categories?includePackages=1"));
    return json.data;
  }

  // Tebex leaves every package at order 0 until they are dragged in the panel, so ties fall
  // back to price (cheapest first) and then id (oldest first), which keeps tiers and ranks
  // paired with data.js.
  const sortByOrder = (list) => (list || []).slice().sort((a, b) =>
    (a.order || 0) - (b.order || 0) ||
    (a.total_price || 0) - (b.total_price || 0) ||
    (a.id || 0) - (b.id || 0));
  const categoryArt = (c) => ((c.packages || []).find((p) => p.image) || {}).image || "";

  function plainText(html) {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return (div.textContent || "").replace(/\s+/g, " ").trim();
  }

  function renderTabs() {
    if (!els.tabs) return;
    els.tabs.innerHTML = categories.map((c) => {
      const art = categoryArt(c);
      return `<button class="tab" role="tab" type="button" data-slug="${esc(c.slug)}" ` +
        `aria-selected="${c.slug === activeSlug}">${art ? `<img src="${esc(art)}" alt="">` : ""}${esc(c.name.trim())}</button>`;
    }).join("");
  }

  // Only lines for the player themself; a gift of the same package is a separate line.
  function inBasket(pkgId) {
    return !!(basket && basket.packages && basket.packages.some((p) =>
      String(p.id) === String(pkgId) && !(p.in_basket && p.in_basket.gift_username)));
  }

  function cardHtml(p) {
    const owned = inBasket(p.id);
    const name = splitName(p.name);
    return `
      <article class="card surface">
        <button class="card__art" type="button" data-details="${p.id}" aria-label="Details for ${esc(p.name)}">
          ${p.discount > 0 ? `<span class="badge">-${savePercent(p)}%</span>` : ""}
          ${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : ""}
          <span class="card__info">Details</span>
        </button>
        <div class="card__body">
          <h3 class="card__name">${esc(name.title)}</h3>
          ${name.variant ? `<p class="card__variant">${esc(name.variant)}</p>` : ""}
          <div class="card__foot">
            ${priceHtml(p)}
            <button class="btn btn--block add${owned ? " in-basket" : ""}" type="button" data-add="${p.id}">
              ${owned ? "In basket ✓" : "Add to basket"}
            </button>
          </div>
        </div>
      </article>`;
  }

  function renderHome() {
    if (els.homeCats) els.homeCats.innerHTML = categories.map((c) => {
      const pkgs = c.packages || [];
      const art = categoryArt(c);
      const from = pkgs.length ? Math.min(...pkgs.map((p) => p.total_price)) : 0;
      const best = Math.max(0, ...pkgs.map(savePercent));
      let blurb = plainText(c.description);
      if (blurb.length > 150) blurb = blurb.slice(0, 147).replace(/\s+\S*$/, "") + "…";
      return `
        <a class="cat-card surface" href="${esc(catHref(c.slug))}">
          <div class="cat-card__art">
            ${best ? `<span class="badge">Up to -${best}%</span>` : ""}
            ${art ? `<img src="${esc(art)}" alt="" loading="lazy">` : ""}
          </div>
          <div>
            <h3>${esc(c.name.trim())}</h3>
            <p>${esc(blurb || pkgs.length + " package" + (pkgs.length === 1 ? "" : "s") + " to choose from.")}</p>
            <div class="cat-card__meta">
              ${pkgs.length ? `<span class="cat-card__from">From ${money(from, pkgs[0].currency)}</span>` : ""}
              <span class="cat-card__go">Shop →</span>
            </div>
          </div>
        </a>`;
    }).join("") || `<p class="muted">Nothing for sale right now.</p>`;

    const deals = [];
    categories.forEach((c) => sortByOrder(c.packages).forEach((p) => {
      if (p.discount > 0) deals.push({ p, slug: c.slug });
    }));
    const featured = $("home-featured");
    if (featured && deals.length) {
      featured.innerHTML = deals.slice(0, 4).map((d) => cardHtml(d.p)).join("");
      $("featured-section").hidden = false;
    }
    const ticker = $("ticker");
    if (ticker && deals.length) {
      let items = deals.map((d) => {
        const n = splitName(d.p.name);
        return `<a class="ticker__item" href="${esc(catHref(d.slug))}"><b>-${savePercent(d.p)}%</b>${esc(n.title)}${n.variant ? " " + esc(n.variant) : ""}</a>`;
      });
      while (items.length < 8) items = items.concat(items);
      // Two identical halves so the -50% scroll loops without a seam.
      ticker.querySelector(".ticker__track").innerHTML = items.join("") + items.join("");
      ticker.hidden = false;
    }
  }

  function renderTabbedGrid() {
    if (!els.grid) return;
    const cat = categories.find((c) => c.slug === activeSlug);
    if (!cat) {
      els.grid.innerHTML = `<p class="muted">Nothing for sale right now.</p>`;
      return;
    }
    // Long panel descriptions start folded so the packages stay near the top.
    const intro = cat.description ? `
      <div class="category-intro surface folded">
        <div class="category-intro__text">${cat.description}</div>
        <button class="intro-toggle" type="button" data-intro-toggle>Show everything included</button>
      </div>` : "";
    els.grid.innerHTML = intro + sortByOrder(cat.packages).map(cardHtml).join("");
    const introEl = els.grid.querySelector(".category-intro");
    if (introEl && introEl.querySelector(".category-intro__text").scrollHeight < 200) {
      introEl.classList.remove("folded");
      introEl.querySelector(".intro-toggle").hidden = true;
    }
  }

  // Everything that shows "In basket" state re-renders together.
  function renderGrid() {
    renderTabbedGrid();
    renderStorePages();
  }

  // ---- network pages ----

  // The store page for a Tebex category: dedicated pages for the known ones, else the
  // all-packages page on that tab.
  function catHref(slug) {
    const pages = {
      [CATS.plus]: "plus",
      [CATS.ranks]: "ranks",
      [CATS.credits]: "credits"
    };
    return pages[slug] || "shop#" + slug;
  }

  const catBySlug = (slug) => categories.find((c) => c.slug === slug);
  const pkgsFor = (slug) => { const c = catBySlug(slug); return c ? sortByOrder(c.packages) : []; };
  // Pairs a data.js tier or rank with its Tebex package by name (whole word, so "Charged"
  // doesn't match "Overcharged"), falling back to position. The panel's drag order can
  // differ from the ladder order.
  const pkgNamed = (pkgs, name, i) => {
    const rx = new RegExp("\\b" + String(name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
    return (name && pkgs.find((p) => rx.test(p.name || ""))) || pkgs[i];
  };

  function addButton(p, label, extraClass) {
    if (!p) return `<button class="btn btn--block btn--ghost" type="button" disabled>Coming soon</button>`;
    const owned = inBasket(p.id);
    return `<button class="btn btn--block add${owned ? " in-basket" : ""}${extraClass ? " " + extraClass : ""}" type="button" data-add="${p.id}">` +
      `${owned ? "In basket ✓" : esc(label || "Add to basket")}</button>`;
  }

  const icon = (name, size) => `<svg width="${size || 20}" height="${size || 20}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

  function renderPackageSections() {
    document.querySelectorAll("[data-packages]").forEach((el) => {
      const slug = CATS[el.dataset.packages] || el.dataset.packages;
      const pkgs = pkgsFor(slug);
      el.innerHTML = pkgs.map(cardHtml).join("") ||
        `<p class="muted">These packages aren't in the store yet. Check back soon.</p>`;
    });
  }

  function renderPlus() {
    document.querySelectorAll("[data-plus]").forEach((el) => {
      const pkgs = pkgsFor(CATS.plus);
      el.innerHTML = NET.plus.map((tier, i) => {
        const p = pkgNamed(pkgs, tier.name, i);
        return `
          <article class="ptier ptier--${i + 1}${tier.featured ? " ptier--featured" : ""} surface">
            ${tier.featured ? `<span class="ptier__flag">Recommended</span>` : ""}
            <div class="ptier__mark">${ART.plus || ""}<h3>${esc(tier.name)}<small>${esc(tier.tagline)}</small></h3></div>
            ${p ? priceHtml(p) : `<div class="price"><b>—</b></div>`}
            <ul>${tier.items.map(([ic, text]) => `<li>${icon(ic)}<span>${text}</span></li>`).join("")}</ul>
            ${addButton(p, "Subscribe")}
          </article>`;
      }).join("");
    });
  }

  function perkCell(value) {
    if (value === true) return `<td class="yes">${icon("check", 20)}<span class="sr-only">Yes</span></td>`;
    if (value === false || value === "" || value == null) return `<td class="no">—</td>`;
    return `<td>${esc(value)}</td>`;
  }

  // Ranks are network-wide: one ladder, one purchase. The table shows the network perks
  // plus the perks for one server at a time, picked with the server tabs (#survival etc.).
  let rankServer = null;

  function renderRanks() {
    document.querySelectorAll("[data-ranks]").forEach((el) => {
      const def = NET.ranks || {};
      const ladder = def.ladder || [];
      const perks = def.perks || {};
      const servers = NET.servers.filter((s) => perks[s.id]);
      if (!ladder.length || !servers.length) return;
      if (!rankServer || !servers.some((s) => s.id === rankServer)) {
        const fromHash = location.hash.slice(1);
        rankServer = servers.some((s) => s.id === fromHash) ? fromHash
          : (servers.find((s) => s.status === "live") || servers[0]).id;
      }
      const server = servers.find((s) => s.id === rankServer);
      const pkgs = pkgsFor(CATS.ranks);
      const cols = ladder.length;

      const tabs = servers.map((s) => `
        <button type="button" role="tab" data-rank-server="${esc(s.id)}" aria-selected="${s.id === rankServer}"
          style="--accent: var(--${esc(s.id)})">OCG ${esc(s.name)}${s.status !== "live" ? ` <span class="pill">Soon</span>` : ""}</button>`).join("");

      const head = ladder.map((r, i) => {
        const p = pkgNamed(pkgs, r.name, i);
        return `<th scope="col" style="--rank:${esc(r.color)}">
          <div class="rank-head">
            <span class="rank-head__tag">[${esc(r.name)}]</span>
            ${p ? priceHtml(p) : `<div class="price"><b>—</b></div>`}
            ${addButton(p, "Buy", "btn--sm")}
          </div></th>`;
      }).join("");

      const groupRows = (groups, prefix) => (groups || []).map((g) =>
        `<tr class="group"><th colspan="${cols + 1}" scope="colgroup">${esc(prefix ? prefix + " · " + g.title : g.title)}</th></tr>` +
        g.perks.map(([perk, values]) =>
          `<tr><th scope="row">${esc(perk)}</th>${values.map(perkCell).join("")}</tr>`).join("")
      ).join("");

      const soonNote = server.status !== "live"
        ? `<tr class="note"><td colspan="${cols + 1}">OCG ${esc(server.name)} isn't open yet. A rank you buy now gets these perks there from launch.</td></tr>`
        : "";

      el.innerHTML = `
        <div class="rank-tabs" role="tablist" aria-label="Show perks for">${tabs}</div>
        <div class="ranks-scroll" style="--accent: var(--${esc(server.id)})">
          <table class="ranks">
            <thead><tr><th scope="col"><span class="label">Network rank</span></th>${head}</tr></thead>
            <tbody>
              ${groupRows(perks.network, "")}
              ${soonNote}
              ${groupRows(perks[server.id], "OCG " + server.name)}
            </tbody>
          </table>
        </div>`;
    });
  }

  document.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-rank-server]");
    if (!tab) return;
    rankServer = tab.dataset.rankServer;
    history.replaceState(null, "", "#" + rankServer);
    renderRanks();
  });

  function renderCreditUses() {
    document.querySelectorAll("[data-credit-uses]").forEach((el) => {
      el.innerHTML = NET.servers.map((s) => `
        <div class="panel surface" style="--accent: var(--${esc(s.id)})">
          <p class="label">OCG ${esc(s.name)}${s.status !== "live" ? " · coming soon" : ""}</p>
          <h3>Spend Credits on</h3>
          <ul>${(NET.creditUses[s.id] || []).map((u) => `<li>${esc(u)}</li>`).join("")}</ul>
        </div>`).join("");
    });
  }

  // Home sidebar: current sales if there are any, otherwise the OCG+ tiers.
  function renderSpotlight() {
    const el = document.querySelector("[data-spotlight]");
    if (!el) return;
    const deals = [];
    categories.forEach((c) => sortByOrder(c.packages).forEach((p) => {
      if (p.discount > 0) deals.push({ p, slug: c.slug });
    }));
    if (deals.length) {
      const best = Math.max(...deals.map((d) => savePercent(d.p)));
      el.innerHTML = `
        <p class="label" style="color:var(--sale)">Sale on now</p>
        <h3>Up to ${best}% off</h3>
        <ul class="spot-list">${deals.slice(0, 4).map((d) => {
          const n = splitName(d.p.name);
          return `<li><a href="${esc(catHref(d.slug))}">${esc(n.title)}${n.variant ? " · " + esc(n.variant) : ""}</a>
            <span><s>${money(d.p.total_price + d.p.discount, d.p.currency)}</s> ${money(d.p.total_price, d.p.currency)}</span></li>`;
        }).join("")}</ul>
        <a class="btn btn--block btn--sm" href="store">Shop the sale</a>`;
      return;
    }
    const tiers = pkgsFor(CATS.plus);
    const from = tiers.length ? Math.min(...tiers.map((p) => p.total_price)) : 0;
    el.innerHTML = `
      <p class="label">OCG+</p>
      <h3>Loot every month</h3>
      <p>Crate keys, Credits and a new cosmetic every month, on every server.</p>
      ${from ? `<p class="spot-from">From <b>${money(from, tiers[0].currency)}</b> / month</p>` : ""}
      <a class="btn btn--block btn--sm" href="plus">See the tiers</a>`;
  }

  function renderStorePages() {
    renderPackageSections();
    renderPlus();
    renderRanks();
  }

  // Server cards from data.js, linking to each server's page. data-servers="list" renders
  // compact rows for the home page sidebar instead of full cards.
  function renderServers() {
    document.querySelectorAll('[data-servers="list"]').forEach((el) => {
      el.innerHTML = NET.servers.map((s) => {
        const soon = s.status !== "live";
        return `
          <div class="srv-row" style="--accent: var(--${esc(s.id)})">
            <a class="srv-row__name" href="${esc(s.page)}">OCG <span>${esc(s.name)}</span></a>
            ${soon
              ? `<span class="pill">Coming soon</span>`
              : `<span class="online" data-status="${esc(s.ip)}"><span class="dot"></span><span>Checking…</span></span>
                 <button type="button" class="copy-btn srv-row__ip" data-copy="${esc(s.ip)}" title="Copy IP">${esc(s.ip)}</button>`}
          </div>`;
      }).join("");
    });
    document.querySelectorAll('[data-servers]:not([data-servers="list"])').forEach((el) => {
      el.innerHTML = NET.servers.map((s) => {
        const href = s.page;
        const soon = s.status !== "live";
        return `
          <a class="server server--${esc(s.id)} surface" href="${esc(href)}">
            <div class="server__art">${ART[s.id] || ""}</div>
            <div class="server__body">
              <h3>OCG <span>${esc(s.name)}</span></h3>
              <p>${esc(s.blurb)}</p>
              <ul class="server__tags">${s.tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
              <div class="server__meta">
                ${soon
                  ? `<span class="pill">Coming soon</span>`
                  : `<span class="online" data-status="${esc(s.ip)}"><span class="dot"></span><span>Checking…</span></span>
                     <span class="server__ip">${esc(s.ip)}</span>`}
                <span class="server__go">${soon ? "Find out more" : "Play"} →</span>
              </div>
            </div>
          </a>`;
      }).join("");
    });
  }

  function selectCategory(slug) {
    if (!els.grid) return;
    activeSlug = slug;
    renderTabs();
    renderGrid();
    if (location.hash.slice(1) !== slug) history.replaceState(null, "", "#" + slug);
  }

  function showDetails(pkgId) {
    const p = packages.get(String(pkgId));
    if (!p) return;
    const owned = inBasket(p.id);
    const name = splitName(p.name);
    const desc = p.description || (demo
      ? "<p>Demo listing. The live store shows the description written in the Tebex panel.</p>"
      : "");
    els.pkgDetail.innerHTML = `
      <div class="pkg-detail__art">${p.image ? `<img src="${esc(p.image)}" alt="">` : ""}</div>
      <div class="pkg-detail__body">
        ${name.variant ? `<p class="card__variant">${esc(name.variant)}</p>` : ""}
        <h2>${esc(name.title)}</h2>
        ${priceHtml(p)}
        <div class="desc">${desc}</div>
        <div class="pkg-detail__actions">
          <button class="btn" type="button" data-add="${p.id}">${owned ? "In basket ✓" : "Add to basket"}</button>
          <button class="btn btn--ghost" type="button" data-close-modal>Close</button>
        </div>
        ${giftable(p) ? `
        <form class="gift" data-gift="${p.id}">
          <label for="gift-name">Gift it to another player</label>
          <div class="gift__row">
            <input id="gift-name" name="gift" required minlength="3" maxlength="16" pattern="[A-Za-z0-9_]{3,16}" autocomplete="off" spellcheck="false" placeholder="Their username">
            <button type="submit">Add gift</button>
          </div>
        </form>` : ""}
      </div>`;
    els.pkgModal.showModal();
  }

  // Tebex gifts one-off packages only; subscriptions renew on the buyer's card.
  function giftable(p) {
    return !p.disable_gifting && p.type !== "subscription";
  }

  // ---- player ----

  function renderPlayer() {
    if (username) {
      els.chipName.textContent = username;
      els.chipHead.src = "https://mc-heads.net/avatar/" + encodeURIComponent(username) + "/48";
      els.chipHead.hidden = false;
    } else {
      els.chipName.textContent = "Set username";
      els.chipHead.hidden = true;
    }
  }

  // Resolves to the entered name, or null when the player cancels.
  function askUsername() {
    return new Promise((resolve) => {
      els.userInput.value = username || "";
      const done = (value) => {
        els.userModal.removeEventListener("close", onClose);
        resolve(value);
      };
      const onClose = () => {
        const value = els.userModal.returnValue === "ok" ? els.userInput.value.trim() : null;
        done(value || null);
      };
      els.userModal.returnValue = "";
      els.userModal.addEventListener("close", onClose);
      els.userModal.showModal();
      els.userInput.focus();
    });
  }

  async function changeUsername() {
    const name = await askUsername();
    if (!name || name === username) return;
    const hadItems = basket && basket.packages && basket.packages.length;
    username = name;
    saved.set("ocg.username", name);
    // A Tebex basket belongs to one username, so a new name means a new basket.
    if (!demo && basket) {
      dropBasket();
      if (hadItems) toast("Username changed, so your basket was emptied.");
    } else if (basket) {
      basket.username = name;
    }
    renderPlayer();
    renderBasket();
  }

  // ---- basket ----

  function dropBasket() {
    basket = null;
    saved.set("ocg.basket", null);
  }

  function setBasket(data) {
    basket = data;
    if (demo) saved.set("ocg.demo-basket", JSON.stringify(basket));
    else saved.set("ocg.basket", basket ? basket.ident : null);
    renderBasket();
    renderGrid();
  }

  async function restoreBasket() {
    if (demo) {
      try { basket = JSON.parse(saved.get("ocg.demo-basket") || "null"); } catch (e) { basket = null; }
      return;
    }
    const ident = saved.get("ocg.basket");
    if (!ident) return;
    try {
      const json = await api(account("/baskets/" + encodeURIComponent(ident)));
      basket = json.data && !json.data.complete ? json.data : null;
    } catch (e) {
      basket = null;
    }
    if (!basket) saved.set("ocg.basket", null);
  }

  async function ensureBasket() {
    if (!username) {
      const name = await askUsername();
      if (!name) return null;
      username = name;
      saved.set("ocg.username", name);
      renderPlayer();
    }
    if (basket) return basket;
    if (demo) {
      basket = { ident: "demo", username, packages: [], total_price: 0, currency: "USD" };
      return basket;
    }
    const json = await api(account("/baskets"), {
      method: "POST",
      body: {
        username,
        complete_url: pageUrl() + "?paid=1",
        cancel_url: pageUrl(),
        complete_auto_redirect: true
      }
    });
    setBasket(json.data);
    return basket;
  }

  // giftTo: another player's username; the buyer still pays from their own basket.
  async function addPackage(pkgId, giftTo) {
    if (!giftTo && inBasket(pkgId)) { openBasket(); return; }
    const p = packages.get(String(pkgId));
    if (!p || busy) return;
    busy = true;
    try {
      const b = await ensureBasket();
      if (!b) return;
      if (demo) {
        b.packages.push({ id: p.id, name: p.name, image: p.image,
          in_basket: { quantity: 1, price: p.total_price, gift_username: giftTo || null } });
        b.total_price = b.packages.reduce((sum, x) => sum + x.in_basket.price * x.in_basket.quantity, 0);
        setBasket(b);
      } else {
        const body = { package_id: String(p.ident || p.id), quantity: 1 };
        if (giftTo) body.target_username = giftTo;
        const json = await api("/baskets/" + encodeURIComponent(b.ident) + "/packages", {
          method: "POST",
          body
        });
        setBasket(json.data);
      }
      if (els.pkgModal.open) els.pkgModal.close();
      toast(giftTo ? p.name + " for " + giftTo + " added to your basket." : p.name + " added to your basket.");
    } catch (e) {
      await handleError(e);
    } finally {
      busy = false;
    }
  }

  async function removePackage(pkgId) {
    if (!basket || busy) return;
    busy = true;
    try {
      if (demo) {
        basket.packages = basket.packages.filter((x) => String(x.id) !== String(pkgId));
        basket.total_price = basket.packages.reduce((sum, x) => sum + x.in_basket.price * x.in_basket.quantity, 0);
        setBasket(basket);
      } else {
        const known = packages.get(String(pkgId));
        const json = await api("/baskets/" + encodeURIComponent(basket.ident) + "/packages/remove", {
          method: "POST",
          body: { package_id: String((known && known.ident) || pkgId) }
        });
        setBasket(json.data);
      }
    } catch (e) {
      await handleError(e);
    } finally {
      busy = false;
    }
  }

  async function applyCoupon(code) {
    if (!code) return;
    if (demo) { toast("Coupons work in the live store only."); return; }
    try {
      const b = await ensureBasket();
      if (!b) return;
      await api(account("/baskets/" + encodeURIComponent(b.ident) + "/coupons"), {
        method: "POST",
        body: { coupon_code: code }
      });
      const json = await api(account("/baskets/" + encodeURIComponent(b.ident)));
      setBasket(json.data);
      els.couponCode.value = "";
      toast("Coupon applied.");
    } catch (e) {
      await handleError(e);
    }
  }

  // Some stores make the player sign in before checkout. Tebex returns the sign-in
  // options; the player comes back here with the basket authorised.
  async function authorize() {
    const returnUrl = encodeURIComponent(pageUrl() + "?basket=1");
    const json = await api(account("/baskets/" + encodeURIComponent(basket.ident) + "/auth?returnUrl=" + returnUrl));
    const options = Array.isArray(json) ? json : (json && json.data) || [];
    if (options.length && options[0].url) {
      location.href = options[0].url;
      return true;
    }
    return false;
  }

  async function handleError(e) {
    console.error(e);
    const text = String(e && e.message || e);
    if (basket && !demo && (e.status === 401 || e.status === 403 || /auth|log ?in|sign ?in/i.test(text))) {
      try {
        if (await authorize()) return;
      } catch (authError) {
        console.error(authError);
      }
    }
    if (e && e.status === 404 && /basket/i.test(text)) {
      dropBasket();
      renderBasket();
      renderGrid();
      toast("Your basket expired. Please add the items again.", true);
      return;
    }
    toast(text, true);
  }

  function renderBasket() {
    const items = (basket && basket.packages) || [];
    const count = items.reduce((sum, x) => sum + ((x.in_basket && x.in_basket.quantity) || 1), 0);
    if (els.count.textContent !== String(count)) {
      els.count.textContent = String(count);
      els.count.classList.remove("bump");
      void els.count.offsetWidth;
      els.count.classList.add("bump");
    }
    els.forWho.textContent = username ? "Delivered to " + username : "No username set yet";
    if (!items.length) {
      els.lines.innerHTML = `<li class="empty"><img src="assets/logo.png" alt="">Your basket is empty.<a href="store">Browse the store</a></li>`;
    } else {
      els.lines.innerHTML = items.map((x) => {
        const known = packages.get(String(x.id));
        const image = x.image || (known && known.image) || "";
        const qty = (x.in_basket && x.in_basket.quantity) || 1;
        const price = x.in_basket ? x.in_basket.price : (known ? known.total_price : 0);
        const giftFor = x.in_basket && x.in_basket.gift_username;
        return `
          <li class="line">
            ${image ? `<img src="${esc(image)}" alt="">` : "<span></span>"}
            <div>
              <div class="line__name">${esc(x.name)}</div>
              <div class="line__meta">${qty > 1 ? qty + " × " : ""}${money(price, basket.currency)}${giftFor ? ` · gift for ${esc(giftFor)}` : ""}</div>
            </div>
            <button class="line__remove" type="button" data-remove="${x.id}">Remove</button>
          </li>`;
      }).join("");
    }
    els.total.textContent = money((basket && basket.total_price) || 0, basket && basket.currency);
    els.checkout.disabled = !items.length;
  }

  function openBasket() {
    els.drawer.classList.add("open");
    els.drawer.setAttribute("aria-hidden", "false");
    els.scrim.hidden = false;
  }

  function closeBasket() {
    els.drawer.classList.remove("open");
    els.drawer.setAttribute("aria-hidden", "true");
    els.scrim.hidden = true;
  }

  function checkout() {
    if (!basket || !basket.packages || !basket.packages.length) return;
    if (demo) {
      toast("Demo mode: add the public token to config.js to take real payments.");
      return;
    }
    const fallback = basket.links && basket.links.checkout;
    if (window.Tebex && Tebex.checkout) {
      try {
        Tebex.checkout.init({
          ident: basket.ident,
          theme: cfg.checkoutTheme || "dark",
          colors: cfg.checkoutColors || [],
          closeOnPaymentComplete: true
        });
        closeBasket();
        Tebex.checkout.launch();
        return;
      } catch (e) {
        console.error(e);
      }
    }
    if (fallback) location.href = fallback;
    else toast("Checkout isn't available right now. Please try again.", true);
  }

  function paymentComplete() {
    dropBasket();
    closeBasket();
    renderBasket();
    renderGrid();
    toast("Thanks for supporting OCG Network! Your items arrive in game shortly.");
  }

  // ---- wiring ----

  document.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-intro-toggle]");
    if (toggle) {
      const box = toggle.closest(".category-intro");
      const folded = box.classList.toggle("folded");
      toggle.textContent = folded ? "Show everything included" : "Show less";
      return;
    }
    const target = event.target.closest("[data-add],[data-remove],[data-details],[data-slug],[data-close-modal]");
    if (!target) return;
    if (target.dataset.add) addPackage(target.dataset.add);
    else if (target.dataset.remove) removePackage(target.dataset.remove);
    else if (target.dataset.details) showDetails(target.dataset.details);
    else if (target.dataset.slug) selectCategory(target.dataset.slug);
    else if (target.hasAttribute("data-close-modal")) target.closest("dialog").close();
  });

  $("basket-open").addEventListener("click", openBasket);
  $("basket-close").addEventListener("click", closeBasket);
  els.scrim.addEventListener("click", closeBasket);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeBasket(); });
  $("player-chip").addEventListener("click", changeUsername);
  els.checkout.addEventListener("click", checkout);
  els.coupon.addEventListener("submit", (e) => {
    e.preventDefault();
    applyCoupon(els.couponCode.value.trim());
  });
  els.userForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!els.userInput.checkValidity()) { els.userInput.reportValidity(); return; }
    els.userModal.close("ok");
  });
  $("user-cancel").addEventListener("click", () => els.userModal.close("cancel"));
  document.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-gift]");
    if (!form) return;
    e.preventDefault();
    const name = form.elements.gift.value.trim();
    if (username && name.toLowerCase() === username.toLowerCase()) {
      toast("That's you. Use Add to basket instead.", true);
      return;
    }
    addPackage(form.dataset.gift, name);
  });
  els.pkgModal.addEventListener("click", (e) => { if (e.target === els.pkgModal) els.pkgModal.close(); });
  window.addEventListener("hashchange", () => {
    const slug = location.hash.slice(1);
    if (slug && slug !== activeSlug && categories.some((c) => c.slug === slug)) selectCategory(slug);
  });

  // Any [data-copy] button copies its value (server IPs). Empty data-copy uses the network IP.
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    const label = btn.dataset.label || btn.textContent;
    btn.dataset.label = label;
    try {
      await navigator.clipboard.writeText(btn.dataset.copy || cfg.networkIp || "");
      btn.textContent = "Copied!";
    } catch (err) {
      btn.textContent = "Copy failed";
    }
    setTimeout(() => { btn.textContent = label; }, 1600);
  });
  document.querySelectorAll("[data-ip]").forEach((el) => {
    el.textContent = el.dataset.ip || cfg.networkIp || "";
  });

  // Tebex.js loads with defer; hook its events once it's there.
  window.addEventListener("load", () => {
    if (window.Tebex && Tebex.checkout && Tebex.checkout.on) {
      Tebex.checkout.on("payment:complete", paymentComplete);
    }
  });

  // Live player counts from the public mcsrvstat.us API, one request per address.
  // Elements: [data-status="ip"] holding a .dot and a text span; hidden if unreachable.
  // [data-status-total] shows the sum across every live server.
  async function loadStatus() {
    const els2 = Array.from(document.querySelectorAll("[data-status]"));
    const totalEl = document.querySelector("[data-status-total]");
    const ips = new Set(els2.map((el) => el.dataset.status).filter(Boolean));
    if (totalEl) NET.servers.forEach((s) => { if (s.status === "live" && s.ip) ips.add(s.ip); });
    const results = {};
    await Promise.all(Array.from(ips).map(async (ip) => {
      try {
        const res = await fetch("https://api.mcsrvstat.us/3/" + encodeURIComponent(ip));
        results[ip] = await res.json();
      } catch (e) {
        results[ip] = null;
      }
    }));
    els2.forEach((el) => {
      const json = results[el.dataset.status];
      const dot = el.querySelector(".dot");
      const text = el.querySelector("span:last-child");
      if (!json) { el.hidden = true; return; }
      if (json.online && json.players) {
        dot.classList.add("on");
        text.textContent = json.players.online + " playing now";
      } else {
        text.textContent = "Offline";
      }
    });
    if (totalEl) {
      const online = Object.values(results).filter((j) => j && j.online && j.players);
      if (!online.length) { totalEl.hidden = true; return; }
      const total = online.reduce((sum, j) => sum + j.players.online, 0);
      totalEl.querySelector(".dot").classList.add("on");
      totalEl.querySelector("span:last-child").textContent = total + " playing across the network";
    }
  }

  // Fade sections in as they scroll into view. Elements stay visible if this never runs.
  function reveal() {
    const items = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    }), { rootMargin: "0px 0px -8% 0px" });
    items.forEach((el) => { el.classList.add("reveal"); io.observe(el); });
  }

  // Seasonal blocks carry data-until="YYYY-MM-DD" and disappear after that day (UTC).
  function expireOffers() {
    const today = new Date().toISOString().slice(0, 10);
    document.querySelectorAll("[data-until]").forEach((el) => {
      if (el.dataset.until && today > el.dataset.until) el.hidden = true;
    });
  }

  // Recent supporters row (store hub). purchases/recent.json is written by
  // scripts/sync-purchases.mjs; demo mode shows example names. Hidden when there's nobody.
  async function renderRecent() {
    const list = $("recent-buyers");
    if (!list) return;
    try {
      const res = await fetch(demo ? "assets/demo-recent.json" : "purchases/recent.json", { cache: "no-cache" });
      if (!res.ok) return;
      const buyers = (await res.json()).filter((b) => b && b.name).slice(0, 8);
      if (!buyers.length) return;
      list.innerHTML = buyers.map((b) => `
        <li class="recent__item surface">
          <img src="https://mc-heads.net/avatar/${encodeURIComponent(b.uuid || b.name)}/64" alt="" width="56" height="56" loading="lazy"
            onerror="this.onerror=null;this.src='https://mc-heads.net/avatar/MHF_Steve/64'">
          <span>${esc(b.name)}</span>
        </li>`).join("");
      $("recent-section").hidden = false;
    } catch (e) { /* the row is optional */ }
  }

  async function start() {
    renderPlayer();
    renderServers();
    renderCreditUses();
    renderRecent();
    expireOffers();
    reveal();
    loadStatus();
    if (params.has("paid")) {
      dropBasket();
      history.replaceState(null, "", pageUrl() + location.hash);
      toast("Thanks for supporting OCG Network! Your items arrive in game shortly.");
    }
    try {
      const [data] = await Promise.all([loadCatalogue(), restoreBasket()]);
      categories = (data || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
      categories.forEach((c) => {
        if (!c.slug) c.slug = String(c.id);
        (c.packages || []).forEach((p) => packages.set(String(p.id), p));
      });
      const fromHash = location.hash.slice(1);
      selectCategory(categories.some((c) => c.slug === fromHash) ? fromHash : (categories[0] && categories[0].slug));
      renderStorePages();
      renderHome();
      renderSpotlight();
      renderBasket();
      if (params.has("basket")) {
        history.replaceState(null, "", pageUrl() + location.hash);
        openBasket();
      }
    } catch (e) {
      console.error(e);
      const target = els.grid || els.homeCats || document.querySelector("[data-plus],[data-ranks],[data-packages]");
      if (target) target.innerHTML = `<p class="muted">The store couldn't load. Please refresh, or try again in a minute.</p>`;
    }
  }

  start();
})();
