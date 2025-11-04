import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Don't cache bhajan files
export const revalidate = 0;

/**
 * API route to serve bhajan MP3 files
 * 
 * Route: /api/bhajans/{category}/{filename}.mp3
 * Example: /api/bhajans/krishna/hare-krishna-hare-rama.mp3
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Get the file path from the route parameters
    const pathSegments = params.path;
    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse('Bhajan path not provided', { status: 400 });
    }

    // Reconstruct the file path
    const filePath = pathSegments.join('/');
    
    // Security: Prevent directory traversal attacks
    if (filePath.includes('..') || filePath.startsWith('/')) {
      return new NextResponse('Invalid file path', { status: 400 });
    }

    // Construct the full path to the bhajan file
    // Assuming bhajans are stored in the agent-starter-python directory
    // Adjust this path based on your actual deployment structure
    const bhajanBasePath = process.env.BHAJAN_BASE_PATH || 
      join(process.cwd(), '..', 'livekit_server', 'agent-starter-python', 'bhajans');
    
    const fullPath = join(bhajanBasePath, filePath);

    // Verify file exists
    if (!existsSync(fullPath)) {
      console.error(`Bhajan file not found: ${fullPath}`);
      return new NextResponse('Bhajan file not found', { status: 404 });
    }

    // Verify it's an MP3 file (or other allowed audio formats)
    const allowedExtensions = ['.mp3', '.wav', '.ogg', '.m4a'];
    const hasAllowedExtension = allowedExtensions.some(ext => 
      filePath.toLowerCase().endsWith(ext)
    );

    if (!hasAllowedExtension) {
      return new NextResponse('Invalid file type. Only audio files are allowed.', { status: 400 });
    }

    // Read the file
    const fileBuffer = await readFile(fullPath);

    // Determine content type based on file extension
    let contentType = 'audio/mpeg'; // Default to MP3
    if (filePath.toLowerCase().endsWith('.wav')) {
      contentType = 'audio/wav';
    } else if (filePath.toLowerCase().endsWith('.ogg')) {
      contentType = 'audio/ogg';
    } else if (filePath.toLowerCase().endsWith('.m4a')) {
      contentType = 'audio/mp4';
    }

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Accept-Ranges': 'bytes', // Support range requests for audio streaming
      },
    });
  } catch (error) {
    console.error('Error serving bhajan file:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal server error',
      { status: 500 }
    );
  }
}

