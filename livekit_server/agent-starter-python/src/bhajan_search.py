"""
Bhajan search module for finding and serving devotional songs.
"""
import logging
import os
from pathlib import Path
from typing import Optional, Dict, List
import json

logger = logging.getLogger("bhajan_search")

# Base path for bhajans directory - handle both package and direct execution
try:
    # When run as a package (relative import)
    _BHAJAN_BASE_PATH = Path(__file__).resolve().parent.parent / "bhajans"
except:
    # Fallback for direct execution
    _BHAJAN_BASE_PATH = Path(__file__).resolve().parent.parent / "bhajans"
_BHAJAN_INDEX_FILE = _BHAJAN_BASE_PATH / "bhajan_index.json"


def normalize_query(query: str) -> str:
    """Normalize search query by removing common words and converting to lowercase."""
    # Remove common Hindi words and connectors
    remove_words = ["ka", "ki", "ke", "ko", "kya", "bajao", "chal", "play", "sunao"]
    query_lower = query.lower().strip()
    words = query_lower.split()
    filtered_words = [w for w in words if w not in remove_words]
    return " ".join(filtered_words) if filtered_words else query_lower


def load_bhajan_index() -> Dict:
    """Load the bhajan index JSON file."""
    if not _BHAJAN_INDEX_FILE.exists():
        logger.warning(f"Bhajan index not found at {_BHAJAN_INDEX_FILE}")
        return {}
    
    try:
        with open(_BHAJAN_INDEX_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading bhajan index: {e}")
        return {}


def find_bhajan_by_name(query: str) -> Optional[Dict]:
    """
    Search for a bhajan by name.
    
    Args:
        query: The bhajan name to search for (can be in Hindi Romanized or English)
    
    Returns:
        Dictionary with bhajan info including 'file_path' and 'url', or None if not found
    """
    normalized_query = normalize_query(query)
    logger.info(f"Searching for bhajan: '{query}' (normalized: '{normalized_query}')")
    
    # Load index
    index = load_bhajan_index()
    bhajans = index.get("bhajans", [])
    
    if not bhajans:
        logger.warning("No bhajans found in index. Please create bhajan_index.json")
        return None
    
    # Simple fuzzy matching - search in all fields
    query_lower = normalized_query.lower()
    
    for bhajan in bhajans:
        # Check name (English and Hindi)
        name_en = bhajan.get("name_en", "").lower()
        name_hi = bhajan.get("name_hi", "").lower()
        # Check aliases
        aliases = [a.lower() for a in bhajan.get("aliases", [])]
        # Check file path
        file_path = bhajan.get("file_path", "").lower()
        
        # Check if query matches any field
        if (query_lower in name_en or 
            query_lower in name_hi or
            any(query_lower in alias for alias in aliases) or
            query_lower in file_path):
            logger.info(f"Found bhajan: {bhajan.get('name_en')}")
            return bhajan
    
    # If no exact match, try partial matching
    for bhajan in bhajans:
        name_en = bhajan.get("name_en", "").lower()
        name_hi = bhajan.get("name_hi", "").lower()
        aliases = [a.lower() for a in bhajan.get("aliases", [])]
        
        # Check if any word from query matches
        query_words = query_lower.split()
        for word in query_words:
            if (word in name_en or 
                word in name_hi or
                any(word in alias for alias in aliases)):
                logger.info(f"Found bhajan (partial match): {bhajan.get('name_en')}")
                return bhajan
    
    logger.warning(f"No bhajan found for query: '{query}'")
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
    bhajan = find_bhajan_by_name(bhajan_name)
    
    if not bhajan:
        return None
    
    file_path = bhajan.get("file_path")
    if not file_path:
        logger.error(f"Bhajan found but no file_path: {bhajan}")
        return None
    
    # Verify file exists
    full_path = _BHAJAN_BASE_PATH / file_path
    if not full_path.exists():
        logger.error(f"Bhajan file not found: {full_path}")
        return None
    
    # Construct URL
    # URL format: /api/bhajans/{file_path}
    # Replace backslashes with forward slashes for URL
    url_path = file_path.replace("\\", "/")
    
    if base_url:
        # Full URL
        return f"{base_url.rstrip('/')}/api/bhajans/{url_path}"
    else:
        # Relative URL
        return f"/api/bhajans/{url_path}"


def list_available_bhajans() -> List[str]:
    """Get a list of all available bhajan names."""
    index = load_bhajan_index()
    bhajans = index.get("bhajans", [])
    return [bhajan.get("name_en", "Unknown") for bhajan in bhajans]

