"""
Bhajan search module backed by Spotify Web API.

Replaces local index-based and Internet Archive search. Given a query, it searches
Spotify's Search API for devotional tracks and returns preview URLs (direct MP3 URLs)
that can be played in the frontend.

Note: Spotify preview URLs are 30-second previews. For full tracks, you'd need
Spotify Premium and their Web Playback SDK.
"""
import logging
import os
from typing import Optional, Dict, List
import json
import urllib.parse
import aiohttp
import asyncio

logger = logging.getLogger("bhajan_search")

# Spotify API endpoint
SPOTIFY_API_BASE = "https://api.spotify.com/v1"


def normalize_query(query: str) -> str:
    """Normalize search query by removing common words and converting to lowercase."""
    # Remove common Hindi words and connectors
    remove_words = ["ka", "ki", "ke", "ko", "kya", "bajao", "chal", "play", "sunao", "bhajan"]
    query_lower = query.lower().strip()
    words = query_lower.split()
    filtered_words = [w for w in words if w not in remove_words]
    return " ".join(filtered_words) if filtered_words else query_lower


def _get_spotify_token() -> Optional[str]:
    """Get Spotify access token from environment variable."""
    token = os.getenv("SPOTIFY_ACCESS_TOKEN")
    if not token:
        logger.warning("SPOTIFY_ACCESS_TOKEN not set in environment")
    return token


