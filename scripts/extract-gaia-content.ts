#!/usr/bin/env tsx
/**
 * Gaia Content Extractor
 * 
 * Extracts content and video metadata from Gaia.com share URLs.
 * Uses Puppeteer for web scraping and optionally OpenAI for data structuring.
 * 
 * Usage:
 *   npx tsx scripts/extract-gaia-content.ts <gaia-url>
 * 
 * Example:
 *   npx tsx scripts/extract-gaia-content.ts "https://www.gaia.com/share/video/incoming-3iatlas-draco-mothership?type=video&contentId=245534"
 * 
 * Environment Variables:
 *   OPENAI_API_KEY - Optional, for AI-powered content structuring
 *   HEADLESS - Set to 'false' to see browser (default: 'true')
 */

import puppeteer, { type Browser, type Page } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ExtractedData {
  url: string;
  title?: string;
  description?: string;
  series?: string;
  episode?: string;
  duration?: string;
  rating?: string;
  host?: string;
  featured?: string;
  audioLanguages?: string[];
  subtitles?: string[];
  fullText?: string;
  videoUrls?: string[];
  thumbnailUrl?: string;
  extractedAt: string;
  metadata?: Record<string, unknown>;
}

async function extractWithPuppeteer(url: string, headless: boolean = true): Promise<ExtractedData> {
  console.log(`🌐 Launching browser (headless: ${headless})...`);
  const browser: Browser = await puppeteer.launch({
    headless: headless ? 'new' : false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page: Page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    console.log(`📥 Loading page: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for content to load
    await page.waitForTimeout(3000);

    console.log('🔍 Extracting content...');

    // Extract structured data
    const data: ExtractedData = {
      url,
      extractedAt: new Date().toISOString(),
    };

    // Extract title
    try {
      const titleElement = await page.$('h1');
      if (titleElement) {
        data.title = await page.evaluate((el) => el.textContent?.trim(), titleElement);
      }
    } catch (e) {
      console.warn('⚠️  Could not extract title:', e);
    }

    // Extract description/about section
    try {
      const aboutSection = await page.$('[class*="about"], [id*="about"], section');
      if (aboutSection) {
        data.description = await page.evaluate((el) => {
          const text = el.textContent?.trim();
          return text && text.length > 50 ? text : null;
        }, aboutSection);
      }

      // Also try meta description
      if (!data.description) {
        const metaDesc = await page.$('meta[name="description"]');
        if (metaDesc) {
          data.description = await page.evaluate((el) => el.getAttribute('content'), metaDesc);
        }
      }
    } catch (e) {
      console.warn('⚠️  Could not extract description:', e);
    }

    // Extract series/episode info
    try {
      const seriesText = await page.evaluate(() => {
        const text = document.body.innerText;
        const match = text.match(/Cosmic Disclosure[\s\S]*?S(\d+):\s*E(\d+)/i);
        if (match) {
          return { series: `Season ${match[1]}`, episode: `Episode ${match[2]}` };
        }
        return null;
      });
      if (seriesText) {
        data.series = seriesText.series;
        data.episode = seriesText.episode;
      }
    } catch (e) {
      console.warn('⚠️  Could not extract series info:', e);
    }

    // Extract duration
    try {
      const durationMatch = await page.evaluate(() => {
        const text = document.body.innerText;
        const match = text.match(/(\d+)\s*mins?/i);
        return match ? match[0] : null;
      });
      if (durationMatch) {
        data.duration = durationMatch;
      }
    } catch (e) {
      console.warn('⚠️  Could not extract duration:', e);
    }

    // Extract rating
    try {
      const ratingMatch = await page.evaluate(() => {
        const text = document.body.innerText;
        const match = text.match(/TV-([A-Z0-9]+)/i);
        return match ? match[0] : null;
      });
      if (ratingMatch) {
        data.rating = ratingMatch;
      }
    } catch (e) {
      console.warn('⚠️  Could not extract rating:', e);
    }

    // Extract host/featured
    try {
      const hostMatch = await page.evaluate(() => {
        const text = document.body.innerText;
        const hostMatch = text.match(/Host:\s*([^\n]+)/i);
        const featuredMatch = text.match(/Featuring:\s*([^\n]+)/i);
        return {
          host: hostMatch ? hostMatch[1].trim() : null,
          featured: featuredMatch ? featuredMatch[1].trim() : null,
        };
      });
      if (hostMatch.host) data.host = hostMatch.host;
      if (hostMatch.featured) data.featured = hostMatch.featured;
    } catch (e) {
      console.warn('⚠️  Could not extract host/featured:', e);
    }

    // Extract audio languages and subtitles
    try {
      const langInfo = await page.evaluate(() => {
        const text = document.body.innerText;
        const audioMatch = text.match(/Audio Languages:\s*([^\n]+)/i);
        const subtitleMatch = text.match(/Subtitles:\s*([^\n]+)/i);
        return {
          audio: audioMatch ? audioMatch[1].trim().split(',').map((s) => s.trim()) : [],
          subtitles: subtitleMatch ? subtitleMatch[1].trim().split(',').map((s) => s.trim()) : [],
        };
      });
      if (langInfo.audio.length > 0) data.audioLanguages = langInfo.audio;
      if (langInfo.subtitles.length > 0) data.subtitles = langInfo.subtitles;
    } catch (e) {
      console.warn('⚠️  Could not extract language info:', e);
    }

    // Extract full page text (for AI processing)
    try {
      data.fullText = await page.evaluate(() => document.body.innerText);
    } catch (e) {
      console.warn('⚠️  Could not extract full text:', e);
    }

    // Extract video URLs (may be protected/DRM)
    try {
      const videoUrls = await page.evaluate(() => {
        const urls: string[] = [];
        
        // Check for video elements
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach((video) => {
          if (video.src) urls.push(video.src);
          if (video.currentSrc) urls.push(video.currentSrc);
        });

        // Check for source elements
        const sourceElements = document.querySelectorAll('video source');
        sourceElements.forEach((source) => {
          if (source.src) urls.push(source.src);
        });

        // Check network requests (if available)
        // Note: This won't capture all video URLs due to DRM/protection
        
        return [...new Set(urls)];
      });
      
      if (videoUrls.length > 0) {
        data.videoUrls = videoUrls;
        console.log(`📹 Found ${videoUrls.length} potential video URL(s)`);
      } else {
        console.log('⚠️  No direct video URLs found (likely DRM-protected)');
      }
    } catch (e) {
      console.warn('⚠️  Could not extract video URLs:', e);
    }

    // Extract thumbnail
    try {
      const thumbnail = await page.evaluate(() => {
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) {
          return ogImage.getAttribute('content');
        }
        const img = document.querySelector('img[src*="thumbnail"], img[src*="poster"]');
        if (img) {
          return img.getAttribute('src');
        }
        return null;
      });
      if (thumbnail) {
        data.thumbnailUrl = thumbnail;
      }
    } catch (e) {
      console.warn('⚠️  Could not extract thumbnail:', e);
    }

    // Extract additional metadata from page
    try {
      data.metadata = await page.evaluate(() => {
        const meta: Record<string, string> = {};
        const metaTags = document.querySelectorAll('meta');
        metaTags.forEach((tag) => {
          const name = tag.getAttribute('name') || tag.getAttribute('property');
          const content = tag.getAttribute('content');
          if (name && content) {
            meta[name] = content;
          }
        });
        return meta;
      });
    } catch (e) {
      console.warn('⚠️  Could not extract metadata:', e);
    }

    // Take a screenshot for reference
    const screenshotPath = path.join(process.cwd(), 'scripts', 'gaia-extract-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    return data;
  } finally {
    await browser.close();
  }
}

async function structureWithOpenAI(data: ExtractedData): Promise<ExtractedData> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('ℹ️  OPENAI_API_KEY not set, skipping AI structuring');
    return data;
  }

  console.log('🤖 Structuring data with OpenAI...');

  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey });

    const prompt = `Extract and structure the following video content information into a clean JSON format.
    
    Raw text content:
    ${data.fullText?.substring(0, 4000) || 'No content available'}

    Please extract:
    - Title
    - Description (2-3 sentences)
    - Series name and episode number
    - Duration
    - Key topics/themes
    - Host and featured guests
    - Main points discussed

    Return a JSON object with these fields.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts and structures video metadata from web content.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const structured = JSON.parse(completion.choices[0]?.message?.content || '{}');
    
    // Merge structured data
    return {
      ...data,
      ...structured,
      aiStructured: true,
    };
  } catch (error) {
    console.error('❌ OpenAI structuring failed:', error);
    return data;
  }
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('❌ Please provide a Gaia URL as an argument');
    console.log('Usage: npx tsx scripts/extract-gaia-content.ts <gaia-url>');
    process.exit(1);
  }

  if (!url.includes('gaia.com')) {
    console.warn('⚠️  Warning: URL does not appear to be from gaia.com');
  }

  const headless = process.env.HEADLESS !== 'false';

  try {
    // Extract with Puppeteer
    let extractedData = await extractWithPuppeteer(url, headless);

    // Optionally structure with OpenAI
    if (process.env.OPENAI_API_KEY) {
      extractedData = await structureWithOpenAI(extractedData);
    }

    // Save to JSON file
    const outputPath = path.join(process.cwd(), 'scripts', 'gaia-extracted-data.json');
    await fs.writeFile(outputPath, JSON.stringify(extractedData, null, 2), 'utf-8');

    console.log('\n✅ Extraction complete!');
    console.log(`📄 Data saved to: ${outputPath}`);
    console.log('\n📊 Extracted Data Summary:');
    console.log(`   Title: ${extractedData.title || 'N/A'}`);
    console.log(`   Series: ${extractedData.series || 'N/A'}`);
    console.log(`   Duration: ${extractedData.duration || 'N/A'}`);
    console.log(`   Video URLs: ${extractedData.videoUrls?.length || 0} found`);
    console.log(`   Thumbnail: ${extractedData.thumbnailUrl ? 'Yes' : 'No'}`);

    if (!extractedData.videoUrls || extractedData.videoUrls.length === 0) {
      console.log('\n⚠️  Note: Video URLs may be DRM-protected or require authentication.');
      console.log('   Gaia uses protected streaming, so direct video download may not be possible.');
    }
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

