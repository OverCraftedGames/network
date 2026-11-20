// Shared page chrome: header, store bar, footer, basket drawer, dialogs, toast and the icon
// sprite. Runs before store.js (both deferred, in order) so every page gets the same layout.
// A page sets data-page (its nav key) and data-area="store" for pages in the store area.
(() => {
  "use strict";

  const cfg = window.STORE_CONFIG || {};
  const body = document.body;
  const page = body.dataset.page || "";
  const inStore = body.dataset.area === "store";
  const discord = cfg.discord || "https://discord.gg/carboncraft";

  const link = ([key, href, label, cls]) => {
    const current = key && key === page ? ' aria-current="page"' : "";
    const ext = /^https?:/.test(href) ? " ext" : "";
    const classes = ((cls || "") + ext).trim();
    return `<a href="${href}"${classes ? ` class="${classes}"` : ""}${current}>${label}</a>`;
  };

  const play = [
    ["home", "index.html", "Home"],
    ["survival", "survival.html", "Survival"],
    ["skyblock", "skyblock.html", "Skyblock"],
    ["wikis", "wikis.html", "Wikis"]
  ];
  const storeLink = ["", "store.html", "Store", "nav-store"];
  const storeNav = [
    ["store", "store.html", "Store home"],
    ["plus", "plus.html", "OCG+"],
    ["ranks", "ranks.html", "Ranks"],
    ["credits", "credits.html", "Credits"],
    ["shop", "shop.html", "All packages"],
    ["rewards", "rewards.html", "Rewards"],
    ["support", "support.html", "Support"]
  ];

  const storeTop = `<a href="store.html" class="nav-store"${inStore ? ' aria-current="page"' : ""}>Store</a>`;
  const navHtml = play.map(link).join("") + `<span class="topnav__sep" aria-hidden="true"></span>` +
    storeTop + link(["", discord, "Discord"]);
  const mobileHtml = play.map(link).join("") + storeTop + link(["", discord, "Discord"]);

  const header = document.getElementById("site-header");
  header.className = "topbar";
  header.innerHTML = `
    <div class="wrap topbar__inner">
      <a class="brand" href="index.html">
        <img src="assets/logo.png" alt="" width="38" height="38">
        <span>OCG <b>Network</b></span>
      </a>
      <nav class="topnav" aria-label="Site">${navHtml}</nav>
      <div class="topbar__actions">
        <button class="chip" id="player-chip" type="button">
          <img id="player-head" src="" alt="" width="24" height="24" hidden>
          <span id="player-name">Set username</span>
        </button>
        <button class="basket-btn" id="basket-open" type="button" aria-label="Open basket">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM5.2 4l.9 2H21l-3.6 7.3a2 2 0 0 1-1.8 1.1H8.1L7 16.5h12v2H7a2 2 0 0 1-1.7-3l1.4-2.6L3.1 4H1V2h3.3l.9 2Z"/></svg>
          <span class="basket-btn__count" id="basket-count">0</span>
        </button>
      </div>
    </div>
    <nav class="mobilenav" aria-label="Site">${mobileHtml}</nav>
    ${inStore ? `
    <div class="storebar">
      <nav class="wrap storebar__inner" aria-label="Store">
        <span class="storebar__title">Store</span>${storeNav.map(link).join("")}
      </nav>
    </div>` : ""}`;

  header.insertAdjacentHTML("afterend", `
    <div class="demo-banner" id="demo-banner" hidden>
      Preview: prices and packages come from a saved example catalogue, and checkout is turned off.
    </div>`);

  const footer = document.getElementById("site-footer");
  footer.className = "footer";
  footer.innerHTML = `
    <div class="wrap footer__inner">
      <div class="footer__cols">
        <div>
          <a class="brand" href="index.html">
            <img src="assets/logo.png" alt="" width="34" height="34">
            <span>OCG <b>Network</b></span>
          </a>
          <p>The Minecraft servers of OverCrafted Games. Store purchases are processed by Tebex,
            the merchant of record, which handles payment, receipts and subscriptions.</p>
        </div>
        <div>
          <h3>Play</h3>
          <a href="survival.html">Survival</a>
          <a href="skyblock.html">Skyblock</a>
          <a href="wikis.html">Wikis</a>
          <a href="${discord}">Discord</a>
        </div>
        <div>
          <h3>Store</h3>
          <a href="plus.html">OCG+</a>
          <a href="ranks.html">Ranks</a>
          <a href="credits.html">Credits</a>
          <a href="https://checkout.tebex.io/payment-history/login">Manage subscriptions</a>
        </div>
        <div>
          <h3>Help</h3>
          <a href="support.html">Support</a>
          <a href="https://www.tebex.io/support-customer">Tebex customer support</a>
          <a href="mailto:${cfg.email || "contact@ocgames.xyz"}">Email us</a>
        </div>
        <div>
          <h3>Legal</h3>
          <a href="terms.html">Terms &amp; Conditions</a>
          <a href="purchase-agreement.html">Purchase Agreement</a>
          <a href="https://checkout.tebex.io/privacy">Privacy Policy</a>
          <a href="https://checkout.tebex.io/impressum">Impressum</a>
        </div>
      </div>
      <p class="footer__legal">&copy; ${new Date().getFullYear()} OCG Network, run by
        <a href="${cfg.studio || "https://ocgames.xyz"}">OverCrafted Games</a>.
        Not affiliated with Mojang AB or Microsoft.</p>
    </div>`;

  body.insertAdjacentHTML("afterbegin", `
    <svg width="0" height="0" style="position:absolute" aria-hidden="true">
      <symbol id="i-key" viewBox="0 0 24 24"><path fill="currentColor" d="M7 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm5.65-4A6 6 0 1 0 12.65 14H17v4h4v-4h2v-4H12.65Z"/></symbol>
      <symbol id="i-coin" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2 22 12 12 22 2 12 12 2Zm0 4.2L6.2 12 12 17.8 17.8 12 12 6.2Zm0 2.6L15.2 12 12 15.2 8.8 12 12 8.8Z"/></symbol>
      <symbol id="i-gem" viewBox="0 0 24 24"><path fill="currentColor" d="M6 3h12l4 6-10 12L2 9l4-6Zm1.1 2L4.7 8.6h4.2L10.4 5H7.1Zm6.5 0 1.5 3.6h4.2L16.9 5h-3.3Zm-1.6.4L10.6 8.6h2.8L12 5.4ZM5.3 10.6l5.5 6.6-2-6.6H5.3Zm5.6 0L12 15.9l1.1-5.3h-2.2Zm4.2 0-2 6.6 5.5-6.6h-3.5Z"/></symbol>
      <symbol id="i-gift" viewBox="0 0 24 24"><path fill="currentColor" d="M20 7h-2.18A3 3 0 0 0 12 3.76 3 3 0 0 0 6.18 7H4a2 2 0 0 0-2 2v2a1 1 0 0 0 1 1h8V7h2v5h8a1 1 0 0 0 1-1V9a2 2 0 0 0-2-2ZM9 7a1 1 0 1 1 1-1v1Zm6 0h-1V6a1 1 0 1 1 1 1ZM4 14v6a2 2 0 0 0 2 2h5v-8Zm9 8h5a2 2 0 0 0 2-2v-6h-7Z"/></symbol>
      <symbol id="i-plush" viewBox="0 0 24 24"><path fill="currentColor" d="M12 21.35 10.55 20C5.4 15.36 2 12.27 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.53L12 21.35Z"/></symbol>
      <symbol id="i-discord" viewBox="0 0 24 24"><path fill="currentColor" d="M19.3 5.3A16.6 16.6 0 0 0 15.2 4l-.5 1a15 15 0 0 0-5.4 0l-.5-1a16.6 16.6 0 0 0-4.1 1.3C2.1 9.2 1.4 13 1.7 16.7a16.7 16.7 0 0 0 5 2.5l1.1-1.7c-.6-.2-1.2-.5-1.7-.9l.4-.3a11.9 11.9 0 0 0 11 0l.4.3c-.5.4-1.1.7-1.7.9l1.1 1.7a16.6 16.6 0 0 0 5-2.5c.4-4.3-.7-8-3-11.4ZM8.5 14.5c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm7 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z"/></symbol>
      <symbol id="i-book" viewBox="0 0 24 24"><path fill="currentColor" d="M18 2H7a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h13V4a2 2 0 0 0-2-2Zm0 18H7a1 1 0 0 1 0-2h11v2Zm0-4H7c-.35 0-.69.06-1 .17V5a1 1 0 0 1 1-1h11v12Z"/></symbol>
      <symbol id="i-vote" viewBox="0 0 24 24"><path fill="currentColor" d="M18 13h-.68l-2 2h1.91L19 17H5l1.78-2h2.05l-2-2H6l-3 3v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4l-3-3Zm-1-5.05-4.95 4.95-3.54-3.54 4.95-4.95L17 7.95Zm-4.24-5.66L6.39 8.66a1 1 0 0 0 0 1.41l4.95 4.95a1 1 0 0 0 1.41 0l6.36-6.36a1 1 0 0 0 0-1.41L14.16 2.3a1 1 0 0 0-1.4-.01Z"/></symbol>
      <symbol id="i-rules" viewBox="0 0 24 24"><path fill="currentColor" d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4Zm-2 16-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8Z"/></symbol>
      <symbol id="i-play" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2 22 12 12 22 2 12 12 2Zm-2 6v8l6-4-6-4Z"/></symbol>
      <symbol id="i-crown" viewBox="0 0 24 24"><path fill="currentColor" d="M5 16 3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5Zm14 3a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-1h14v1Z"/></symbol>
      <symbol id="i-check" viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z"/></symbol>
    </svg>`);

  body.insertAdjacentHTML("beforeend", `
    <div class="scrim" id="scrim" hidden></div>
    <aside class="drawer" id="basket" aria-label="Basket" aria-hidden="true">
      <div class="drawer__head">
        <h2>Basket</h2>
        <button class="icon-btn" id="basket-close" type="button" aria-label="Close basket">&times;</button>
      </div>
      <p class="drawer__for" id="basket-for"></p>
      <ul class="lines" id="basket-lines"></ul>
      <form class="coupon" id="coupon-form">
        <input id="coupon-code" name="coupon" placeholder="Coupon code" autocomplete="off">
        <button type="submit">Apply</button>
      </form>
      <div class="drawer__foot">
        <div class="total"><span>Total</span><b id="basket-total">$0.00</b></div>
        <button class="btn btn--block" id="checkout-btn" type="button" disabled>Checkout securely</button>
        <p class="muted small">Payment opens in a secure Tebex window. By checking out you
          agree to the <a href="terms.html">Terms</a> and
          <a href="purchase-agreement.html">Purchase Agreement</a>.</p>
      </div>
    </aside>

    <dialog class="modal" id="user-modal">
      <form method="dialog" id="user-form">
        <h2>Who's this for?</h2>
        <p class="muted">Enter your Minecraft username, exactly as it's spelled in game.
          Purchases are delivered to this player.</p>
        <input id="user-input" name="username" required minlength="3" maxlength="16" pattern="[A-Za-z0-9_]{3,16}" autocomplete="off" spellcheck="false" placeholder="Username">
        <div class="modal__actions">
          <button type="button" value="cancel" id="user-cancel" class="btn btn--ghost">Cancel</button>
          <button type="submit" class="btn">Continue</button>
        </div>
      </form>
    </dialog>

    <dialog class="modal modal--wide" id="pkg-modal">
      <div class="pkg-detail" id="pkg-detail"></div>
    </dialog>

    <div class="toast" id="toast" role="status" hidden></div>`);
})();
