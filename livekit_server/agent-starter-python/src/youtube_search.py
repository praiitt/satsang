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
    logger.info(f"🔍 [YouTubeSearch] Starting search for: '{query}'")
    api_key = await _get_youtube_api_key()
    if not api_key:
        logger.error("❌ [YouTubeSearch] YouTube API key not available, cannot search")
        return None
    
    logger.info(f"✅ [YouTubeSearch] API key found (length: {len(api_key)})")
    
    # Add "bhajan" keyword if not present for better results
    search_query = query.lower()
    if "bhajan" not in search_query and "devotional" not in search_query:
        search_query = f"{search_query} bhajan"
    
    logger.info(f"🔍 [YouTubeSearch] Search query: '{search_query}'")
    
    url = f"{YOUTUBE_API_BASE}/search"
    params = {
        "part": "snippet",
        "q": search_query,
        "type": "video",
        "maxResults": 5,
        "key": api_key,
        "regionCode": "IN",  # Prioritize Indian content
    }
    
    logger.info(f"🔍 [YouTubeSearch] Making API request to: {url}")
    logger.info(f"🔍 [YouTubeSearch] Params: part={params['part']}, q={params['q']}, type={params['type']}, maxResults={params['maxResults']}, regionCode={params['regionCode']}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                url, params=params, timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                logger.info(f"🔍 [YouTubeSearch] Response status: {response.status}")
                
                if response.status == 401:
                    error_text = await response.text()
                    logger.error(f"❌ [YouTubeSearch] YouTube API authentication failed - check API key. Response: {error_text[:200]}")
                    return None
                if response.status == 403:
                    error_text = await response.text()
                    logger.error(f"❌ [YouTubeSearch] YouTube API quota exceeded or access forbidden. Response: {error_text[:200]}")
                    return None
                if response.status == 429:
                    error_text = await response.text()
                    logger.warning(f"⚠️ [YouTubeSearch] YouTube API rate limit hit. Response: {error_text[:200]}")
                    return None
                
                response.raise_for_status()
                data = await response.json()
                
                logger.info(f"🔍 [YouTubeSearch] API response received, checking items...")
                
                items = data.get("items", [])
                logger.info(f"🔍 [YouTubeSearch] Found {len(items)} items in response")
                
                if not items:
                    logger.warning(f"⚠️ [YouTubeSearch] No YouTube videos found for '{query}' (empty items array)")
                    # Log the full response for debugging
                    logger.debug(f"🔍 [YouTubeSearch] Full API response: {data}")
                    return None
                
                # Return the first (best match) video
                video = items[0]
                video_id = video.get("id", {}).get("videoId")
                snippet = video.get("snippet", {})
                
                logger.info(f"🔍 [YouTubeSearch] First video item: id={video.get('id')}, snippet keys={list(snippet.keys()) if snippet else 'None'}")
                
                if not video_id:
                    logger.error(f"❌ [YouTubeSearch] No video ID found in YouTube search result for '{query}'. Video object: {video}")
                    return None
                
                logger.info(
                    f"✅ [YouTubeSearch] Found YouTube video: '{snippet.get('title')}' by {snippet.get('channelTitle')} - {video_id}"
                )
                return {
                    "video_id": video_id,
                    "title": snippet.get("title", query),
                    "channel_title": snippet.get("channelTitle", ""),
                    "description": snippet.get("description", ""),
                    "thumbnail": snippet.get("thumbnails", {}).get("default", {}).get("url"),
                }
    except asyncio.TimeoutError:
        logger.error(f"❌ [YouTubeSearch] Timeout searching YouTube for '{query}'")
        return None
    except aiohttp.ClientError as e:
        logger.error(f"❌ [YouTubeSearch] HTTP error searching YouTube for '{query}': {e}", exc_info=True)
        return None
    except Exception as e:
        logger.error(f"❌ [YouTubeSearch] Unexpected error searching YouTube for '{query}': {e}", exc_info=True)
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
