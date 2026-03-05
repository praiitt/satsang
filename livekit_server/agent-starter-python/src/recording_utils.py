"""
recording_utils.py — OGG audio recording via LiveKit Egress.

Provides helpers to start and stop an audio-only OGG egress for any agent room.
The resulting file is saved to GCS (or a local path for dev).

Usage in agent entrypoint:
    from recording_utils import start_audio_recording, stop_audio_recording
    egress_id = await start_audio_recording(ctx.room.name)
    # ... session runs ...
    recording_url = await stop_audio_recording(egress_id, ctx.room.name, user_id, agent_name, db)
"""

import os
import logging
import asyncio
from livekit import api as lkapi
from livekit.protocol.egress import AudioFileOutput, EncodedFileOutput, EncodingOptionsPreset
from livekit.protocol.egress import DirectFileOutput
from livekit.protocol.room_egress import RoomCompositeEgressRequest

logger = logging.getLogger("recording_utils")


def _get_livekit_api() -> lkapi.LiveKitAPI:
    url = os.getenv("LIVEKIT_URL", "")
    key = os.getenv("LIVEKIT_API_KEY", "")
    secret = os.getenv("LIVEKIT_API_SECRET", "")
    if not url or not key or not secret:
        raise RuntimeError("LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET must be set for recording")
    return lkapi.LiveKitAPI(url=url, api_key=key, api_secret=secret)


async def start_audio_recording(room_name: str) -> str | None:
    """
    Start an audio-only OGG recording for a room via LiveKit Egress.
    Returns the egress_id on success, None on failure.

    The file is uploaded to GCS if GCS_BUCKET_NAME env is set,
    otherwise it is stored in the local output path.
    """
    gcs_bucket = os.getenv("GCS_RECORDING_BUCKET")
    try:
        lk = _get_livekit_api()

        # Build a sanitised filename
        safe_room = room_name.replace("/", "_").replace(" ", "_")
        filename = f"recordings/{safe_room}.ogg"

        if gcs_bucket:
            output = DirectFileOutput(
                filepath=filename,
                s3=None,  # Using GCS via credentials
                gcp=lkapi.GCPUpload(
                    credentials=os.getenv("GOOGLE_APPLICATION_CREDENTIALS", ""),
                    bucket=gcs_bucket,
                ),
            )
            logger.info(f"🎙️ Recording to GCS bucket '{gcs_bucket}': {filename}")
        else:
            # Local output (useful for dev)
            output = DirectFileOutput(filepath=f"/tmp/{filename}")
            logger.info(f"🎙️ Recording to local path: /tmp/{filename}")

        request = RoomCompositeEgressRequest(
            room_name=room_name,
            audio_only=True,
            preset=EncodingOptionsPreset.OGG_OPUS_96KBPS,
            file=output,
        )

        resp = await lk.egress.start_room_composite_egress(request)
        egress_id = resp.egress_id
        logger.info(f"✅ Audio recording started. egress_id={egress_id}")
        return egress_id
    except Exception as e:
        logger.error(f"❌ Failed to start audio recording: {e}", exc_info=True)
        return None


async def stop_audio_recording(
    egress_id: str,
    room_name: str,
    user_id: str,
    agent_name: str,
    db=None,
) -> str | None:
    """
    Stop an audio egress and save the recording reference in Firestore.
    Returns the GCS URL of the recording on success, None on failure.
    """
    if not egress_id:
        return None
    try:
        lk = _get_livekit_api()
        resp = await lk.egress.stop_egress(egress_id)
        logger.info(f"✅ Egress stopped: {egress_id}")

        # Best-effort: build public URL from filename in the egress response
        recording_url = None
        if hasattr(resp, 'stream') and resp.stream:
            recording_url = resp.stream
        elif hasattr(resp, 'file') and resp.file:
            file_info = resp.file
            recording_url = getattr(file_info, 'location', None)

        gcs_bucket = os.getenv("GCS_RECORDING_BUCKET")
        if not recording_url and gcs_bucket:
            safe_room = room_name.replace("/", "_").replace(" ", "_")
            recording_url = f"https://storage.googleapis.com/{gcs_bucket}/recordings/{safe_room}.ogg"

        # Save to Firestore
        if db and recording_url:
            try:
                db.save_recording_ref(
                    room_name=room_name,
                    recording_url=recording_url,
                    agent_name=agent_name,
                    user_id=user_id,
                )
                logger.info(f"✅ Recording ref saved: {recording_url}")
            except Exception as e:
                logger.error(f"❌ Failed to save recording ref: {e}")

        return recording_url
    except Exception as e:
        logger.error(f"❌ Failed to stop audio recording: {e}", exc_info=True)
        return None
