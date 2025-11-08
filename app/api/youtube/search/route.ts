import { NextResponse } from 'next/server';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    if (!YOUTUBE_API_KEY) {
      return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const maxResults = searchParams.get('maxResults') || '5';

    if (!query) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    // Search YouTube for videos
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[YouTube Search] API error:', errorData);
      return NextResponse.json(
        { error: errorData.error?.message || 'YouTube API error' },
        { status: response.status }
      );
    }

    const data = await response.json();

    const videos = (data.items || []).map(
      (item: {
        id: { videoId: string };
        snippet: {
          title: string;
          description: string;
          thumbnails?: { default?: { url: string }; medium?: { url: string } };
          channelTitle: string;
          publishedAt: string;
        };
      }) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails?.default?.url || item.snippet.thumbnails?.medium?.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
      })
    );

    return NextResponse.json({ videos });
  } catch (error) {
    console.error('[YouTube Search] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
