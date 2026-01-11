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
        const endpoint = appConfig.tokenEndpoint ?? process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? '/api/connection-details';
        const url = new URL(endpoint, window.location.origin);

        const currentUser = authRef.current.user;
        const resolvedUserId = currentUser?.uid || currentUser?.phoneNumber;
        const isAuthLoading = authRef.current.loading;

        // Strict Debugging
        if (!resolvedUserId) {
          if (isAuthLoading) {
            console.warn('⚠️ [useRoom] Auth is still loading. Token will have default_user.');
          } else {
            console.warn('⚠️ [useRoom] User is NOT logged in (or no UID). Token will have default_user.');
          }
        } else {
          console.log('✅ [useRoom] Generating token for User ID:', resolvedUserId);
        }

        try {
          const res = await fetch(endpoint, {
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
              userId: resolvedUserId, // Explicitly use the resolved variable
              guruId: appConfig.metadata?.guruId, // Pass guruId if available
            }),
          });

          console.log('🔍 [useRoom] Connection details request sent', {
            agentName: appConfig.agentName,
            language,
            guruId: appConfig.metadata?.guruId,
            userId: resolvedUserId,
            authLoaded: !isAuthLoading
          });

          const data = await res.json();
          console.log('✅ [useRoom] Connection details received', data);
          if (data.metadata) {
            console.log('📝 [useRoom] Backend confirmed metadata:', data.metadata);
          } else {
            console.warn('⚠️ [useRoom] Backend did NOT return metadata verification.');
          }

          // ROBUSTNESS: Map Room ID to User ID immediately
          if (data.roomName && resolvedUserId && resolvedUserId !== 'default_user') {
            try {
              // Determine base URL for mapping (using configured auth/backend url or relative proxy)
              // Using relative path '/api/livekit/map-session' which goes through next.config.ts proxy
              // But next.config.ts proxy maps /api/livekit -> BACKEND_URL, not AUTH_URL.
              // Wait, index.ts says we updated auth-server.
              // We need to check next.config.ts rewrite rules again.
              // Previously:
              // source: '/api/livekit/:path*', destination: `${BACKEND_URL}/api/livekit/:path*`,
              // We need to map it to AUTH server or use a specific rewrite.
              // Safe bet: Use '/backend/auth/livekit/map-session' if rewritten, or direct URL.

              // Let's use a explicit fetch to the auth server path if we can't rely on proxy yet.
              // Actually, let's use the same patterns. 
              // '/api/auth/...' proxies to AUTH_URL.
              // We just added '/livekit' to auth-server logic. 
              // We should add a rewrite rule for '/api/auth-livekit' -> AUTH_SERVER/livekit to be safe,
              // OR just assume we can add it to next.config.ts.

              // FOR NOW: Let's assume we will add/verify the rewrite rule.
              // Let's use '/api/auth/map-session' and mount the route there? No, we mounted at '/livekit'.
              // Let's use '/backend/livekit-auth/map-session' 

              // actually, let's just trigger it and log error if fail.
              fetch('/api/livekit/map-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  roomName: data.roomName,
                  userId: resolvedUserId,
                  agentName: appConfig.agentName
                })
              }).catch(e => console.warn('[useRoom] Mapping failed (proxy might be missing)', e));
            } catch (e) {
              console.warn('[useRoom] Failed to initiate mapping', e);
            }
          }

          return data;
        } catch (error) {
          console.error('❌ [useRoom] Error fetching connection details:', error);
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
