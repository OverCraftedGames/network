// Tebex public token (not the secret key).
window.STORE_CONFIG = {
  publicToken: "glu6-7aeeb7f0b19ddc0401583c67f46156c077510d45",
  // demo mode, ?demo / ?live override it
  forceDemo: false,
  // category slugs
  categories: {
    plus: "ocg-plus",
    ranks: "ranks",
    credits: "credits"
  },
  // TODO: switch to the proxy IP
  networkIp: "play.ocgames.xyz",
  discord: "https://discord.gg/ocg",
  // discord invite + server id (widget has to be on)
  discordInvite: "ocg",
  discordGuildId: "816007504961601597",
  studio: "https://ocgames.xyz",
  email: "contact@ocgames.xyz",
  // sale banner: shows between starts and ends; ?sale previews it any time
  sale: {
    enabled: true,
    show: { topbar: true, home: true, store: true },
    name: "Black Friday Sale",
    headline: "Up to 30% off ranks, OCG+ and Credits",
    starts: "2026-11-26T23:00:00-06:00",
    ends: "2026-11-30T23:00:00-06:00",
    link: "shop",
    tiers: [
      { spend: "$19.99", off: 15, color: "#7ed957" },
      { spend: "$45", off: 20, color: "#7cc4ff" },
      { spend: "$90", off: 25, color: "#b69cff" },
      { spend: "$140", off: 30, color: "#ffd23f" }
    ],
    tiersNote: "Discounts apply automatically at checkout. No code needed.",
    keys: {
      title: "Free Mystery Keys",
      text: "Every <b>$10</b> you spend earns a <b>Black Friday Mystery Key</b>: a random <b>Carbon</b>, <b>Plasma</b>, <b>Fusion</b> or even <b>Iridium</b> crate key.",
      claim: "Claim them in game with <code class=\"cmd\">/storerewards</code> on Survival."
    },
    thanks: "Every purchase keeps the network running. Thank you for supporting us!"
  },
  checkoutTheme: "dark",
  checkoutColors: [
    { name: "primary", color: "#3afff5" },
    { name: "secondary", color: "#0a0f10" }
  ]
};
