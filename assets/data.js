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

  // OCG+ monthly tiers, cheapest first. PLACEHOLDER names and contents.
  plus: [
    {
      name: "OCG+ I",
      tagline: "The monthly drop",
      items: [
        ["coin", "<b>500 Credits</b> every month"],
        ["key", "<b>2 crate keys</b> on every server"],
        ["gem", "This month's <b>cosmetic</b>"],
        ["discord", "OCG+ role in Discord"]
      ]
    },
    {
      name: "OCG+ II",
      tagline: "More of everything",
      featured: true,
      items: [
        ["coin", "<b>1,200 Credits</b> every month"],
        ["key", "<b>5 crate keys</b> on every server"],
        ["gem", "This month's <b>cosmetic</b> + a bonus cosmetic"],
        ["gift", "A <b>monthly plushie</b>"],
        ["discord", "OCG+ role in Discord"]
      ]
    },
    {
      name: "OCG+ III",
      tagline: "The full haul",
      items: [
        ["coin", "<b>2,000 Credits</b> every month"],
        ["key", "<b>8 crate keys</b> + 1 rare key on every server"],
        ["gem", "Every monthly cosmetic, plus a <b>III-only</b> one"],
        ["gift", "<b>2 monthly plushies</b>"],
        ["discord", "OCG+ III role in Discord"]
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
      survival: [
        { title: "Limits", perks: [
          ["Homes", ["5", "8", "12", "20", "30"]],
          ["Player warps", ["1", "2", "3", "5", "8"]],
          ["Bonus claim blocks", ["+2,000", "+5,000", "+10,000", "+20,000", "+35,000"]],
          ["Auction listings", ["8", "12", "18", "25", "35"]]
        ]},
        { title: "Commands", perks: [
          ["/hat", [true, true, true, true, true]],
          ["/craft and /enderchest", [false, true, true, true, true]],
          ["/nick", [false, false, true, true, true]],
          ["/back after death", [false, false, true, true, true]],
          ["/fly in your own claims", [false, false, false, true, true]]
        ]},
        { title: "Extras", perks: [
          ["Rank kit (weekly)", [false, false, true, true, true]]
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
