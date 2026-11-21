// Site settings. The public token is designed to be public (Tebex panel > Integrations >
// Headless API) and is safe to commit. Never put the secret key here.
window.STORE_CONFIG = {
  publicToken: "glu6-7aeeb7f0b19ddc0401583c67f46156c077510d45",
  // The live Tebex catalogue still has the old Carbon+ / CarbonCoins categories. Until it
  // is restructured (see README), the site runs from assets/demo-catalogue.json.
  // Set to false once the new categories exist. ?live forces live mode for testing.
  forceDemo: true,
  // Tebex category slugs for each store page. Rename here if the panel uses other slugs.
  categories: {
    plus: "ocg-plus",
    ranks: "ranks",
    credits: "credits"
  },
  // Address players join with. Points at Survival until the Velocity proxy is up.
  networkIp: "play.ocgames.xyz",
  discord: "https://discord.gg/carboncraft",
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
