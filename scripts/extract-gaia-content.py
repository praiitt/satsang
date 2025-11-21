#!/usr/bin/env python3
"""
Gaia Content Extractor (Python Version)

Extracts content and video metadata from Gaia.com share URLs.
Uses Playwright for web scraping and optionally OpenAI for data structuring.

Usage:
    python scripts/extract-gaia-content.py <gaia-url>

Example:
    python scripts/extract-gaia-content.py "https://www.gaia.com/share/video/incoming-3iatlas-draco-mothership?type=video&contentId=245534"

Environment Variables:
    OPENAI_API_KEY - Optional, for AI-powered content structuring
    HEADLESS - Set to 'false' to see browser (default: 'true')
"""

import asyncio
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from playwright.async_api import async_playwright, Browser, Page
except ImportError:
    print("❌ Playwright not installed. Install with: pip install playwright")
    print("   Then run: playwright install chromium")
    sys.exit(1)


async def extract_with_playwright(url: str, headless: bool = True) -> Dict[str, Any]:
    """Extract content from Gaia URL using Playwright."""
    print(f"🌐 Launching browser (headless: {headless})...")
    
    async with async_playwright() as p:
        browser: Browser = await p.chromium.launch(headless=headless)
        
        try:
            page: Page = await browser.new_page()
            
            # Set realistic user agent
            await page.set_extra_http_headers({
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            })
            
            print(f"📥 Loading page: {url}")
            await page.goto(url, wait_until='networkidle', timeout=30000)
            
            # Wait for content to load
            await page.wait_for_timeout(3000)
            
            print("🔍 Extracting content...")
            
            data: Dict[str, Any] = {
                'url': url,
                'extractedAt': datetime.now().isoformat(),
            }
            
            # Extract title
            try:
                title_element = await page.query_selector('h1')
                if title_element:
                    data['title'] = await title_element.inner_text()
                    data['title'] = data['title'].strip() if data['title'] else None
            except Exception as e:
                print(f"⚠️  Could not extract title: {e}")
            
            # Extract description
            try:
                # Try multiple selectors
                selectors = [
                    '[class*="about"]',
                    '[id*="about"]',
                    'section',
                    'meta[name="description"]',
                ]
                
                for selector in selectors:
                    element = await page.query_selector(selector)
                    if element:
                        if selector.startswith('meta'):
                            description = await element.get_attribute('content')
                        else:
                            description = await element.inner_text()
                        
                        if description and len(description.strip()) > 50:
                            data['description'] = description.strip()
                            break
            except Exception as e:
                print(f"⚠️  Could not extract description: {e}")
            
            # Extract series/episode info
            try:
                body_text = await page.inner_text('body')
                series_match = re.search(r'Cosmic Disclosure[\s\S]*?S(\d+):\s*E(\d+)', body_text, re.IGNORECASE)
                if series_match:
                    data['series'] = f"Season {series_match.group(1)}"
                    data['episode'] = f"Episode {series_match.group(2)}"
            except Exception as e:
                print(f"⚠️  Could not extract series info: {e}")
            
            # Extract duration
            try:
                body_text = await page.inner_text('body')
                duration_match = re.search(r'(\d+)\s*mins?', body_text, re.IGNORECASE)
                if duration_match:
                    data['duration'] = duration_match.group(0)
            except Exception as e:
                print(f"⚠️  Could not extract duration: {e}")
            
            # Extract rating
            try:
                body_text = await page.inner_text('body')
                rating_match = re.search(r'TV-([A-Z0-9]+)', body_text, re.IGNORECASE)
                if rating_match:
                    data['rating'] = rating_match.group(0)
            except Exception as e:
                print(f"⚠️  Could not extract rating: {e}")
            
            # Extract host/featured
            try:
                body_text = await page.inner_text('body')
                host_match = re.search(r'Host:\s*([^\n]+)', body_text, re.IGNORECASE)
                featured_match = re.search(r'Featuring:\s*([^\n]+)', body_text, re.IGNORECASE)
                
                if host_match:
                    data['host'] = host_match.group(1).strip()
                if featured_match:
                    data['featured'] = featured_match.group(1).strip()
            except Exception as e:
                print(f"⚠️  Could not extract host/featured: {e}")
            
            # Extract audio languages and subtitles
            try:
                body_text = await page.inner_text('body')
                audio_match = re.search(r'Audio Languages:\s*([^\n]+)', body_text, re.IGNORECASE)
                subtitle_match = re.search(r'Subtitles:\s*([^\n]+)', body_text, re.IGNORECASE)
                
                if audio_match:
                    data['audioLanguages'] = [lang.strip() for lang in audio_match.group(1).split(',')]
                if subtitle_match:
                    data['subtitles'] = [sub.strip() for sub in subtitle_match.group(1).split(',')]
            except Exception as e:
                print(f"⚠️  Could not extract language info: {e}")
            
            # Extract full page text
            try:
                data['fullText'] = await page.inner_text('body')
            except Exception as e:
                print(f"⚠️  Could not extract full text: {e}")
            
            # Extract video URLs (may be protected/DRM)
            try:
                video_urls: List[str] = []
                
                # Check for video elements
                video_elements = await page.query_selector_all('video')
                for video in video_elements:
                    src = await video.get_attribute('src')
                    if src:
                        video_urls.append(src)
                    current_src = await video.evaluate('el => el.currentSrc')
                    if current_src and current_src not in video_urls:
                        video_urls.append(current_src)
                
                # Check for source elements
                source_elements = await page.query_selector_all('video source')
                for source in source_elements:
                    src = await source.get_attribute('src')
                    if src and src not in video_urls:
                        video_urls.append(src)
                
                if video_urls:
                    data['videoUrls'] = list(set(video_urls))
                    print(f"📹 Found {len(data['videoUrls'])} potential video URL(s)")
                else:
                    print("⚠️  No direct video URLs found (likely DRM-protected)")
            except Exception as e:
                print(f"⚠️  Could not extract video URLs: {e}")
            
            # Extract thumbnail
            try:
                og_image = await page.query_selector('meta[property="og:image"]')
                if og_image:
                    thumbnail = await og_image.get_attribute('content')
                    if thumbnail:
                        data['thumbnailUrl'] = thumbnail
                else:
                    img = await page.query_selector('img[src*="thumbnail"], img[src*="poster"]')
                    if img:
                        thumbnail = await img.get_attribute('src')
                        if thumbnail:
                            data['thumbnailUrl'] = thumbnail
            except Exception as e:
                print(f"⚠️  Could not extract thumbnail: {e}")
            
            # Extract metadata
            try:
                metadata: Dict[str, str] = {}
                meta_tags = await page.query_selector_all('meta')
                for tag in meta_tags:
                    name = await tag.get_attribute('name') or await tag.get_attribute('property')
                    content = await tag.get_attribute('content')
                    if name and content:
                        metadata[name] = content
                data['metadata'] = metadata
            except Exception as e:
                print(f"⚠️  Could not extract metadata: {e}")
            
            # Take screenshot
            screenshot_path = Path(__file__).parent / 'gaia-extract-screenshot.png'
            await page.screenshot(path=str(screenshot_path), full_page=True)
            print(f"📸 Screenshot saved: {screenshot_path}")
            
            return data
            
        finally:
            await browser.close()


