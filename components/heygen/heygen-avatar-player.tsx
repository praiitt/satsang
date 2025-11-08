'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

type SessionInfo = {
  session_id: string;
  url: string;
  access_token: string;
  session_token: string;
};

interface HeygenAvatarPlayerProps {
  autoStart?: boolean;
  className?: string;
  muteHeygenAudio?: boolean;
}

export function HeygenAvatarPlayer({
  autoStart = true,
  className,
  muteHeygenAudio = true,
}: HeygenAvatarPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const roomRef = useRef<Room | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!autoStart) return;
    let cancelled = false;
    (async () => {
      try {
        setConnecting(true);
        const res = await fetch('/api/heygen/session/new', { method: 'POST' });
        if (!res.ok) throw new Error('failed to create heygen session');
        const data = await res.json();
        if (cancelled) return;
        const sessionInfo: SessionInfo = {
          session_id: data.session_id,
          url: data.url,
          access_token: data.access_token,
          session_token: data.session_token,
        };
        setSession(sessionInfo);

        await fetch('/api/heygen/session/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionInfo.session_id,
            session_token: sessionInfo.session_token,
          }),
        });

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });
        roomRef.current = room;

        room.on(RoomEvent.TrackSubscribed, (_track, publication, participant) => {
          const track = publication.track;
          if (!track) return;
          if (track.kind === Track.Kind.Video && videoRef.current) {
            track.attach(videoRef.current);
          }
          if (track.kind === Track.Kind.Audio) {
            const mediaEl = track.attachedElements[0] as HTMLMediaElement | undefined;
            if (mediaEl) {
              mediaEl.muted = !!muteHeygenAudio;
              mediaEl.volume = muteHeygenAudio ? 0 : 1;
            }
          }
        });

        await room.connect(sessionInfo.url, sessionInfo.access_token);
      } catch (_e) {
        // swallow for now; UI remains voice-only
      } finally {
        if (!cancelled) setConnecting(false);
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  async function cleanup() {
    try {
      const room = roomRef.current;
      if (room) {
        room.disconnect(true);
        roomRef.current = null;
      }
    } finally {
      if (session) {
        fetch('/api/heygen/session/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: session.session_id,
            session_token: session.session_token,
          }),
        }).catch(() => {});
        setSession(null);
      }
    }
  }

  // Expose a simple task sender for initial wiring / manual testing
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).heygenSendText = async (text: string, taskType: 'talk' | 'repeat' = 'talk') => {
      if (!session) return;
      await fetch('/api/heygen/session/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.session_id,
          session_token: session.session_token,
          text,
          task_type: taskType,
        }),
      });
    };
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).heygenSendText = undefined;
    };
  }, [session]);

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        right: 12,
        bottom: 12,
        zIndex: 30,
        width: 240,
        height: 320,
        borderRadius: 12,
        overflow: 'hidden',
        background: '#000',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        display: connecting ? 'none' : 'block',
      }}
      aria-hidden={connecting}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
