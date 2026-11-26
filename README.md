# OCG Network site

Site + store for the OCG Minecraft servers. Static, hosted on GitHub Pages. Store runs on the Tebex Headless API, checkout is Tebex's.

## Pages

- `index.html` home, news feed, server status, Discord card
- `vote.html` vote sites, rewards, recent voters
- `survival.html`, `skyblock.html`, `wikis.html`, `staff.html`
- Store: `store.html`, `plus.html`, `ranks.html`, `credits.html`, `shop.html`, `rewards.html`, `support.html`, `terms.html`, `purchase-agreement.html`

## Files

- `assets/config.js` public token, demo switch, slugs, IP, Discord
- `assets/data.js` servers, tiers, ranks, perks (prices come from Tebex, order matches Tebex)
- `assets/layout.js` header/footer/drawer
- `assets/store.js` Tebex + basket + catalogue
- `assets/vote.js` vote page
- `assets/news.js` news feed
- `assets/site.css`, `assets/vote.css`

## Run locally

```
node scripts/serve.mjs [port]
```

Defaults to http://127.0.0.1:8020. Use this instead of a plain static server so clean URLs (`/vote`) work.

`forceDemo: true` in `config.js` uses `assets/demo-catalogue.json`. `?demo` / `?live` override it.

## Sync jobs

GitHub Actions, every 15 min, commit on change:

- `sync-news.mjs` Discord announcements -> `news/posts.json` (`DISCORD_BOT_TOKEN`, `DISCORD_NEWS_CHANNEL_ID`)
- `sync-purchases.mjs` recent buyers -> `purchases/recent.json` (`TEBEX_SECRET`)
- `sync-votes.mjs` recent voters -> `votes/recent.json` (`VOTES_DB_SURVIVAL`, `VOTES_DB_SKYBLOCK`)

Secrets go in repo secrets or a local `.env`, never in the site files.

News posts: first line is the title, tag with `[Survival]` / `[Skyblock]` / `[Network]`, `[noweb]` skips a post.
