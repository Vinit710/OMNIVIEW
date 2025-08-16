
import os
import sys
import re
import json
import sqlite3
import logging
import feedparser
from datetime import datetime
from typing import Dict, List, Optional

import tweepy                 # Twitter API v2
import praw                   # Reddit API
import exifread               # EXIF extraction
import requests
import spacy
from tqdm import tqdm
from PIL import Image
from io import BytesIO
from transformers import pipeline
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

# --------------------------- Configuration --------------------------- #

# Twitter
TWITTER_BEARER_TOKEN       = os.getenv("TWITTER_BEARER_TOKEN", "")
# Reddit
REDDIT_CLIENT_ID           = os.getenv("REDDIT_CLIENT_ID", "")
REDDIT_CLIENT_SECRET       = os.getenv("REDDIT_CLIENT_SECRET", "")
REDDIT_USER_AGENT          = "DisasterMonitor/1.0"

# Overpass API endpoint
OVERPASS_URL               = "https://overpass-api.de/api/interpreter"

# SQLite DB
DB_PATH                    = "disaster_monitor.db"

# Thresholds
MIN_DISASTER_CONFIDENCE    = 0.3
MAX_ARTICLES               = 100

# ----------------------------- Logging ------------------------------- #

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("DisasterMonitor")

# -------------------------- Utility Tools ---------------------------- #

def normalize_query(query: str) -> List[str]:
    q = query.lower()
    q = re.sub(r'[^a-z0-9\s]', ' ', q)
    return [w for w in q.split() if w]

def extract_exif_coords_from_url(image_url: str) -> Optional[tuple]:
    """Download image and extract GPS from its EXIF, if present."""
    try:
        resp = requests.get(image_url, timeout=5)
        tags = exifread.process_file(BytesIO(resp.content), details=False)
        lat = tags.get("GPS GPSLatitude")
        lon = tags.get("GPS GPSLongitude")
        lat_ref = tags.get("GPS GPSLatitudeRef")
        lon_ref = tags.get("GPS GPSLongitudeRef")
        if lat and lon and lat_ref and lon_ref:
            def to_deg(vals):
                d,m,s = [float(x.num)/float(x.den) for x in vals.values]
                return d + m/60 + s/3600
            latitude = to_deg(lat) * (1 if lat_ref.values[0]=="N" else -1)
            longitude = to_deg(lon) * (1 if lon_ref.values[0]=="E" else -1)
            return latitude, longitude
    except Exception as e:
        log.debug("EXIF extraction failed: %s", e)
    return None

def query_overpass(feature_name: str) -> Optional[tuple]:
    """
    Query Overpass for exact feature coordinates by name.
    Returns first node's (lat, lon).
    """
    overpass_query = f"""
    [out:json][timeout:5];
    node["name"="{feature_name}"];
    out center 1;
    """
    try:
        resp = requests.post(OVERPASS_URL, data=overpass_query.strip())
        data = resp.json()
        if data.get("elements"):
            el = data["elements"][0]
            return el.get("lat"), el.get("lon")
    except Exception as e:
        log.debug("Overpass query failed: %s", e)
    return None

# --------------------------- NLP & Geocoder -------------------------- #

nlp = spacy.load("en_core_web_sm")
os.environ["TOKENIZERS_PARALLELISM"] = "false"
zero_shot = pipeline("zero-shot-classification",
                     model="typeform/distilbert-base-uncased-mnli", framework="pt")
sentiment = pipeline("sentiment-analysis",
                     model="cardiffnlp/twitter-roberta-base-sentiment-latest", framework="pt")

geolocator = Nominatim(user_agent="disaster_monitor")
rate_geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1)

disaster_keywords: Dict[str,List[str]] = {
    "earthquake": ["earthquake","tremor","quake","aftershock","richter"],
    "flood":      ["flood","flooding","inundation","overflow","waterlogged"],
    "fire":       ["fire","wildfire","blaze","flames","burning"],
    "cyclone":    ["cyclone","hurricane","typhoon","storm"],
    "landslide":  ["landslide","mudslide","avalanche"],
    "accident":   ["accident","crash","collision","derailment","explosion"],
    "health":     ["outbreak","epidemic","pandemic","disease"],
}

# --------------------------- Database Setup -------------------------- #

conn = sqlite3.connect(DB_PATH, check_same_thread=False)
conn.execute("""
CREATE TABLE IF NOT EXISTS disaster_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT UNIQUE,
    platform TEXT,
    post_id TEXT,
    content TEXT,
    disaster_type TEXT,
    confidence REAL,
    latitude REAL,
    longitude REAL,
    severity TEXT,
    timestamp DATETIME,
    author TEXT,
    source_url TEXT
)
""")
conn.commit()

# ---------------------- Social Media Collectors ---------------------- #

# --- Twitter --- #
twitter_client = tweepy.Client(bearer_token=TWITTER_BEARER_TOKEN,
                               wait_on_rate_limit=True)

