# OCG Network site (minecraft.ocgames.xyz)

The network hub and store for the OverCrafted Games Minecraft servers: OCG Survival and
OCG Skyblock (coming soon). It replaces the CarbonCraft Tebex webstore and is
built on the earlier store prototype (`Test Env/store-site`). The studio site at ocgames.xyz
stays separate.

It's a static site for GitHub Pages: no build step and no backend. The store runs on the Tebex
Headless API, and payment always happens in Tebex's own checkout, so card details never
touch this site.

## Pages

| Area | Page | What it is |
|---|---|---|
| Play | `index.html` | Home: banner with the network IP, a news feed mirrored from Discord, and a sidebar with server status, the Discord widget and a store spotlight |
| Play | `survival.html`, `skyblock.html` | One page per server (each server has its own accent colour) |
| Play | `wikis.html` | Wiki links for each server |
| Store | `store.html` | Store hub: OCG+, Ranks and Credits, plus current sales |
| Store | `plus.html` | OCG+: three monthly loot tiers |
| Store | `ranks.html` | Network-wide permanent ranks: one ladder, with server tabs that switch the perk table (`#survival`, `#skyblock`) |
| Store | `credits.html` | Credits packs, and what Credits buy on each server |
| Store | `shop.html` | Every Tebex category, with tabs (gifting lives here) |
| Store | `rewards.html`, `support.html`, `terms.html`, `purchase-agreement.html` | Carried over from the prototype |

Store pages have `data-area="store"`, which adds the store bar under the header.

## Where things live

- `assets/config.js`: the Tebex public token, demo switch, category slugs, network IP and Discord link.
- `assets/data.js`: content that isn't in Tebex. That covers the servers, what each OCG+ tier
  includes, the rank ladder (names and colours), the perks (network-wide plus per server) and what Credits buy. **Prices always come from Tebex.**
  OCG+ tiers and ranks match Tebex packages **by order**: the first entry pairs with the package
  that has the lowest `order` in its category.
- `assets/layout.js`: the header, store bar, footer, basket drawer, dialogs and icon sprite.
- `assets/store.js`: the Tebex API, basket, checkout and every catalogue renderer.
- `assets/site.css`: the OCG brand styles (teal `#3afff5`, black and white).
- `assets/demo-catalogue.json` and `assets/icons/`: the example catalogue and its icons, used in preview mode.

Anything marked PLACEHOLDER is example content until the real values are decided. That
includes the OCG+ tier names and contents, the rank ladder, prices and perks, the Skyblock
features, and the Credits uses on Skyblock.

## News feed (mirrored from Discord)

The home page feed reads `news/posts.json`, which is generated from the Discord
announcements channel by `scripts/sync-news.mjs`. A GitHub Action
(`.github/workflows/sync-news.yml`) runs it every 15 minutes and commits any change, and
that commit redeploys Pages. Editing or deleting a Discord post updates the site on the next run.

To write a post, use the announcements channel as normal:
- The first line is the title, written as `# Title`, `**Title**` or just a plain short line (up to 100 characters) with the post text below it.
- Start the title with `[Survival]`, `[Skyblock]` or `[Network]` to tag it. Untagged posts are tagged Network.
- The first image attached is the cover; any later images go under the text. Images are
  copied into `news/media/`, because Discord's attachment links expire.
- Put `[noweb]` anywhere in a message to keep it off the site.

Bot setup (once):
1. Create a Discord application with a bot (Discord Developer Portal), and invite it to the server.
   It only needs **View Channel** and **Read Message History** on the announcements channel.
   Under Bot, turn on **Message Content Intent**; without it every message comes back empty.

Running it locally (until the repo exists): copy `.env.example` to `.env`, fill in the token
and channel id, then run `node --env-file=.env scripts/sync-news.mjs`. `.env` is git-ignored.

Once the repo exists:
2. In the repo go to Settings > Secrets and variables > Actions, and add `DISCORD_BOT_TOKEN` and
   `DISCORD_NEWS_CHANNEL_ID`. To get the channel id, right-click the channel in Discord with Developer Mode on.
3. Run the workflow once by hand (Actions > Sync news from Discord > Run workflow).

The launch posts are in `news/drafts/launch-posts.md`, ready to paste into Discord.
`news/posts.json` currently holds a preview built from those drafts
(`py -3 scripts/build-seed.py` then `node scripts/sync-news.mjs --seed news/seed-messages.json`).
The first real sync replaces it.

The sidebar's Discord card uses the public invite and Server Widget APIs (`discordInvite` and
`discordGuildId` in `config.js`). Keep the Server Widget turned on in Discord's server settings.

## Run it

Preview config `network` in `CarbonCraft/.claude/launch.json` serves this folder on
http://127.0.0.1:8020.

The site stays in **preview mode** while `forceDemo: true` is set in `config.js`. In
preview mode it reads `assets/demo-catalogue.json`, keeps the basket in the browser and
turns checkout off. `?live` forces live mode while testing; `?demo` forces preview mode.

## Going live

