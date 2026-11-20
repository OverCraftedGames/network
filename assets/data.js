// Network content that lives on the site, not in Tebex: servers, what each OCG+ tier
// gives, rank perks and what Credits buy. Prices always come from Tebex.
//
// Matching to Tebex is by ORDER: the first tier/rank here pairs with the first package
// (lowest "order") in its Tebex category, and so on. Keep both lists in the same order.
//
// Everything marked PLACEHOLDER is example content until the real values are decided.
window.NETWORK = {
  servers: [
    {
      id: "survival",
      name: "Survival",
      page: "survival.html",
      status: "live",
      ip: "play.carboncraft.xyz",
      wiki: "https://wiki.carboncraft.xyz/",
      blurb: "Survival with a player economy, custom gear, land claims and a crew to play with.",
      tags: ["Economy", "Claims", "Custom items", "Factions"]
    },
    {
      id: "skyblock",
      name: "Skyblock",
      page: "skyblock.html",
      status: "soon",
      ip: "",
      wiki: "",
      blurb: "Start on a rock in the sky and build it into an empire. The next OCG server.",
      tags: ["Islands", "Coming soon"]
    }
  ],

  // OCG+ monthly tiers, cheapest first ($5 / $10 / $20).
  // Credits + keys are worth about half of a Credits pack at the same price (keys counted at
  // their coin-shop price: Carbon 75, Plasma 125, Iridium 350). More perks get added over time.
  // Badge: one bolt by the name in chat and tab, coloured by tier (yellow / gold / pink).
  plus: [
    {
      name: "Charged",
      tagline: "A monthly top-up",
      items: [
        ["coin", "<b>175 Credits</b> every month"],
        ["key", "<b>1 Carbon key</b> every month"],
        ["gem", "A <b>yellow bolt</b> by your name in chat and tab"]
      ]
    },
    {
      name: "Overcharged",
      tagline: "More loot, more perks",
      featured: true,
      items: [
        ["coin", "<b>425 Credits</b> every month"],
        ["key", "<b>1 Plasma key</b> every month"],
        ["plush", "A <b>random plushie</b> every month"],
        ["vote", "<b>Double vote keys</b>"],
        ["gem", "A <b>gold bolt</b> by your name in chat and tab"]
      ]
    },
    {
      name: "Supercharged",
      tagline: "The full haul",
      items: [
        ["coin", "<b>850 Credits</b> every month"],
        ["key", "<b>1 Iridium key</b> every month"],
        ["plush", "A <b>random plushie</b> every month"],
        ["vote", "<b>Double vote keys</b>"],
        ["crown", "That month's <b>exclusive tag</b>, yours to keep"],
        ["check", "<b>/fly</b> in your own claims"],
        ["gem", "A <b>pink bolt</b> by your name in chat and tab"]
      ]
    }
  ],

  // Permanent ranks are network-wide: one purchase, one ladder, valid on every server.
  // Only the perks differ per server. "ladder" is in Tebex order (cheapest first);
  // "perks.network" applies everywhere, the other keys are per server (matching servers[].id).
  // A perk value is shown as written; true shows a tick, false or "" shows a dash.
  // PLACEHOLDER: names, colours and perks are examples until the real ladder is set.
  ranks: {
    ladder: [
      { name: "Copper", color: "#e08a5a" },
      { name: "Iron", color: "#d8dde0" },
      { name: "Gold", color: "#ffd23f" },
      { name: "Diamond", color: "#5ef0f0" },
      // Top rank. Carbon+ Lifetime holders are moved to this rank (see README, Going live).
      { name: "Emerald", color: "#3ddc84" }
    ],
    perks: {
      network: [
        { title: "Everywhere", perks: [
          ["Rank tag in chat and tab on every server", [true, true, true, true, true]],
          ["Rank role in Discord", [true, true, true, true, true]],
          ["Coloured chat", [false, true, true, true, true]]
        ]}
      ],
      // Emerald must cover everything Carbon+ Lifetime gave (Lifetime holders move to it).
      survival: [
        { title: "Limits", perks: [
          ["Homes", ["5", "8", "10", "15", "20"]],
          ["Auction listings", ["10", "15", "20", "30", "40"]],
          ["Player warps", ["2", "3", "5", "8", "12"]],
          ["Claim blocks (once, on purchase)", ["+2,000", "+5,000", "+10,000", "+20,000", "+35,000"]]
        ]},
        { title: "Commands", perks: [
          ["/hat and /workbench", [true, true, true, true, true]],
          ["/enderchest", [false, true, true, true, true]],
          ["/nick", [false, false, true, true, true]],
          ["/heads", [false, false, true, true, true]],
          ["/back", [false, false, true, true, true]],
          ["/fly in your own claims", [false, false, false, true, true]]
        ]},
        { title: "Extras", perks: [
          ["Double vote keys", [false, false, false, true, true]]
        ]}
      ],
      skyblock: [
        { title: "Island", perks: [
          ["Island size bonus", ["+10", "+25", "+50", "+100", "+150"]],
          ["Extra team members", ["+1", "+2", "+4", "+6", "+8"]],
          ["Island homes", ["2", "3", "5", "8", "12"]]
        ]},
        { title: "Commands", perks: [
          ["/hat", [true, true, true, true, true]],
          ["/craft and /enderchest", [false, true, true, true, true]],
          ["/fly on your island", [false, false, true, true, true]],
          ["/nick", [false, false, false, true, true]]
        ]}
      ]
    }
  },

  // What Credits buy on each server. PLACEHOLDER for Skyblock.
  creditUses: {
    survival: [
      "Chat tags and join messages",
      "Crate keys and plushies",
      "Cosmetics in the coin shop",
      "Claim blocks and quality-of-life unlocks"
    ],
    skyblock: [
      "Island cosmetics and themes",
      "Crate keys",
      "Chat tags and join messages"
    ]
  }
};

