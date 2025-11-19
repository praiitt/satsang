/**
 * Fallback: If SARVAM REST API doesn't work, we can use this to call SARVAM via Python script
 * This is a temporary workaround until we find the correct REST API endpoint
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

interface TranscriptionResponse {
  text: string;
  segments?: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
  }>;
  language?: string;
}

/**
 * Transcribe using SARVAM Python SDK as fallback
 * This requires Python and sarvamai package to be installed
 */
export async function transcribeAudioWithSarvamPython(
  audioFilePath: string,
  language: string = 'hi'
): Promise<TranscriptionResponse> {
  const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
  if (!SARVAM_API_KEY) {
    throw new Error('SARVAM_API_KEY is not set');
  }

  // Create a temporary Python script to call SARVAM
  const scriptContent = `
import sys
import os
from sarvamai import SarvamAI

# Set API key
os.environ['SARVAM_API_KEY'] = '${SARVAM_API_KEY}'

# Initialize client
client = SarvamAI(api_subscription_key='${SARVAM_API_KEY}')

# Transcribe
try:
    response = client.speech_to_text(
        audio_file_path='${audioFilePath}',
        language_code='${language === 'hi' ? 'hi-IN' : language}'
    )
    print(response.transcript if hasattr(response, 'transcript') else str(response))
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;

  const scriptPath = path.join(path.dirname(audioFilePath), `sarvam_transcribe_${Date.now()}.py`);
  
  try {
    // Write Python script
    await fs.writeFile(scriptPath, scriptContent);
    
    // Execute Python script
    const { stdout, stderr } = await execAsync(`python3 "${scriptPath}"`);
    
    if (stderr) {
      throw new Error(`SARVAM Python error: ${stderr}`);
    }
    
    const transcript = stdout.trim();
    if (transcript.startsWith('ERROR:')) {
      throw new Error(transcript);
    }
    
    return {
      text: transcript,
      language: language,
    };
  } finally {
    // Clean up script
    try {
      await fs.unlink(scriptPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

