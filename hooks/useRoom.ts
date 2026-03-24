import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
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

  // State to hold session-specific options (like intention)
  const sessionOptionsRef = useRef<{ intention?: string; resumeSessionId?: string }>({});

  const fetchConnectionDetails = useCallback(async () => {
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
      // Read intention from Ref
      const currentIntention = sessionOptionsRef.current.intention;

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
          intention: currentIntention, // Pass intention from Ref
          resumeSessionId: sessionOptionsRef.current.resumeSessionId, // Pass resumeSessionId if available
        }),
      });

      console.log('🔍 [useRoom] Connection details request sent', {
        agentName: appConfig.agentName,
        language,
        guruId: appConfig.metadata?.guruId,
        userId: resolvedUserId,
        intention: currentIntention,
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
  }, [appConfig, language]);

  // Track active egress IDs for this room
  const egressIdsRef = useRef<string[]>([]);

  const startSession = useCallback((options?: { intention?: string; resumeSessionId?: string }) => {
    // Update Ref immediately
    if (options) {
      sessionOptionsRef.current = options;
    } else {
      // Check URL for resumeSessionId if not explicitly passed
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const resumeId = searchParams.get('resumeSessionId');
        if (resumeId) {
          sessionOptionsRef.current = { resumeSessionId: resumeId };
        } else {
          sessionOptionsRef.current = {};
        }
      } else {
        sessionOptionsRef.current = {};
      }
    }

    setIsSessionActive(true);

    if (room.state === 'disconnected') {
      const { isPreConnectBufferEnabled } = appConfig;
      /* Refactored Connection Logic: Connect First, Then Publish */
      fetchConnectionDetails()
        .then(async (connectionDetails) => {
          await room.connect(connectionDetails.serverUrl, connectionDetails.participantToken);

          // Enable Microphone after connection
          await room.localParticipant.setMicrophoneEnabled(true);

          // Start audio egress after successful connect
          try {
            // Ensure we have a valid userId before starting egress
            let recordingUserId = authRef.current.user?.uid;

            // If defaulting or missing, try to resolve again or use 'guest' tag
            if (!recordingUserId && connectionDetails.participantName) {
              // sometimes participantName is used as ID or contains useful info
            }

            // Using connectionDetails.roomName directly is safer than room.name immediately after connect
            const targetRoomName = connectionDetails.roomName || room.name;
            console.log('[egress] Attempting to start egress for room:', targetRoomName, 'User:', recordingUserId);

            const startEgress = async (retries = 3) => {
              try {
                const res = await fetch('/api/egress/start', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    roomName: targetRoomName,
                    userId: recordingUserId || 'anonymous_guest', // Fallback to ensure recording happens
                    guruId: appConfig.metadata?.guruId,
                    intention: sessionOptionsRef.current.intention
                  }),
                });
                const data = await res.json();

                if (res.ok && data?.egressId) {
                  egressIdsRef.current.push(String(data.egressId));
                  console.log('✅ [egress] Started successfully:', data);
                  toastAlert({ title: 'Recording Started', description: 'Your session is being recorded.' });
                } else {
                  console.warn('⚠️ [egress] API returned partial/error:', data);
                  if (data.disabled) {
                    console.log('[egress] Recording disabled by server config.');
                  }
                }
              } catch (e) {
                console.error('❌ [egress] Start failed:', e);
                if (retries > 0) {
                  console.log(`[egress] Retrying start... (${retries} left)`);
                  setTimeout(() => startEgress(retries - 1), 2000);
                }
              }
            };

            // Fire and forget, but with internal retries
            // Wait 1s just to be safe that room state is settled
            setTimeout(() => startEgress(), 1000);

          } catch (e) {
            console.warn('[egress] Critical start error', e);
          }
        })
        .catch((error) => {
          if (aborted.current) return;
          console.error("Connection failed:", error);
          toastAlert({
            title: 'There was an error connecting to the agent',
            description: `${error.name}: ${error.message}`,
          });
        });
    }
  }, [room, appConfig, fetchConnectionDetails]);

  const endSession = useCallback(() => {
    setIsSessionActive(false);
    sessionOptionsRef.current = {}; // Reset options
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