async def _search_spotify(query: str, token: str, limit: int = 10) -> Optional[Dict]:
    """
    Search Spotify for tracks matching the query.
    
    Returns the search API response or None on error.
    """
    normalized = normalize_query(query)
    # Add devotional/spiritual keywords to improve results
    search_query = f"{normalized} bhajan devotional"
    
    url = f"{SPOTIFY_API_BASE}/search"
    params = {
        "q": search_query,
        "type": "track",
        "limit": limit,
        "market": "IN",  # Indian market for better bhajan coverage
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status == 401:
                    logger.error("Spotify API authentication failed - token may be expired")
                    return None
                if response.status == 429:
                    logger.warning("Spotify API rate limit hit")
                    return None
                response.raise_for_status()
                return await response.json()
    except asyncio.TimeoutError:
        logger.error(f"Timeout searching Spotify for '{query}'")
        return None
    except aiohttp.ClientError as e:
        logger.error(f"HTTP error searching Spotify for '{query}': {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error searching Spotify for '{query}': {e}")
        return None


async def find_bhajan_by_name_async(query: str) -> Optional[Dict]:
    """
    Find best-matching Spotify track and return a dict with preview_url/title/artist.
    
    Returns None if no track found or preview URL not available.
    """
    token = _get_spotify_token()
    if not token:
        logger.warning("Spotify token not available, cannot search")
        return None
    
    logger.info(f"Spotify search for bhajan: '{query}'")
    search_result = await _search_spotify(query, token, limit=20)  # Try more tracks
    
    if not search_result:
        return None
    
    tracks = search_result.get("tracks", {}).get("items", [])
    if not tracks:
        logger.info(f"No tracks found on Spotify for '{query}'")
        return None
    
    logger.info(f"Found {len(tracks)} tracks on Spotify for '{query}'")
    
    # Try multiple search strategies
    # Strategy 1: Find first track with a preview URL
    for track in tracks:
        preview_url = track.get("preview_url")
        if preview_url:
            # Preview URLs are direct MP3 URLs that can be played
            track_name = track.get("name", query)
            artists = track.get("artists", [])
            artist_names = ", ".join([a.get("name", "") for a in artists])
            
            logger.info(f"Found Spotify track with preview: '{track_name}' by {artist_names} - {preview_url}")
            return {
                "name_en": track_name,
                "artist": artist_names,
                "preview_url": preview_url,
                "spotify_id": track.get("id"),
                "external_url": track.get("external_urls", {}).get("spotify"),
            }
    
    # Strategy 2: If no preview URL, try searching with different terms
    # Try without "bhajan devotional" suffix
    if "bhajan" in query.lower() or "devotional" in query.lower():
        normalized = normalize_query(query)
        logger.info(f"Retrying search without 'bhajan' keyword: '{normalized}'")
        search_result2 = await _search_spotify(normalized, token, limit=20)
        if search_result2:
            tracks2 = search_result2.get("tracks", {}).get("items", [])
            for track in tracks2:
                preview_url = track.get("preview_url")
                if preview_url:
                    track_name = track.get("name", query)
                    artists = track.get("artists", [])
                    artist_names = ", ".join([a.get("name", "") for a in artists])
                    logger.info(f"Found Spotify track with preview (retry): '{track_name}' by {artist_names}")
                    return {
                        "name_en": track_name,
                        "artist": artist_names,
                        "preview_url": preview_url,
                        "spotify_id": track.get("id"),
                        "external_url": track.get("external_urls", {}).get("spotify"),
                    }
    
    # Strategy 3: If no preview URL, return the first track with Spotify ID for SDK playback
    # This allows the frontend to use Spotify Web Playback SDK
    if tracks:
        track = tracks[0]  # Use the first/best match
        track_name = track.get("name", query)
        artists = track.get("artists", [])
        artist_names = ", ".join([a.get("name", "") for a in artists])
        spotify_id = track.get("id")
        external_url = track.get("external_urls", {}).get("spotify")
        
        if spotify_id:
            logger.info(f"Found Spotify track (no preview, using SDK): '{track_name}' by {artist_names} (ID: {spotify_id})")
            return {
                "name_en": track_name,
                "artist": artist_names,
                "preview_url": None,  # No preview available
                "spotify_id": spotify_id,
                "external_url": external_url,
            }
    
    # Log what we found for debugging
    found_tracks = [f"{t.get('name', 'N/A')} by {', '.join([a.get('name', '') for a in t.get('artists', [])])}" for t in tracks[:3]]
    logger.warning(f"No tracks found for '{query}'. Found tracks: {', '.join(found_tracks)}")
    return None


async def get_bhajan_url_async(bhajan_name: str, base_url: Optional[str] = None) -> Optional[str]:
    """
    Get the URL for a bhajan that can be used by the frontend.
    
    This is an async version that returns Spotify preview URLs (direct MP3 URLs).
    Note: Preview URLs are 30-second previews.
    
    Args:
        bhajan_name: The name of the bhajan to play
        base_url: Not used for Spotify (kept for compatibility)
    
    Returns:
        Preview URL string (direct MP3) or None if not found
    """
    result = await find_bhajan_by_name_async(bhajan_name)
    if not result:
        return None
    return result.get("preview_url")


async def list_available_bhajans_async() -> List[str]:
    """Return a few popular bhajan names for hints (best-effort)."""
    token = _get_spotify_token()
    if not token:
        return []
    
    # Search for popular bhajans
    search_result = await _search_spotify("bhajan krishna", token, limit=5)
    if not search_result:
        return []
    
    tracks = search_result.get("tracks", {}).get("items", [])
    names: List[str] = []
    for track in tracks:
        name = track.get("name")
        if name:
            names.append(name)
    return names


# Synchronous wrappers for backward compatibility
# These run the async functions in a new event loop
def _run_async(coro):
    """Run an async coroutine in a new event loop."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If loop is already running, we need to create a new one
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, coro)
                return future.result()
        else:
            return loop.run_until_complete(coro)
    except RuntimeError:
        # No event loop, create one
        return asyncio.run(coro)


def get_bhajan_url(bhajan_name: str, base_url: Optional[str] = None) -> Optional[str]:
    """
    Synchronous wrapper for get_bhajan_url_async.
    
    Kept for backward compatibility with existing code.
    """
    return _run_async(get_bhajan_url_async(bhajan_name, base_url))


def list_available_bhajans() -> List[str]:
    """
    Synchronous wrapper for list_available_bhajans_async.
    
    Kept for backward compatibility with existing code.
    """
    return _run_async(list_available_bhajans_async())
