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
| Play | `vote.html` | Vote sites, how to vote, rewards and a recent voter feed, with server tabs (`#survival`, `#skyblock`) |
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

## Recent supporters (store page)

The "Recent supporters" row on `store.html` reads `purchases/recent.json`: up to 12 recent
buyers, one per player, name and UUID only. `scripts/sync-purchases.mjs` builds it from the
Tebex Plugin API, and a GitHub Action (`.github/workflows/sync-purchases.yml`) runs it every
15 minutes and commits any change. The row stays hidden while the file is empty. Demo mode
shows example names from `assets/demo-recent.json`.

Setup (once): in the GitHub repo go to Settings > Secrets and variables > Actions > New
repository secret, name it `TEBEX_SECRET`, and paste the Tebex **secret** key (Tebex >
Integrations > Game Servers). Never put this key in `config.js` or any other site file: it
can take payments and run commands. Then run the workflow once from the Actions tab.

## Vote page

`vote.html` is drawn by `assets/vote.js` (styles in `assets/vote.css`). The network has one
listing on each vote site, so the sites and the voter feed are shared by every server; only the
rewards differ, and the server tabs under "What voting gets you" switch them. The sites and each
server's rewards are at the top of `vote.js` and mirror the server config, so update them
together: sites and per-vote rewards in VotingPlugin `VoteSites.yml`, the all-sites bonus and
vote party in `SpecialRewards.yml`, the streak in CarbonSpend `vote-streak`, and the tiers in
CMI `Ranks.yml`. Skyblock's rewards show "coming soon" until they're filled in.

The Vote buttons tick off in the visitor's browser for 24 hours after they open a link. That's
only a reminder; it doesn't know whether they finished voting.

**Recent voters.** The feed reads `votes/recent.json`: up to 12 voters per server database, name,
UUID, latest vote time and how many sites they voted on in the 24 hours up to it. The page
merges the lists into one feed, each player once.
`scripts/sync-votes.mjs` builds it from VotingPlugin's MySQL table (`VotingPlugin_Users`,
columns `uuid`, `PlayerName`, `LastVotes`), and `.github/workflows/sync-votes.yml` runs it every
15 minutes and commits any change. Demo mode shows example names from `assets/demo-votes.json`.

Setup (once):
1. If the database host lets you, make a read-only MySQL user for the vote database (SELECT
   only). Otherwise the plugin's own user works, but that secret can then change vote data.
2. Make sure the database accepts remote connections from GitHub's runners (any IP).
3. Add a repository secret `VOTES_DB_SURVIVAL` with the value
   `mysql://user:password@host:3306/database` (URL-encode the password if it has symbols).
   Add `VOTES_DB_SKYBLOCK` the same way once Skyblock runs VotingPlugin.
4. Run the workflow once from the Actions tab and check its log for the player count.

Locally: `npm install --no-save mysql2@3.11.0`, put `VOTES_DB_SURVIVAL` in `.env`, then
`node --env-file=.env scripts/sync-votes.mjs`.

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

`node scripts/serve.mjs` serves this folder on http://127.0.0.1:8020 (pass another port as
the first argument). Preview config `network` in `CarbonCraft/.claude/launch.json` runs it.

Links use clean URLs (`vote`, not `vote.html`; home is `./`), which GitHub Pages serves from the
matching `.html` file. `serve.mjs` does the same locally; a plain static server such as Python's
`http.server` doesn't, so links 404 there. Both forms work live, so old `.html` links keep working.

The site stays in **preview mode** while `forceDemo: true` is set in `config.js`. In
preview mode it reads `assets/demo-catalogue.json`, keeps the basket in the browser and
turns checkout off. `?live` forces live mode while testing; `?demo` forces preview mode.

## Going live

