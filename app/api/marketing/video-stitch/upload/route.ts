import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || 'http://localhost:4000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files: Array<{ name: string; buffer: Buffer; size: number }> = [];
    
    // Extract all files from form data
    for (const [key, value] of formData.entries()) {
      // Check if value is a File-like object (Blob)
      if (value && typeof value === 'object' && 'arrayBuffer' in value) {
        const file = value as any;
        const buffer = Buffer.from(await file.arrayBuffer());
        files.push({
          name: file.name || `file_${key}`,
          buffer,
          size: buffer.length,
        });
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      );
    }

    // Create upload directory
    const uploadDir = join(process.cwd(), 'uploads', 'videos');
    await mkdir(uploadDir, { recursive: true });

    // Save files and get their URLs
    const urls: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const timestamp = Date.now();
      const fileName = `${timestamp}_${i}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = join(uploadDir, fileName);
      
      // Save the buffer directly
      await writeFile(filePath, file.buffer);
      
      // Generate absolute path for the uploaded file
      // The auth-server will access this file directly
      const fileUrl = filePath; // Use absolute path so auth-server can access it
      urls.push(fileUrl);
    }

    return NextResponse.json({
      success: true,
      urls,
      count: urls.length,
    });
  } catch (error: any) {
    console.error('[video-stitch-upload] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload files' },
      { status: 500 }
    );
  }
}

