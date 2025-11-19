import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * Split an audio file into smaller chunks
 * @param inputPath Path to the input audio file
 * @param chunkDuration Duration of each chunk in seconds (default: 5 minutes)
 * @returns Array of paths to chunk files
 */
export async function splitAudioIntoChunks(
  inputPath: string,
  chunkDuration: number = 300 // 5 minutes = 300 seconds
): Promise<string[]> {
  try {
    // Check if ffmpeg is available
    try {
      await execAsync('ffmpeg -version');
    } catch {
      throw new Error('ffmpeg is not installed. Please install ffmpeg to split audio files.');
    }

    const tempDir = path.join(os.tmpdir(), `audio_chunks_${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const baseName = path.basename(inputPath, path.extname(inputPath));
    const outputPattern = path.join(tempDir, `${baseName}_chunk_%03d.ogg`);

    console.log(`[audio-splitter] Splitting audio into ${chunkDuration}s chunks...`);
    console.log(`[audio-splitter] Input: ${inputPath}`);
    console.log(`[audio-splitter] Output pattern: ${outputPattern}`);

    // Use ffmpeg to split the audio
    // -f segment: use segment muxer
    // -segment_time: duration of each segment
    // -segment_format: output format (ogg)
    // -c copy: copy codec (faster, but might not work for all formats)
    // -reset_timestamps 1: reset timestamps for each segment
    const command = `ffmpeg -i "${inputPath}" -f segment -segment_time ${chunkDuration} -segment_format ogg -c copy -reset_timestamps 1 "${outputPattern}" -y`;

    try {
      const { stdout, stderr } = await execAsync(command);
      console.log(`[audio-splitter] ffmpeg output:`, stdout.substring(0, 200));
      if (stderr) {
        console.log(`[audio-splitter] ffmpeg stderr:`, stderr.substring(0, 200));
      }
    } catch (error: any) {
      // ffmpeg might output to stderr even on success, so check if files were created
      const files = await fs.readdir(tempDir);
      if (files.length === 0) {
        throw new Error(`ffmpeg failed to create chunks: ${error.message}`);
      }
    }

    // Get all created chunk files
    const files = await fs.readdir(tempDir);
    const chunkFiles = files
      .filter((f) => f.endsWith('.ogg'))
      .sort() // Sort to maintain order
      .map((f) => path.join(tempDir, f));

    console.log(`[audio-splitter] ✅ Created ${chunkFiles.length} chunks`);

    return chunkFiles;
  } catch (error: any) {
    console.error('[audio-splitter] Error splitting audio:', error);
    throw new Error(`Failed to split audio: ${error.message}`);
  }
}

/**
 * Clean up chunk files
 */
export async function cleanupChunks(chunkPaths: string[]): Promise<void> {
  for (const chunkPath of chunkPaths) {
    try {
      await fs.unlink(chunkPath);
    } catch (error) {
      console.warn(`[audio-splitter] Failed to delete chunk ${chunkPath}:`, error);
    }
  }

  // Try to remove the temp directory
  if (chunkPaths.length > 0) {
    const tempDir = path.dirname(chunkPaths[0]);
    try {
      await fs.rmdir(tempDir);
    } catch (error) {
      // Directory might not be empty, ignore
    }
  }
}

