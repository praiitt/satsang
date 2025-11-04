"""
Bhajan search module backed by Internet Archive.

Replaces local index-based search. Given a query, it searches Internet Archive's
AdvancedSearch API for devotional audio and returns a direct MP3 URL when possible.
"""
import logging
from typing import Optional, Dict, List
import json
import urllib.parse
import urllib.request
import socket

logger = logging.getLogger("bhajan_search")


def normalize_query(query: str) -> str:
    """Normalize search query by removing common words and converting to lowercase."""
    # Remove common Hindi words and connectors
    remove_words = ["ka", "ki", "ke", "ko", "kya", "bajao", "chal", "play", "sunao"]
    query_lower = query.lower().strip()
    words = query_lower.split()
    filtered_words = [w for w in words if w not in remove_words]
    return " ".join(filtered_words) if filtered_words else query_lower


def _http_get_json(url: str, timeout: float = 10.0) -> Optional[Dict]:
    req = urllib.request.Request(url, headers={"User-Agent": "SatsangBhajanSearch/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
            return json.loads(data.decode("utf-8"))
    except Exception as e:
        logger.warning(f"HTTP error fetching {url}: {e}")
        return None


def _search_internet_archive(query: str, rows: int = 10) -> List[Dict]:
    """Search Internet Archive for audio items matching the query."""
    normalized = normalize_query(query)
    # Bias towards devotional terms to improve precision
    q = f"({urllib.parse.quote_plus(normalized)}) AND mediatype:(audio)"
    base = "https://archive.org/advancedsearch.php"
    url = f"{base}?q={q}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=format&sort[]=downloads+desc&rows={rows}&output=json"
    data = _http_get_json(url)
    if not data:
        return []
    docs = data.get("response", {}).get("docs", [])
    return docs

def _first_mp3_file(identifier: str, timeout: float = 10.0) -> Optional[str]:
    """Return a direct MP3 file URL for an Internet Archive item if available."""
    meta_url = f"https://archive.org/metadata/{urllib.parse.quote(identifier)}"
    meta = _http_get_json(meta_url, timeout=timeout)
    if not meta:
        return None
    files = meta.get("files", [])
    # Prefer MP3 then OGG (we can still stream OGG in most browsers, but MP3 first)
    for f in files:
        name = f.get("name") or ""
        if name.lower().endswith(".mp3"):
            return f"https://archive.org/download/{identifier}/{urllib.parse.quote(name)}"
    for f in files:
        name = f.get("name") or ""
        if name.lower().endswith(".ogg"):
            return f"https://archive.org/download/{identifier}/{urllib.parse.quote(name)}"
    return None

def find_bhajan_by_name(query: str) -> Optional[Dict]:
    """Find best-matching Internet Archive item and return a dict with url/title."""
    logger.info(f"IA search for bhajan: '{query}'")
    docs = _search_internet_archive(query)
    for d in docs:
        identifier = d.get("identifier")
        if not identifier:
            continue
        url = _first_mp3_file(identifier)
        if url:
            return {
                "identifier": identifier,
                "title": d.get("title") or query,
                "creator": d.get("creator"),
                "file_url": url,
            }
    logger.warning(f"No playable file found for query '{query}' from Internet Archive")
    return None


def get_bhajan_url(bhajan_name: str, base_url: Optional[str] = None) -> Optional[str]:
    """
    Get the URL for a bhajan that can be used by the frontend.
    
    Args:
        bhajan_name: The name of the bhajan to play
        base_url: Base URL for the API (e.g., "https://satsang.rraasi.com")
                 If None, will use relative path
    
    Returns:
        URL string to the bhajan MP3 file, or None if not found
    """
    result = find_bhajan_by_name(bhajan_name)
    if not result:
        return None
    return result.get("file_url")


def list_available_bhajans() -> List[str]:
    """Return a few popular items for hints (best-effort)."""
    docs = _search_internet_archive("bhajan krishna", rows=5)
    names: List[str] = []
    for d in docs:
        title = d.get("title")
        if title:
            names.append(title)
    return names

