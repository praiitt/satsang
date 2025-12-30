#!/usr/bin/env python3
"""
Transcribe audio file (MP3/OGG/WAV) from URL using Whisper.
Returns JSON with transcript formatted as conversation.
"""
import argparse
import json
import logging
import os
import subprocess
import sys
import tempfile
import requests
from datetime import datetime
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
logger = logging.getLogger("transcribe_audio")

# Try to import Whisper (supports both openai-whisper and whisper.cpp)
try:
    import whisper
    WHISPER_TYPE = "openai-whisper"
    logger.info("Using openai-whisper library")
except ImportError:
    try:
        # Try whisper-cpp-py or similar bindings
        import whisper_cpp
        WHISPER_TYPE = "whisper-cpp"
        logger.info("Using whisper-cpp bindings")
    except ImportError:
        WHISPER_TYPE = None
        logger.warning("Whisper not found. Install: pip install openai-whisper")

def transcribe_with_whisper(audio_path: str, language: str = "hi") -> str:
    """Transcribe audio using Whisper."""
    if WHISPER_TYPE is None:
        raise ImportError("Whisper not installed. Install with: pip install openai-whisper")
    
    if WHISPER_TYPE == "openai-whisper":
        logger.info(f"Loading Whisper model (this may take a moment)...")
        model = whisper.load_model("base")  # Use 'base' for faster processing, 'large-v3' for best quality
        logger.info(f"Transcribing {audio_path}...")
        result = model.transcribe(audio_path, language=language)
        return result["text"].strip()
    else:
        raise NotImplementedError(f"Whisper type {WHISPER_TYPE} not yet implemented")


def process_audio_transcript(
    audio_url: str,
    chunk_duration: int = 300,
    language: str = "hi"
) -> dict:
    """
    Process audio transcript: download, extract, chunk, transcribe.
    Returns formatted conversation transcript.
    """
    temp_audio_path = None
    temp_dir = None
    
    try:
        # Step 1: Download audio
        logger.info(f"📥 Downloading audio from: {audio_url}")
        response = requests.get(audio_url, timeout=600, stream=True)
        if response.status_code != 200:
            raise Exception(f"Failed to download audio: HTTP {response.status_code}")
        
        # Determine file extension from URL or content-type
        ext = '.mp3'
        if '.ogg' in audio_url.lower() or audio_url.lower().endswith('.ogg'):
            ext = '.ogg'
        elif '.wav' in audio_url.lower() or audio_url.lower().endswith('.wav'):
            ext = '.wav'
        elif '.mp4' in audio_url.lower() or audio_url.lower().endswith('.mp4'):
            ext = '.mp4'
        
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as temp_audio:
            for chunk in response.iter_content(chunk_size=8192):
                temp_audio.write(chunk)
            temp_audio_path = temp_audio.name
        
        logger.info(f"✅ Downloaded to: {temp_audio_path}")
        
        # Step 2: Convert to WAV if needed (Whisper works best with WAV)
        wav_path = temp_audio_path.replace(ext, '.wav')
        if ext != '.wav':
            logger.info(f"🔄 Converting {ext} to WAV...")
            subprocess.run([
                'ffmpeg', '-i', temp_audio_path,
                '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
                '-y', wav_path
            ], capture_output=True, text=True, timeout=600, check=True)
            # Clean up original file
            if os.path.exists(temp_audio_path):
                os.unlink(temp_audio_path)
        else:
            wav_path = temp_audio_path
        
        # Step 3: Probe total duration
        result = subprocess.run([
            'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1', wav_path
        ], capture_output=True, text=True, timeout=30)
        
        total_duration = float(result.stdout.strip()) if result.returncode == 0 else 0
        logger.info(f"🎧 Audio total duration: {total_duration:.2f}s")
        
        # Step 4: Chunk audio (if needed) and transcribe
        max_chunk_duration = min(chunk_duration, 300)
        overlap = 2.0
        
        # Initialize chunks_processed
        chunks_processed = 1
        
        if total_duration <= max_chunk_duration:
            # Short audio - transcribe directly
            logger.info(f"📝 Transcribing entire audio (no chunking needed)...")
            transcript = transcribe_with_whisper(wav_path, language=language)
        else:
            # Long audio - chunk and process
            logger.info(f"🔪 Chunking audio into {max_chunk_duration}s segments...")
            start_time = 0.0
            chunk_index = 0
            transcript = ""
            temp_dir = tempfile.mkdtemp()
            
            while True:
                end_time = start_time + max_chunk_duration
                if start_time >= total_duration:
                    logger.info("✅ Reached end of file.")
                    break
                
                chunk_file = os.path.join(temp_dir, f"chunk_{chunk_index:03d}.wav")
                
                # Extract chunk
                cmd = [
                    'ffmpeg', '-ss', f"{start_time}", '-to', f"{end_time}",
                    '-i', wav_path,
                    '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
                    '-avoid_negative_ts', 'make_zero', '-y', chunk_file
                ]
                subprocess.run(cmd, capture_output=True, text=True, timeout=600)
                
                if not os.path.exists(chunk_file) or os.path.getsize(chunk_file) < 1000:
                    logger.info(f"📭 No more audio at {start_time:.2f}s — stopping chunk loop.")
                    break
                
                # Probe actual chunk duration
                chunk_info = subprocess.run([
                    'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                    '-of', 'default=noprint_wrappers=1:nokey=1', chunk_file
                ], capture_output=True, text=True, timeout=30)
                
                actual_chunk_duration = float(chunk_info.stdout.strip()) if chunk_info.returncode == 0 else 0
                logger.info(f"🔪 Chunk {chunk_index+1}: {start_time:.2f}-{end_time:.2f}s (actual {actual_chunk_duration:.2f}s)")
                
                try:
                    part_transcript = transcribe_with_whisper(chunk_file, language=language)
                    transcript += f"\n[Chunk {chunk_index+1} {start_time:.1f}-{end_time:.1f}s]\n{part_transcript.strip()}\n"
                except Exception as e:
                    logger.error(f"❌ Whisper failed on chunk {chunk_index+1}: {e}")
                
                # Advance pointer
                if actual_chunk_duration <= overlap:
                    logger.info(f"✅ Chunk too short ({actual_chunk_duration:.2f}s <= overlap {overlap}s), ending processing.")
                    break
                
                start_time += actual_chunk_duration - overlap
                chunk_index += 1
            
            chunks_processed = chunk_index + 1
        
        # Step 5: Format as conversation
        conversation = format_transcript_as_conversation(transcript.strip())
        
        return {
            "success": True,
            "transcript": transcript.strip(),
            "conversation": conversation,
            "duration": total_duration,
            "chunks_processed": chunks_processed,
            "character_count": len(transcript.strip()),
            "language": language,
            "processed_at": datetime.now().isoformat(),
        }
        
    except Exception as e:
        logger.error(f"❌ Error processing audio transcript: {e}")
        return {
            "success": False,
            "error": str(e),
        }
    finally:
        # Cleanup
        for p in [temp_audio_path, wav_path] if 'wav_path' in locals() else [temp_audio_path]:
            try:
                if p and os.path.exists(p):
                    os.unlink(p)
            except:
                pass
        
        if temp_dir and os.path.exists(temp_dir):
            try:
                import shutil
                shutil.rmtree(temp_dir)
                logger.info(f"🧹 Cleaned up temp directory: {temp_dir}")
            except Exception as e:
                logger.warning(f"⚠️ Failed to clean up temp directory {temp_dir}: {e}")


