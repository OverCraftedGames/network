"""Turns news/drafts/launch-posts.md into news/seed-messages.json (Discord message shape),
so `node scripts/sync-news.mjs --seed news/seed-messages.json` can build a preview feed
without a bot token. Posts are listed oldest first, an hour apart, ending now."""
import json, re, datetime, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
text = (root / "news/drafts/launch-posts.md").read_text(encoding="utf-8")
text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
posts = [p.strip() for p in text.split("=====") if p.strip()]
now = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
messages = []
for i, content in enumerate(posts):
    when = now - datetime.timedelta(hours=len(posts) - 1 - i)
    messages.append({
        "id": f"seed{i + 1}", "type": 0, "content": content,
        "timestamp": when.isoformat(), "edited_timestamp": None,
        "author": {"username": "OverCrafted Games"}, "attachments": [], "embeds": [], "mentions": [],
    })
(root / "news/seed-messages.json").write_text(json.dumps(messages, indent=2) + "\n", encoding="utf-8")
print(f"{len(messages)} seed messages, each under 2000 chars:", all(len(m["content"]) <= 2000 for m in messages))
