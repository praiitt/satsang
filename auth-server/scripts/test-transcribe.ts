import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as os from 'os';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from project root (not auth-server root)
const rootEnvPath = path.resolve(__dirname, '../../.env.local');
const localEnvPath = path.resolve(__dirname, '../.env.local');

if (fs.existsSync(rootEnvPath)) {
  config({ path: rootEnvPath });
  console.log(`📄 Loaded .env.local from: ${rootEnvPath}`);
} else if (fs.existsSync(localEnvPath)) {
  config({ path: localEnvPath });
  console.log(`📄 Loaded .env.local from: ${localEnvPath}`);
} else {
  config(); // Try default locations
  console.log('📄 Using default dotenv config');
}

import { listRecentMP3Files, downloadMP3FromGCS } from '../src/services/gcs-audio.js';
import { transcribeAudio, parseConversation } from '../src/services/whisper-transcribe.js';

async function testTranscribe(gcsPath: string) {
  console.log('🧪 Testing Transcription');
  console.log(`📁 GCS Path: ${gcsPath}`);
  
  try {
    // Check environment variables
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY is not set');
      process.exit(1);
    }
    console.log('✅ OPENAI_API_KEY is set');

    // Create a temporary file to download the audio
    const tempDir = os.tmpdir();
    const tempFileName = `test_transcribe_${Date.now()}_${path.basename(gcsPath)}`;
    const tempFilePath = path.join(tempDir, tempFileName);

    console.log(`\n📥 Downloading from GCS...`);
    console.log(`   Source: ${gcsPath}`);
    console.log(`   Destination: ${tempFilePath}`);

    try {
      await downloadMP3FromGCS(gcsPath, tempFilePath);
      console.log('✅ File downloaded successfully');

      // Check file size
      const stats = await fsPromises.stat(tempFilePath);
      console.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      // Check file exists
      const fileExists = await fsPromises.access(tempFilePath).then(() => true).catch(() => false);
      if (!fileExists) {
        throw new Error('File does not exist after download');
      }
      console.log('✅ File exists and is accessible');

      console.log(`\n🎤 Transcribing with Whisper...`);
      console.log(`   Language: hi (Hindi)`);
      
      const transcription = await transcribeAudio(tempFilePath, 'hi');

      console.log('\n✅ Transcription successful!');
      console.log(`\n📝 Full Text:`);
      console.log(transcription.text);
      
      if (transcription.language) {
        console.log(`\n🌐 Detected Language: ${transcription.language}`);
      }

      if (transcription.segments && transcription.segments.length > 0) {
        console.log(`\n📊 Segments: ${transcription.segments.length}`);
        console.log('\n🎬 First 3 segments:');
        transcription.segments.slice(0, 3).forEach((seg, i) => {
          console.log(`   ${i + 1}. [${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s] ${seg.text}`);
        });
      }

      // Parse conversation
      const conversation = parseConversation(transcription);
      if (conversation.length > 0) {
        console.log(`\n💬 Conversation Turns: ${conversation.length}`);
        console.log('\n🎭 First 5 turns:');
        conversation.slice(0, 5).forEach((turn, i) => {
          console.log(`   ${i + 1}. [${turn.speaker.toUpperCase()}] [${turn.start.toFixed(1)}s-${turn.end.toFixed(1)}s] ${turn.text}`);
        });
      }

      // Clean up temp file
      try {
        await fsPromises.unlink(tempFilePath);
        console.log('\n🧹 Cleaned up temporary file');
      } catch (cleanupError) {
        console.warn('\n⚠️  Failed to cleanup temp file:', cleanupError);
      }

      console.log('\n✅ Test completed successfully!');
    } catch (downloadError: any) {
      console.error('\n❌ Download failed:', downloadError.message);
      console.error('Stack:', downloadError.stack);
      
      // Clean up temp file if it exists
      try {
        await fsPromises.unlink(tempFilePath).catch(() => {});
      } catch {}
      
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Get GCS path from command line argument or use default
const gcsPath = process.argv[2] || 'recordings/voice_assistant_room_6803/2025-11-16T17-14-43-903Z/audio.ogg';

console.log('🚀 Starting transcription test...\n');
testTranscribe(gcsPath).catch((err) => {
  console.error('❌ Unhandled error:', err);
  process.exit(1);
});

