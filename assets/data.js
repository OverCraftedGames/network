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
      page: "survival",
      status: "live",
      ip: "play.ocgames.xyz",
      wiki: "https://wiki.ocgames.xyz/",
      blurb: "Survival with a player economy, custom gear, land claims and a crew to play with.",
      tags: ["Economy", "Claims", "Custom items", "Factions"]
    },
    {
      id: "skyblock",
      name: "Skyblock",
      page: "skyblock",
      status: "soon",
      ip: "",
      wiki: "",
      blurb: "Start on a rock in the sky and build it into an empire. The next OCG server.",
      tags: ["Islands", "Coming soon"]
    }
  ],

  // OCG+ monthly tiers, cheapest first ($5 / $10 / $20).
  // Perks carried over from Carbon+ I / II / III (2026-11-22). Renews every 30 days, stacks with
  // any rank or works on its own, rewards pay once per billing period. Every tier can also be
  // bought in game for Credits (500 / 1,000 / 2,000 per 4 weeks, Survival coin shop).
  // Keys are named by tier (T1 to T4), not crate name, because each server names its crates differently.
  // Badge: one bolt by the name in chat and tab, coloured by tier: yellow (Charged), pink (Overcharged), teal (Supercharged).
  plus: [
    {
      name: "Charged",
      tagline: "A monthly top-up",
      items: [
        ["coin", "<b>200 Credits</b> every month"],
        ["key", "<b>1 T1 crate key</b> every month"],
        ["check", "<b>2,000 claim blocks</b> every month (Survival)"],
        ["vote", "<b>Double vote rewards</b>"],
        ["check", "<b>/fly</b> in your own claims"],
        ["check", "<b>/shout</b> cooldown cut to <b>8 min</b>"],
        ["gem", "A <b>yellow bolt</b> by your name in chat and tab"]
      ]
    },
    {
      name: "Overcharged",
      tagline: "More loot, more perks",
      featured: true,
      items: [
        ["coin", "<b>500 Credits</b> every month"],
        ["key", "<b>3 crate keys</b> every month: 2 T1, 1 T2"],
        ["check", "<b>4,000 claim blocks</b> every month (Survival)"],
        ["vote", "<b>Double vote rewards</b>"],
        ["check", "<b>/fly</b> in your own claims"],
        ["check", "<b>/shout</b> cooldown cut to <b>6 min</b>"],
        ["gem", "A <b>pink bolt</b> by your name in chat and tab"]
      ]
    },
    {
      name: "Supercharged",
      tagline: "The full haul",
      items: [
        ["coin", "<b>1,200 Credits</b> every month"],
        ["key", "<b>8 crate keys</b> every month: 3 T1, 2 T2, 2 T3, 1 T4"],
        ["check", "<b>8,000 claim blocks</b> every month (Survival)"],
        ["vote", "<b>Double vote rewards</b>"],
        ["check", "<b>/fly</b> in your own claims"],
        ["check", "<b>/shout</b> cooldown cut to <b>4 min</b>"],
        ["gem", "A <b>teal bolt</b> by your name in chat and tab"]
      ]
    }
  ],

  // Permanent ranks are network-wide: one purchase, one ladder, valid on every server.
  // Only the perks differ per server. "ladder" is in Tebex order (cheapest first);
  // "perks.network" applies everywhere, the other keys are per server (matching servers[].id).
  // A perk value is shown as written; true shows a tick, false or "" shows a dash.
  // Ladder locked 2026-11-21: Glow, Shine, Dazzle, Prism, Radiant (LuckPerms groups glow to radiant).
  // Colours match the neon rank tags in game. Prices ($10 / $25 / $50 / $100 / $150) and the
  // perks below are still PLACEHOLDER.
  ranks: {
    ladder: [
      { name: "Glow", color: "#C6FF4D" },
      { name: "Shine", color: "#4DF0FF" },
      { name: "Dazzle", color: "#9D5CFF" },
      { name: "Prism", color: "#FF8A3D" },
      // Top rank. Carbon+ Lifetime holders are moved to this rank (see README, Going live).
      { name: "Radiant", color: "#FF4DB8" }
    ],
    perks: {
      network: [
        { title: "Everywhere", perks: [
          ["Rank tag in chat and tab on every server", [true, true, true, true, true]],
          ["Coloured signs", [false, false, true, true, true]],
          ["Coloured chat (/chatcolor)", [false, false, false, false, true]],
          ["Rank role in Discord", [true, true, true, true, true]]
        ]}
      ],
      // Radiant must cover everything Carbon+ Lifetime gave (Lifetime holders move to it).
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
          ["/nick, with colours", [false, false, true, true, true]],
          ["/heads", [false, false, true, true, true]],
          ["/fly in your own claims", [false, false, false, true, true]],
          ["/anvil and /grindstone", [false, false, false, false, true]],
          ["/condense", [false, false, false, false, true]],
          ["/sit and /ride", [false, false, false, false, true]],
          ["/top", [false, false, false, false, true]],
          ["/ptime (your own time of day)", [false, false, false, false, true]]
        ]},
        { title: "Extras", perks: [
          ["Double vote keys", [false, false, false, true, true]],
          ["SafariNet: catch and craft mob nets", [false, false, false, false, true]]
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
    <path d="M26.5 14L18.5 25.5h5l-1.5 8.5 8-11.5h-5z" fill="currentColor"/>
  </svg>`
};