def collect_twitter(query: str, max_results:int=50) -> List[dict]:
    tweets = twitter_client.search_recent_tweets(
        query=query, tweet_fields=["created_at","geo","attachments"],
        expansions=["geo.place_id","attachments.media_keys"],
        media_fields=["url"], user_fields=["username"], max_results=max_results
    )
    results=[]
    for t in tweets.data or []:
        lat, lon = None, None
        # 1) direct coordinates
        if t.geo and t.geo.get("coordinates"):
            coord = t.geo["coordinates"]["coordinates"]
            lon, lat = coord[0], coord[1]
        # 2) place bounding box centroid
        elif t.geo and t.geo.get("place_id"):
            place = {p.id:p for p in tweets.includes.get("places",[])}.get(t.geo["place_id"])
            if place and place.geo and place.geo.get("bbox"):
                bb=place.geo["bbox"]
                lon=(bb[0]+bb[2])/2; lat=(bb[1]+bb[3])/2
        # 3) image EXIF
        media = tweets.includes.get("media",[])
        if lat is None and media:
            url = next((m.url for m in media if m.url),None)
            if url:
                coords = extract_exif_coords_from_url(url)
                if coords:
                    lat,lon=coords
        results.append({
            "platform":"twitter","post_id":t.id,"content":t.text,
            "author":None,"timestamp":t.created_at,
            "lat":lat,"lon":lon,"url":None
        })
    return results

# --- Reddit --- #
reddit = praw.Reddit(client_id=REDDIT_CLIENT_ID, client_secret=REDDIT_CLIENT_SECRET,
                     user_agent=REDDIT_USER_AGENT)

def collect_reddit(query:str, max_posts:int=50)->List[dict]:
    posts=[]
    for sub in ["worldnews","india","news"]:
        for post in reddit.subreddit(sub).search(query,limit=max_posts//3):
            lat, lon=None,None
            # Try parse "lat, lon" in text via regex
            m = re.search(r"(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)", post.selftext or "")
            if m:
                lat, lon = float(m.group(1)), float(m.group(2))
            # fallback: image EXIF if image url in post
            if lat is None and post.url and post.url.lower().endswith((".jpg",".jpeg",".png")):
                coords=extract_exif_coords_from_url(post.url)
                if coords:
                    lat, lon=coords
            posts.append({
                "platform":"reddit","post_id":post.id,
                "content":f"{post.title} {post.selftext}",
                "author":str(post.author), "timestamp":datetime.fromtimestamp(post.created_utc),
                "lat":lat,"lon":lon,"url":post.url
            })
    return posts

# -------------------------- Processing Logic ------------------------- #

def classify_disaster(text:str)->Dict:
    tl=text.lower()
    scores={dt:sum(kw in tl for kw in kws)/len(kws) for dt,kws in disaster_keywords.items()}
    best_kw,conf_kw=max(scores.items(),key=lambda x:x[1])
    if conf_kw>=MIN_DISASTER_CONFIDENCE:
        return {"type":best_kw,"conf":conf_kw}
    try:
        res=zero_shot(text,list(disaster_keywords.keys()))
        return {"type":res["labels"][0],"conf":float(res["scores"][0])}
    except:
        return {"type":best_kw,"conf":conf_kw}

def process_posts(posts:List[dict])->None:
    for p in posts:
        info=classify_disaster(p["content"])
        if info["conf"]<MIN_DISASTER_CONFIDENCE: continue
        lat, lon = p["lat"], p["lon"]
        # If still none, attempt NER + Overpass landmark geocoding
        if lat is None:
            doc=nlp(p["content"])
            for ent in doc.ents:
                if ent.label_ in ("GPE","LOC"):
                    coords=query_overpass(ent.text)
                    if coords:
                        lat, lon=coords; break
        # severity & sentiment
        sev="unknown"
        for lvl, kws in {"high":["severe","major"],"medium":["moderate"],"low":["minor"]}.items():
            if any(w in p["content"].lower() for w in kws): sev=lvl; break
        sent=sentiment(p["content"][:512])[0]["label"]
        # save
        evt_id=f"{p['platform']}_{p['post_id']}"
        conn.execute("""
            INSERT OR IGNORE INTO disaster_events
            (event_id,platform,post_id,content,disaster_type,confidence,
             latitude,longitude,severity,timestamp,author,source_url)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        """,(evt_id,p["platform"],p["post_id"],p["content"],info["type"],
              info["conf"],lat,lon,sev,p["timestamp"],p["author"],p["url"]))
    conn.commit()

# ----------------------------- Main ---------------------------------- #

def main():
    print("Disaster Monitor – enter a query or 'exit'")
    while True:
        q=input("Query> ").strip()
        if q.lower() in ("exit","quit"): break
        tweets=collect_twitter(q, max_results=MAX_ARTICLES)
        reds=collect_reddit(q, max_posts=MAX_ARTICLES)
        print(f"Fetched {len(tweets)} tweets and {len(reds)} Reddit posts")
        process_posts(tweets+reds)
        print("Processed and saved to database.")

if __name__=="__main__":
    main()
