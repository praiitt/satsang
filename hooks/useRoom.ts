import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Room, RoomEvent, TokenSource } from 'livekit-client';
import { AppConfig } from '@/app-config';
import { useAuth } from '@/components/auth/auth-provider';
import { toastAlert } from '@/components/livekit/alert-toast';
import { useLanguage } from '@/contexts/language-context';

export function useRoom(appConfig: AppConfig) {
  const aborted = useRef(false);
  const room = useMemo(() => new Room(), []);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const auth = useAuth();
  const authRef = useRef(auth);
  authRef.current = auth;
  const { language } = useLanguage();

  useEffect(() => {
    function onDisconnected() {
      setIsSessionActive(false);
    }

    function onMediaDevicesError(error: Error) {
      toastAlert({
        title: 'Encountered an error with your media devices',
        description: `${error.name}: ${error.message}`,
      });
    }

    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.MediaDevicesError, onMediaDevicesError);

    return () => {
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.MediaDevicesError, onMediaDevicesError);
    };
  }, [room]);

  useEffect(() => {
    return () => {
      aborted.current = true;
      room.disconnect();
    };
  }, [room]);

  const tokenSource = useMemo(
    () =>
      TokenSource.custom(async () => {
        const url = new URL(
          process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? '/api/connection-details',
          window.location.origin
        );

        try {
          const res = await fetch(url.toString(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Sandbox-Id': appConfig.sandboxId ?? '',
              'X-Language': language, // Send language preference in header
            },
            body: JSON.stringify({
              room_config: appConfig.agentName
                ? {
                    agents: [{ agent_name: appConfig.agentName }],
                  }
                : undefined,
              language: language, // Also send in body for compatibility
            }),
          });
          return await res.json();
        } catch (error) {
          console.error('Error fetching connection details:', error);
          throw new Error('Error fetching connection details!');
        }
      }),
    [appConfig, language]
  );

  // Track active egress IDs for this room
  const egressIdsRef = useRef<string[]>([]);

  const startSession = useCallback(() => {
    setIsSessionActive(true);

    if (room.state === 'disconnected') {
      const { isPreConnectBufferEnabled } = appConfig;
      Promise.all([
        room.localParticipant.setMicrophoneEnabled(true, undefined, {
          preConnectBuffer: isPreConnectBufferEnabled,
        }),
        tokenSource.fetch({ agentName: appConfig.agentName }).then(async (connectionDetails) => {
          await room.connect(connectionDetails.serverUrl, connectionDetails.participantToken);
          // Start audio egress after successful connect
          try {
            const res = await fetch('/api/egress/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ roomName: room.name, userId: authRef.current.user?.uid }),
            });
            const data = await res.json();
            if (res.ok && data?.egressId) {
              egressIdsRef.current.push(String(data.egressId));
              console.log('[egress] started', data);
            } else {
              console.warn('[egress] start failed or disabled', data);
            }
          } catch (e) {
            console.warn('[egress] start error', e);
          }
        }),
      ]).catch((error) => {
        if (aborted.current) {
          // Once the effect has cleaned up after itself, drop any errors
          //
          // These errors are likely caused by this effect rerunning rapidly,
          // resulting in a previous run `disconnect` running in parallel with
          // a current run `connect`
          return;
        }

        toastAlert({
          title: 'There was an error connecting to the agent',
          description: `${error.name}: ${error.message}`,
        });
      });
    }
  }, [room, appConfig, tokenSource]);

  const endSession = useCallback(() => {
    setIsSessionActive(false);
    // Stop any active egress for this room
    const roomName = room.name;
    const ids = [...egressIdsRef.current];
    egressIdsRef.current = [];
    if (roomName) {
      fetch('/api/egress/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, egressIds: ids }),
      }).catch((e) => console.warn('[egress] stop error', e));
    }
  }, []);

  return { room, isSessionActive, startSession, endSession };
}