1. **Restructure the Tebex catalogue.** *Built on 2026-11-20 and kept **disabled**, so the
   live store is unchanged.* The categories `ocg-plus`, `ranks` and `credits` exist in the
   Tebex panel, each with "Disable this category" turned on. Rank prices are placeholders:

   | Category | Packages | Commands (CarbonCraft server) |
   |---|---|---|
   | OCG+ (30-day subscriptions) | OCG+ Charged $5, Overcharged $10, Supercharged $20 | On purchase and renewal (Carbon+ perks carried over 2026-11-22): `lp user {username} parent addtemp ocgplusN 30d` and `ocg credits give {username} 200/500/1200 {transaction}` (every server; the first one pays). Keys per month: Charged 1 T1; Overcharged 2 T1 + 1 T2; Supercharged 3 T1 + 2 T2 + 2 T3 + 1 T4. Skyblock: one `ecrates key give {username} tN_key <count>` per key tier. Survival: one `cratekey give {username} tN <count>` per key tier, plus `acb {username} 2000/4000/8000` (claim blocks). **Set in Tebex on 2026-11-22** for the CarbonCraft game server (the only one in Tebex so far): rank time, Credits, `cratekey` and `acb` commands on purchase and renewal, all "require online" except the renewal rank time; descriptions updated. When Skyblock is added to Tebex, add its `ecrates` key commands for that server only, because the other server doesn't know the command (key ids are network-wide tiers since 2026-11-21: Skyblock already uses `t1_key` to `t4_key`; CarbonCraft's keys still need renaming from carbon/plasma/fusion/iridium). Each renewal is a new Tebex payment with its own `tbx-` id (checked 2026-11-20), so OCGCore's duplicate check never skips one. The monthly plushie was dropped from OCG+ on 2026-11-20, because a plushie pool has to work on every server. Cosmetic trails may replace it later |
   | Ranks (one-off) | Glow $10, Shine $25, Dazzle $50, Prism $100, Radiant $150 (renamed from the placeholder Pawn to King on 2026-11-21; prices are still placeholders) | Purchase: `lp user {username} parent add <rank>` with group ids `glow`, `shine`, `dazzle`, `prism`, `radiant`. Refund and chargeback: `parent remove <rank>` |
   | Credits (one-off) | The five CarbonCoins packs, renamed, same prices | `ocg credits give {username} <amount> {transaction}` (OCGCore network Credits, only while the player is online). Quantity is locked to 1, because two copies in one payment would share a transaction ref and only pay once. Descriptions point to `/credits` |

   The site pairs tiers and ranks with `data.js` by `order`, then price, then id, so the
   packages don't need dragging into order in the panel.

   **Before launch:**
   - The LuckPerms groups `glow`, `shine`, `dazzle`, `prism`, `radiant`, `ocgplus1`, `ocgplus2`
     and `ocgplus3` were created in the shared network LuckPerms DB on 2026-11-21, so the proxy,
     hub and Skyblock have them. CarbonCraft still has its own H2 data and needs them too (or
     the shared DB) before launch. Without them, purchases deliver nothing.
     (Survival also still has the old copper..emerald groups from 2026-11-20; nothing sells them now.)
   - Install OCGCore (E:\OverCrafted Games\OCGCore) on every server, each with its own `server-id`.
     The Credits and OCG+ packages run `ocg credits give`, so without it these purchases deliver nothing.
     Run `/ocg credits import-cmi` on CarbonCraft once so CarbonCoins balances carry over.
   - `ecrates key give` is the old ExcellentCrates syntax. On ExcellentCrates 7 (OCG Skyblock) the
     command is `cratekey give {username} <key> 1`. Check which one CarbonCraft's version takes
     before the OCG+ packages run on both servers.

   **Launch day:** enable the three new categories, disable Carbon+ and CarbonCoins, rename the
   Tebex project to "OCG Network", and run `lp user <name> parent add radiant` for each Carbon+ Lifetime buyer (look them up under Payments).
   - Add the Skyblock game server in the Tebex panel. Every package (ranks, OCG+ and Credits)
     runs its commands on every server. Ranks are network-wide; each server decides
     the perks a rank gives (for example through LuckPerms groups with the same name on every server).
   - Retire the old Carbon+ and CarbonCoins packages (hide them; don't delete, so past payments keep their history).
   - Carbon+ migration: monthly, 3-month and 6-month subscriptions keep working until they
     expire and are not renewed as OCG+. Carbon+ Lifetime holders get the top permanent rank (Radiant) for free.
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
