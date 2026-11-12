"""Builds now-reading.json for the home page: a few recent article links from independent, safe-for-work magazines.

What it does, politely:
  - reads each magazine's PUBLIC feed once a day, after checking its robots.txt
  - keeps only the title and the link of the newest couple of articles (no text, no images)
  - skips any article whose title contains a word from BLOCK (war, death, crime and similar), so the list stays gentle
  - skips a whole source if anything fails, so one broken feed never breaks the site
Add or remove magazines in SOURCES. The feed addresses were written from general knowledge and have not all been checked:
the log of the daily build shows which ones worked.
"""
import json, re, urllib.request, urllib.robotparser
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

UA = "pink-bourbon-estate-site/1.0 (+https://github.com/pink-bourbon-estate/pink-bourbon-estate.github.io)"
# (name, topic, feed address)
SOURCES = [
    ("Standart", "coffee", "https://standartmag.com/blogs/library.atom"),
    ("Standart (journal)", "coffee", "https://standartmag.com/blogs/journal.atom"),
    ("Sprudge", "coffee", "https://sprudge.com/feed"),
    ("Perfect Daily Grind", "coffee", "https://perfectdailygrind.com/feed/"),
    ("Colossal", "art", "https://www.thisiscolossal.com/feed/"),
    ("The Marginalian", "art and ideas", "https://www.themarginalian.org/feed/"),
    ("Creative Boom", "art and design", "https://www.creativeboom.com/feed/"),
    ("Atlas Obscura", "geography", "https://www.atlasobscura.com/feeds/latest"),
    ("Geographical", "geography", "https://geographical.co.uk/feed"),
    ("Hakai Magazine", "coastal science and conservation", "https://hakaimagazine.com/feed/"),
    ("bioGraphic", "nature and conservation", "https://www.biographic.com/feed/"),
]
BLOCK = re.compile(r"\b(war|wars|kill\w*|dead|death\w*|dies|died|murder\w*|shoot\w*|attack\w*|terror\w*|abuse\w*|assault\w*|rape\w*|sexis\w*|genocide|massacre\w*|trump|election\w*|politic\w*|poach\w*|extinct\w*|suicide|crash\w*|victim\w*)\b", re.I)
NS = {"a": "http://www.w3.org/2005/Atom"}

def items(root):
    """Yield (when, title, url) from an Atom or RSS feed."""
    for e in root.findall("a:entry", NS):
        link = e.find("a:link[@rel='alternate']", NS)
        if link is None: link = e.find("a:link", NS)
        yield (e.findtext("a:published", "", NS) or e.findtext("a:updated", "", NS) or "", (e.findtext("a:title", "", NS) or "").strip(), link.get("href") if link is not None else "")
    for e in root.iter("item"):
        yield (e.findtext("pubDate") or "", (e.findtext("title") or "").strip(), (e.findtext("link") or "").strip())

out = []
for name, topic, feed in SOURCES:
    try:
        host = urlparse(feed).netloc
        rp = urllib.robotparser.RobotFileParser(f"https://{host}/robots.txt"); rp.read()
        if not rp.can_fetch(UA, feed): print("robots.txt says no:", feed); continue
        root = ET.fromstring(urllib.request.urlopen(urllib.request.Request(feed, headers={"User-Agent": UA}), timeout=30).read())
        kept = 0
        for when, title, url in items(root):
            if not title or not url.startswith("https://") or urlparse(url).netloc.replace("www.", "") != host.replace("www.", ""): continue
            if BLOCK.search(title): continue
            out.append({"source": name, "topic": topic, "title": title, "url": url}); kept += 1
            if kept >= 2: break
        print(name, "ok", kept)
    except Exception as e:
        print(name, "skipped:", e)
if out:
    first = next((o for o in out if o["source"].startswith("Standart")), out[0])
    json.dump({"title": first["title"], "url": first["url"], "items": out}, open("now-reading.json", "w"), ensure_ascii=False)
