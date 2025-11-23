"""
Osho discourse search module backed by local JSON file.

Searches through Osho discourses metadata to find matching discourses based on:
- Title
- Topic
- Keywords
- Concepts
- Related topics
- Series name

Returns discourse data with MP3 URLs that can be played in the frontend.
"""
import logging
import json
import os
from pathlib import Path
from typing import Optional, Dict, List
import re

logger = logging.getLogger("osho_discourse_search")

# Path to the JSON file
_DISCOURSE_DATA_PATH = Path(__file__).resolve().parent / "osho_discourses_mp3"

# Cached discourse data
_discourse_data_cache: Optional[Dict] = None


def _load_discourse_data() -> Optional[Dict]:
    """Load discourse data from JSON file with caching."""
    global _discourse_data_cache
    
    if _discourse_data_cache is not None:
        return _discourse_data_cache
    
    try:
        if not _DISCOURSE_DATA_PATH.exists():
            logger.error(f"Discourse data file not found: {_DISCOURSE_DATA_PATH}")
            return None
        
        with open(_DISCOURSE_DATA_PATH, 'r', encoding='utf-8') as f:
            _discourse_data_cache = json.load(f)
            logger.info(f"✅ Loaded {_discourse_data_cache.get('totalDiscourses', 0)} discourses from {len(_discourse_data_cache.get('series', []))} series")
            return _discourse_data_cache
    except Exception as e:
        logger.error(f"Failed to load discourse data: {e}", exc_info=True)
        return None


def normalize_query(query: str) -> str:
    """Normalize search query by removing common words and converting to lowercase."""
    # Remove common Hindi/English words and connectors
    remove_words = [
        "ka", "ki", "ke", "ko", "kya", "bajao", "chal", "play", "sunao", 
        "discourse", "osho", "on", "about", "the", "a", "an", "is", "are",
        "vani", "pravachan", "talk", "speech"
    ]
    query_lower = query.lower().strip()
    words = query_lower.split()
    filtered_words = [w for w in words if w not in remove_words]
    return " ".join(filtered_words) if filtered_words else query_lower


def _calculate_relevance_score(discourse: Dict, series: Dict, query: str, normalized_query: str) -> float:
    """Calculate relevance score for a discourse based on query."""
    score = 0.0
    
    # Title match (highest weight)
    title = discourse.get("title", "").lower()
    if normalized_query in title:
        score += 10.0
    # Partial title match
    for word in normalized_query.split():
        if word in title:
            score += 3.0
    
    # Topic match
    topic = discourse.get("topic", "").lower()
    if normalized_query in topic:
        score += 8.0
    for word in normalized_query.split():
        if word in topic:
            score += 2.0
    
    # Keywords match
    keywords = series.get("keywords", [])
    for keyword in keywords:
        keyword_lower = keyword.lower()
        if normalized_query in keyword_lower:
            score += 5.0
        for word in normalized_query.split():
            if word in keyword_lower:
                score += 1.5
    
    # Concepts match
    concepts = series.get("concepts", [])
    for concept in concepts:
        concept_lower = concept.lower()
        if normalized_query in concept_lower:
            score += 4.0
        for word in normalized_query.split():
            if word in concept_lower:
                score += 1.0
    
    # Related topics match
    related_topics = series.get("relatedTopics", [])
    for topic in related_topics:
        topic_lower = topic.lower()
        if normalized_query in topic_lower:
            score += 3.0
        for word in normalized_query.split():
            if word in topic_lower:
                score += 0.8
    
    # Series name match
    series_name = series.get("name", "").lower()
    if normalized_query in series_name:
        score += 6.0
    for word in normalized_query.split():
        if word in series_name:
            score += 2.0
    
    # Theme/description match
    theme = series.get("theme", "").lower()
    description = series.get("description", "").lower()
    combined_text = f"{theme} {description}"
    if normalized_query in combined_text:
        score += 2.0
    for word in normalized_query.split():
        if word in combined_text:
            score += 0.5
    
    return score


