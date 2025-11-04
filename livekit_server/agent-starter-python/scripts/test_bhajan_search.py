#!/usr/bin/env python3
"""
Temporary test script to validate Spotify bhajan search.

It exercises get_bhajan_url() for several queries and performs a
small ranged GET (first ~1KB) to verify the URL is reachable and audio-like.

Requires SPOTIFY_ACCESS_TOKEN environment variable to be set.

Usage:
  SPOTIFY_ACCESS_TOKEN=your_token python scripts/test_bhajan_search.py [query ...]
"""
from __future__ import annotations

import sys
from pathlib import Path
import urllib.request


def _add_src_to_path() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    src_dir = repo_root / "livekit_server" / "agent-starter-python" / "src"
    if str(src_dir) not in sys.path:
        sys.path.insert(0, str(src_dir))


def ranged_fetch_head(url: str) -> tuple[int, dict[str, str]]:
    """Fetch first chunk to validate reachability, returning status and headers."""
    req = urllib.request.Request(url, headers={
        "User-Agent": "SatsangBhajanTester/1.0",
        "Range": "bytes=0-1023",
    })
    with urllib.request.urlopen(req, timeout=15) as resp:
        status = resp.status
        headers = {k.lower(): v for k, v in resp.headers.items()}
        # Read minimal body to ensure stream starts
        _ = resp.read(64)
        return status, headers


def main() -> int:
    _add_src_to_path()
    try:
        from bhajan_search import get_bhajan_url
    except Exception as e:
        print(f"Import error: {e}")
        return 2

    queries = sys.argv[1:] or [
        "hare krishna",
        "om namah shivaya",
        "jai ganesh",
        "govind bolo",
    ]

    failures = 0
    for q in queries:
        print(f"\n=== Query: {q!r} ===")
        try:
            url = get_bhajan_url(q)
            print(f"URL: {url}")
            if not url:
                print("NOT FOUND")
                failures += 1
                continue
            status, headers = ranged_fetch_head(url)
            ctype = headers.get("content-type", "?")
            print(f"HTTP {status}; Content-Type: {ctype}")
            if ("audio" not in ctype) and (not url.lower().endswith((".mp3", ".ogg"))):
                print("WARN: URL doesn't look like an audio stream")
        except Exception as e:
            print(f"ERROR: {e}")
            failures += 1

    print(f"\nCompleted with {failures} failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())