async def structure_with_openai(data: Dict[str, Any]) -> Dict[str, Any]:
    """Structure extracted data using OpenAI."""
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("ℹ️  OPENAI_API_KEY not set, skipping AI structuring")
        return data
    
    print("🤖 Structuring data with OpenAI...")
    
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key=api_key)
        
        prompt = f"""Extract and structure the following video content information into a clean JSON format.

Raw text content:
{data.get('fullText', 'No content available')[:4000]}

Please extract:
- Title
- Description (2-3 sentences)
- Series name and episode number
- Duration
- Key topics/themes
- Host and featured guests
- Main points discussed

Return a JSON object with these fields."""
        
        response = client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {
                    'role': 'system',
                    'content': 'You are a helpful assistant that extracts and structures video metadata from web content.',
                },
                {'role': 'user', 'content': prompt},
            ],
            response_format={'type': 'json_object'},
        )
        
        structured = json.loads(response.choices[0].message.content or '{}')
        
        # Merge structured data
        return {**data, **structured, 'aiStructured': True}
        
    except ImportError:
        print("⚠️  OpenAI library not installed. Install with: pip install openai")
        return data
    except Exception as error:
        print(f"❌ OpenAI structuring failed: {error}")
        return data


async def main():
    """Main function."""
    if len(sys.argv) < 2:
        print("❌ Please provide a Gaia URL as an argument")
        print("Usage: python scripts/extract-gaia-content.py <gaia-url>")
        sys.exit(1)
    
    url = sys.argv[1]
    
    if 'gaia.com' not in url:
        print("⚠️  Warning: URL does not appear to be from gaia.com")
    
    headless = os.getenv('HEADLESS', 'true').lower() != 'false'
    
    try:
        # Extract with Playwright
        extracted_data = await extract_with_playwright(url, headless)
        
        # Optionally structure with OpenAI
        if os.getenv('OPENAI_API_KEY'):
            extracted_data = await structure_with_openai(extracted_data)
        
        # Save to JSON file
        output_path = Path(__file__).parent / 'gaia-extracted-data.json'
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(extracted_data, f, indent=2, ensure_ascii=False)
        
        print("\n✅ Extraction complete!")
        print(f"📄 Data saved to: {output_path}")
        print("\n📊 Extracted Data Summary:")
        print(f"   Title: {extracted_data.get('title', 'N/A')}")
        print(f"   Series: {extracted_data.get('series', 'N/A')}")
        print(f"   Duration: {extracted_data.get('duration', 'N/A')}")
        print(f"   Video URLs: {len(extracted_data.get('videoUrls', []))} found")
        print(f"   Thumbnail: {'Yes' if extracted_data.get('thumbnailUrl') else 'No'}")
        
        if not extracted_data.get('videoUrls'):
            print("\n⚠️  Note: Video URLs may be DRM-protected or require authentication.")
            print("   Gaia uses protected streaming, so direct video download may not be possible.")
            
    except Exception as error:
        print(f"❌ Extraction failed: {error}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())