1. **Restructure the Tebex catalogue.** *Built on 2026-11-20 and kept **disabled**, so the
   live store is unchanged.* The categories `ocg-plus`, `ranks` and `credits` exist in the
   Tebex panel, each with "Disable this category" turned on. Rank prices are placeholders:

   | Category | Packages | Commands (CarbonCraft server) |
   |---|---|---|
   | OCG+ (30-day subscriptions) | OCG+ Charged $5, Overcharged $10, Supercharged $20 | On purchase and renewal: `lp user {username} parent addtemp ocgplusN 30d`, `ocg credits give {username} 175/425/850 {transaction}` and `ecrates key give {username} t1_key/t2_key/t4_key 1` (key ids are network-wide tiers since 2026-11-21: Skyblock already uses `t1_key` to `t4_key`; CarbonCraft's keys still need renaming from carbon/plasma/fusion/iridium). Each renewal is a new Tebex payment with its own `tbx-` id (checked 2026-11-20), so OCGCore's duplicate check never skips one. The monthly plushie was dropped from OCG+ on 2026-11-20, because a plushie pool has to work on every server. Cosmetic trails may replace it later |
   | Ranks (one-off) | Pawn $10, Knight $25, Bishop $50, Rook $100, King $150 | Purchase: `lp user {username} parent add <rank>`. Refund and chargeback: `parent remove <rank>` |
   | Credits (one-off) | The five CarbonCoins packs, renamed, same prices | `ocg credits give {username} <amount> {transaction}` (OCGCore network Credits, only while the player is online). Quantity is locked to 1, because two copies in one payment would share a transaction ref and only pay once. Descriptions point to `/credits` |

   The site pairs tiers and ranks with `data.js` by `order`, then price, then id, so the
   packages don't need dragging into order in the panel.

   **Before launch:**
   - Create the LuckPerms groups `pawn`, `knight`, `bishop`, `rook`, `king`, `ocgplus1`,
     `ocgplus2` and `ocgplus3` on every server. Without them, purchases deliver nothing.
     (The old copper..emerald groups were made on Survival 2026-11-20; the chess groups are not made yet.)
   - Install OCGCore (E:\OverCrafted Games\OCGCore) on every server, each with its own `server-id`.
     The Credits and OCG+ packages run `ocg credits give`, so without it these purchases deliver nothing.
     Run `/ocg credits import-cmi` on CarbonCraft once so CarbonCoins balances carry over.
   - `ecrates key give` is the old ExcellentCrates syntax. On ExcellentCrates 7 (OCG Skyblock) the
     command is `cratekey give {username} <key> 1`. Check which one CarbonCraft's version takes
     before the OCG+ packages run on both servers.

   **Launch day:** enable the three new categories, disable Carbon+ and CarbonCoins, rename the
   Tebex project to "OCG Network", and run `lp user <name> parent add king` for each Carbon+ Lifetime buyer (look them up under Payments).
   - Add the Skyblock game server in the Tebex panel. Every package (ranks, OCG+ and Credits)
     runs its commands on every server. Ranks are network-wide; each server decides
     the perks a rank gives (for example through LuckPerms groups with the same name on every server).
   - Retire the old Carbon+ and CarbonCoins packages (hide them; don't delete, so past payments keep their history).
   - Carbon+ migration: monthly, 3-month and 6-month subscriptions keep working until they
     expire and are not renewed as OCG+. Carbon+ Lifetime holders get the top permanent rank (King) for free.
   - CarbonCoins become Credits with the same five packs and prices. Balances carry over 1:1.
2. Fill in the real tier contents, ranks and perks in `data.js`.
3. Set `forceDemo: false` and test against the live catalogue. Then make one real low-value
   purchase on a test domain to check `payment:complete`, the `?paid=1` return and in-game delivery.
4. *Done on 2026-11-20.* The repo is `OverCraftedGames/network`. Pages deploys from `main`
   (root) to https://overcraftedgames.github.io/network/ while the site is in preview.
   **To switch to the real domain at launch:** add a GoDaddy CNAME record `minecraft`
   pointing at `overcraftedgames.github.io`. Then commit a `CNAME` file containing
   `minecraft.ocgames.xyz` (or set it under Settings > Pages) and turn on "Enforce HTTPS"
   once the certificate is issued. The CNAME is left out until then, because Pages would
   otherwise redirect to a domain that doesn't resolve yet.
5. Update the old links: the studio site, Discord, the wiki and the in-game `/store` and `/buy`.

## How it talks to Tebex

| What | Call |
|---|---|
| Catalogue | `GET /api/accounts/{token}/categories?includePackages=1` |
| New basket (username required for Minecraft) | `POST /api/accounts/{token}/baskets` |
| Restore basket | `GET /api/accounts/{token}/baskets/{ident}` |
| Add / remove package | `POST /api/baskets/{ident}/packages`, `…/packages/remove` |
| Coupon | `POST /api/accounts/{token}/baskets/{ident}/coupons` |
| Sign-in options | `GET /api/accounts/{token}/baskets/{ident}/auth?returnUrl=…` |

Server status comes from the public mcsrvstat.us API, and player heads come from mc-heads.net.