// Small inline art, shared by the pages.
window.NETWORK_ART = {
  survival: `<svg viewBox="0 0 100 100" aria-hidden="true">
    <polygon points="10,30 50,50 50,92 10,72" fill="#7a4f2a"/>
    <polygon points="50,50 90,30 90,72 50,92" fill="#5a3a1e"/>
    <polygon points="10,30 50,50 50,59 10,39" fill="#5fae3a"/>
    <polygon points="50,50 90,30 90,39 50,59" fill="#468a2a"/>
    <polygon points="50,10 90,30 50,50 10,30" fill="#7ed957"/>
    <polygon points="50,18 74,30 50,42 26,30" fill="#93e66d" opacity=".55"/>
    <rect x="20" y="58" width="6" height="6" fill="#8f6236" transform="skewY(26.5)"/>
    <rect x="64" y="40" width="6" height="6" fill="#4a2f17" transform="skewY(-26.5)"/>
  </svg>`,
  skyblock: `<svg viewBox="0 0 100 112" aria-hidden="true">
    <ellipse cx="18" cy="22" rx="14" ry="5" fill="#ffffff" opacity=".35"/>
    <ellipse cx="84" cy="14" rx="12" ry="4" fill="#ffffff" opacity=".3"/>
    <polygon points="14,46 50,64 50,108" fill="#6b7480"/>
    <polygon points="50,64 86,46 50,108" fill="#4d545d"/>
    <polygon points="14,40 50,58 50,70 14,52" fill="#7a4f2a"/>
    <polygon points="50,58 86,40 86,52 50,70" fill="#5a3a1e"/>
    <polygon points="50,22 86,40 50,58 14,40" fill="#7ed957"/>
    <rect x="57" y="22" width="5" height="16" fill="#6b4422"/>
    <polygon points="59.5,4 73,14 59.5,24 46,14" fill="#3e9a3a"/>
    <polygon points="59.5,10 70,17 59.5,26 49,17" fill="#2f7d2c"/>
  </svg>`,
  plus: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <rect x="9" y="9" width="30" height="30" rx="3" transform="rotate(45 24 24)" fill="none" stroke="currentColor" stroke-width="3"/>
    <path d="M24 16v16M16 24h16" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
  </svg>`
};
