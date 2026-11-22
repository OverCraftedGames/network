// Site settings. The public token is designed to be public (Tebex panel > Integrations >
// Headless API) and is safe to commit. Never put the secret key here.
window.STORE_CONFIG = {
  publicToken: "glu6-7aeeb7f0b19ddc0401583c67f46156c077510d45",
  // true runs the site from assets/demo-catalogue.json instead of the live Tebex catalogue.
  // ?demo forces demo mode and ?live forces live mode for testing.
  forceDemo: false,
  // Tebex category slugs for each store page. Rename here if the panel uses other slugs.
  categories: {
    plus: "ocg-plus",
    ranks: "ranks",
    credits: "credits"
  },
  // Address players join with. Points at Survival until the Velocity proxy is up.
  networkIp: "play.ocgames.xyz",
  discord: "https://discord.gg/ocg",
  // Discord widget on the home page: invite code (for member counts) and server id (for
  // the online list). The Server Widget must stay on in Discord's server settings.
  discordInvite: "carboncraft",
  discordGuildId: "816007504961601597",
  studio: "https://ocgames.xyz",
  email: "contact@ocgames.xyz",
  // Tebex.js popup colours; "primary" is the button colour inside the checkout.
  checkoutTheme: "dark",
  checkoutColors: [
    { name: "primary", color: "#3afff5" },
    { name: "secondary", color: "#0a0f10" }
  ]
};
