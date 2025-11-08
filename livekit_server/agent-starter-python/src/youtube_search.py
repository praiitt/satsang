"""
YouTube search module for finding bhajan videos.

Searches YouTube API for devotional videos and returns video IDs that can be played
in the frontend using YouTube IFrame Player API.
"""
import logging
import os
from typing import Optional, Dict, List
import aiohttp
import asyncio

logger = logging.getLogger("youtube_search")

# YouTube Data API endpoint
YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"


async def _get_youtube_api_key() -> Optional[str]:
    """Get YouTube API key from environment."""
    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key:
        logger.warning("YOUTUBE_API_KEY not set in environment")
    return api_key


async def find_youtube_video_async(query: str) -> Optional[Dict]:
    """
    Find best-matching YouTube video and return a dict with video_id/title/channel.
    
    Args:
        query: Search query string (e.g., "hare krishna bhajan")
    
    Returns:
        Dict with keys: video_id, title, channel_title, or None if not found
    """
    api_key = await _get_youtube_api_key()
    if not api_key:
        logger.warning("YouTube API key not available, cannot search")
        return None
    
    # Add "bhajan" keyword if not present for better results
    search_query = query.lower()
    if "bhajan" not in search_query and "devotional" not in search_query:
        search_query = f"{search_query} bhajan"
    
    url = f"{YOUTUBE_API_BASE}/search"
    params = {
        "part": "snippet",
        "q": search_query,
        "type": "video",
        "maxResults": 5,
        "key": api_key,
        "regionCode": "IN",  # Prioritize Indian content
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                url, params=params, timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 401:
                    logger.error("YouTube API authentication failed - check API key")
                    return None
                if response.status == 403:
                    logger.error("YouTube API quota exceeded or access forbidden")
                    return None
                if response.status == 429:
                    logger.warning("YouTube API rate limit hit")
                    return None
                response.raise_for_status()
                data = await response.json()
                
                items = data.get("items", [])
                if not items:
                    logger.info(f"No YouTube videos found for '{query}'")
                    return None
                
                # Return the first (best match) video
                video = items[0]
                video_id = video.get("id", {}).get("videoId")
                snippet = video.get("snippet", {})
                
                if not video_id:
                    logger.warning(f"No video ID found in YouTube search result for '{query}'")
                    return None
                
                logger.info(
                    f"Found YouTube video: '{snippet.get('title')}' by {snippet.get('channelTitle')} - {video_id}"
                )
                return {
                    "video_id": video_id,
                    "title": snippet.get("title", query),
                    "channel_title": snippet.get("channelTitle", ""),
                    "description": snippet.get("description", ""),
                    "thumbnail": snippet.get("thumbnails", {}).get("default", {}).get("url"),
                }
    except asyncio.TimeoutError:
        logger.error(f"Timeout searching YouTube for '{query}'")
        return None
    except aiohttp.ClientError as e:
        logger.error(f"HTTP error searching YouTube for '{query}': {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error searching YouTube for '{query}': {e}")
        return None


async def find_vani_videos_async(topic: str, max_results: int = 5) -> List[Dict]:
    """
    Search YouTube for spiritual discourses/pravachans on a given topic.

    Returns a list of dicts with video_id/title/channel/thumbnail/url.
    """
    api_key = await _get_youtube_api_key()
    if not api_key:
        return []

    # Bias query toward discourses/pravachans
    query = (
        f"{topic} (pravachan OR satsang OR discourse OR lecture OR updesh OR katha OR pravachan hindi)"
    )

    url = f"{YOUTUBE_API_BASE}/search"
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": max(1, min(max_results, 10)),
        "key": api_key,
        "regionCode": "IN",
        # Prefer longer talks; duration filter requires videos.list, so we will filter heuristically later if needed
        # We still use search endpoint for relevance; clients can refine selection
    }

    results: List[Dict] = []
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                url, params=params, timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status in (401, 403, 429):
                    logger.warning(
                        f"YouTube API returned {response.status} for vani search topic='{topic}'"
                    )
                    return []
                response.raise_for_status()
                data = await response.json()
                items = data.get("items", [])
                for item in items:
                    vid = item.get("id", {}).get("videoId")
                    sn = item.get("snippet", {})
                    if not vid:
                        continue
                    results.append(
                        {
                            "video_id": vid,
                            "title": sn.get("title", topic),
                            "channel_title": sn.get("channelTitle", ""),
                            "description": sn.get("description", ""),
                            "thumbnail": sn.get("thumbnails", {})
                            .get("medium", {})
                            .get("url")
                            or sn.get("thumbnails", {}).get("default", {}).get("url"),
                            "url": f"https://www.youtube.com/watch?v={vid}",
                        }
                    )
        logger.info(
            f"Vani search: found {len(results)} results for topic='{topic}'"
        )
        return results
    except asyncio.TimeoutError:
        logger.warning(f"Timeout in vani search for topic='{topic}'")
        return []
    except aiohttp.ClientError as e:
        logger.error(f"HTTP error in vani search for topic='{topic}': {e}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error in vani search: {e}")
        return []