async def search_osho_discourse_async(query: str, max_results: int = 5) -> List[Dict]:
    """
    Search for Osho discourses matching the query.
    
    Args:
        query: Search query (can be topic, title, keyword, etc.)
        max_results: Maximum number of results to return (default: 5)
    
    Returns:
        List of discourse dictionaries with mp3Url, title, topic, etc.
    """
    data = _load_discourse_data()
    if not data:
        logger.warning("Discourse data not loaded, cannot search")
        return []
    
    normalized_query = normalize_query(query)
    logger.info(f"Searching discourses for: '{query}' (normalized: '{normalized_query}')")
    
    results = []
    series_list = data.get("series", [])
    
    # Search through all discourses
    for series in series_list:
        discourses = series.get("discourses", [])
        for discourse in discourses:
            score = _calculate_relevance_score(discourse, series, query, normalized_query)
            
            if score > 0:
                mp3_url = discourse.get("mp3Url")
                if not mp3_url:
                    continue  # Skip discourses without MP3 URL
                
                result = {
                    "title": discourse.get("title", ""),
                    "topic": discourse.get("topic", ""),
                    "mp3Url": mp3_url,
                    "seriesName": series.get("name", ""),
                    "seriesId": series.get("id"),
                    "discourseNumber": discourse.get("number"),
                    "language": discourse.get("language", "Hindi"),
                    "duration": discourse.get("duration", "Unknown"),
                    "score": score,
                }
                results.append(result)
    
    # Sort by relevance score (highest first)
    results.sort(key=lambda x: x["score"], reverse=True)
    
    # Return top results
    top_results = results[:max_results]
    logger.info(f"Found {len(results)} matching discourses, returning top {len(top_results)}")
    
    if top_results:
        logger.info(f"Top result: '{top_results[0]['title']}' (score: {top_results[0]['score']:.2f})")
    
    return top_results


async def find_osho_discourse_by_name_async(query: str) -> Optional[Dict]:
    """
    Find the best-matching Osho discourse and return it.
    
    Returns the top result from search_osho_discourse_async, or None if not found.
    """
    results = await search_osho_discourse_async(query, max_results=1)
    if results:
        return results[0]
    return None


async def get_osho_discourse_url_async(query: str) -> Optional[str]:
    """
    Get the MP3 URL for a discourse matching the query.
    
    Returns the MP3 URL of the best-matching discourse, or None if not found.
    """
    result = await find_osho_discourse_by_name_async(query)
    if result:
        return result.get("mp3Url")
    return None


async def list_available_osho_discourses_async(limit: int = 20) -> List[str]:
    """Return a list of popular discourse titles for hints."""
    data = _load_discourse_data()
    if not data:
        return []
    
    titles = []
    series_list = data.get("series", [])
    
    # Get titles from first few series
    for series in series_list[:5]:
        discourses = series.get("discourses", [])
        for discourse in discourses[:limit // 5]:
            title = discourse.get("title", "")
            if title:
                titles.append(title)
            if len(titles) >= limit:
                break
        if len(titles) >= limit:
            break
    
    return titles


# Synchronous wrappers for backward compatibility
def _run_async(coro):
    """Run an async coroutine in a new event loop."""
    import asyncio
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


def search_osho_discourse(query: str, max_results: int = 5) -> List[Dict]:
    """Synchronous wrapper for search_osho_discourse_async."""
    return _run_async(search_osho_discourse_async(query, max_results))


def find_osho_discourse_by_name(query: str) -> Optional[Dict]:
    """Synchronous wrapper for find_osho_discourse_by_name_async."""
    return _run_async(find_osho_discourse_by_name_async(query))


def get_osho_discourse_url(query: str) -> Optional[str]:
    """Synchronous wrapper for get_osho_discourse_url_async."""
    return _run_async(get_osho_discourse_url_async(query))


def list_available_osho_discourses(limit: int = 20) -> List[str]:
    """Synchronous wrapper for list_available_osho_discourses_async."""
    return _run_async(list_available_osho_discourses_async(limit))