def format_transcript_as_conversation(transcript: str) -> list:
    """
    Format transcript as a conversation with alternating user/assistant turns.
    For now, we split by sentences and alternate. In production, you might use
    speaker diarization or other techniques to identify speakers.
    """
    if not transcript or len(transcript.strip()) < 10:
        return [{
            "speaker": "user",
            "text": transcript.strip(),
            "timestamp": 0,
        }]
    
    # Split by lines and chunks markers
    lines = [line.strip() for line in transcript.split('\n') if line.strip()]
    conversation = []
    
    # Simple heuristic: split by sentences and alternate speakers
    sentences = []
    for line in lines:
        # Skip chunk markers
        if line.startswith('[Chunk'):
            continue
        # Split by sentence endings (Hindi: ।, English: .)
        # Remove chunk markers and split by punctuation
        clean_line = line.replace('[Chunk', '').replace(']', '').strip()
        # Split by Hindi and English sentence endings
        parts = []
        current_part = ""
        for char in clean_line:
            current_part += char
            if char in ['।', '.', '?', '!', '\n']:
                parts.append(current_part.strip())
                current_part = ""
        if current_part.strip():
            parts.append(current_part.strip())
        
        for part in parts:
            part = part.strip()
            if len(part) > 10:  # Only add meaningful sentences
                sentences.append(part)
    
    # If no sentences found, treat entire transcript as one turn
    if not sentences:
        return [{
            "speaker": "user",
            "text": transcript.strip(),
            "timestamp": 0,
        }]
    
    # Alternate between user and assistant
    # Assume first turn is user, then alternate
    for i, sentence in enumerate(sentences):
        # Simple heuristic: alternate speakers
        # In a typical conversation, user speaks first, then assistant responds
        speaker = "user" if i % 2 == 0 else "assistant"
        conversation.append({
            "speaker": speaker,
            "text": sentence,
            "timestamp": i * 5,  # Approximate timestamp (5s per turn)
        })
    
    # If we have very few turns, assume it's all user speech
    if len(conversation) < 2:
        conversation = [{
            "speaker": "user",
            "text": transcript.strip(),
            "timestamp": 0,
        }]
    
    return conversation


def main():
    parser = argparse.ArgumentParser(description="Transcribe audio from URL using Whisper")
    parser.add_argument("--audio-url", required=True, help="URL of audio file (MP3/OGG/WAV)")
    parser.add_argument("--chunk-duration", type=int, default=300, help="Chunk duration in seconds (default: 300)")
    parser.add_argument("--language", default="hi", help="Language code (default: hi for Hindi)")
    parser.add_argument("--output", help="Output JSON file path (optional)")
    
    args = parser.parse_args()
    
    result = process_audio_transcript(
        audio_url=args.audio_url,
        chunk_duration=args.chunk_duration,
        language=args.language
    )
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        logger.info(f"✅ Saved result to: {args.output}")
    else:
        # Print JSON to stdout
        print(json.dumps(result, ensure_ascii=False, indent=2))
    
    sys.exit(0 if result.get("success") else 1)


if __name__ == "__main__":
    main()
