#!/usr/bin/env python3
"""
In-memory cache for Astrology API responses.
Reduces API calls and improves response times.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging
import hashlib
import json

logger = logging.getLogger(__name__)


class AstrologyCache:
    """
    Simple in-memory cache for API responses.
    Uses TTL (time-to-live) for automatic expiration.
    """
    
    def __init__(self, ttl_minutes: int = 60):
        """
        Initialize cache.
        
        Args:
            ttl_minutes: Time-to-live in minutes (default: 1 hour)
        """
        self.cache: Dict[str, tuple[Any, datetime]] = {}
        self.ttl = timedelta(minutes=ttl_minutes)
        self.hits = 0
        self.misses = 0
    
    def _make_key(self, endpoint: str, **params) -> str:
        """
        Create cache key from endpoint and parameters.
        
        Args:
            endpoint: API endpoint
            **params: Request parameters
            
        Returns:
            Hash key for cache lookup
        """
        # Sort params for consistent hashing
        param_str = json.dumps(params, sort_keys=True)
        combined = f"{endpoint}:{param_str}"
        
        # Use hash for shorter keys
        return hashlib.md5(combined.encode()).hexdigest()
    
    def get(self, endpoint: str, **params) -> Optional[Any]:
        """
        Get cached response if available and not expired.
        
        Args:
            endpoint: API endpoint
            **params: Request parameters
            
        Returns:
            Cached data or None if not found/expired
        """
        key = self._make_key(endpoint, **params)
        
        if key in self.cache:
            data, timestamp = self.cache[key]
            
            # Check if expired
            if datetime.now() - timestamp < self.ttl:
                self.hits += 1
                logger.debug(f"Cache HIT for {endpoint}")
                return data
            else:
                # Expired, remove from cache
                del self.cache[key]
                logger.debug(f"Cache EXPIRED for {endpoint}")
        
        self.misses += 1
        logger.debug(f"Cache MISS for {endpoint}")
        return None
    
    def set(self, data: Any, endpoint: str, **params):
        """
        Store data in cache.
        
        Args:
            data: Data to cache
            endpoint: API endpoint
            **params: Request parameters
        """
        key = self._make_key(endpoint, **params)
        self.cache[key] = (data, datetime.now())
        logger.debug(f"Cached data for {endpoint}")
    
    def clear(self):
        """Clear all cached data."""
        self.cache.clear()
        self.hits = 0
        self.misses = 0
        logger.info("Cache cleared")
    
    def clear_expired(self):
        """Remove expired entries from cache."""
        now = datetime.now()
        expired_keys = [
            key for key, (_, timestamp) in self.cache.items()
            if now - timestamp >= self.ttl
        ]
        
        for key in expired_keys:
            del self.cache[key]
        
        if expired_keys:
            logger.info(f"Cleared {len(expired_keys)} expired cache entries")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Dict with hits, misses, size, hit_rate
        """
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100) if total > 0 else 0
        
        return {
            "hits": self.hits,
            "misses": self.misses,
            "size": len(self.cache),
            "hit_rate": f"{hit_rate:.1f}%"
        }
    
    def invalidate(self, endpoint: str, **params):
        """
        Invalidate specific cache entry.
        
        Args:
            endpoint: API endpoint
            **params: Request parameters
        """
        key = self._make_key(endpoint, **params)
        if key in self.cache:
            del self.cache[key]
            logger.debug(f"Invalidated cache for {endpoint}")


# Singleton instance
_cache_instance = None


def get_cache() -> AstrologyCache:
    """Get singleton cache instance."""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = AstrologyCache(ttl_minutes=60)
    return _cache_instance
