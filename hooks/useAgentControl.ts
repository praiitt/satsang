'use client';

import { useCallback, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';

/**
 * Hook to control agent sleep/wake state via data channel
 */
export function useAgentControl() {
  const room = useRoomContext();
  const [agentIsSleeping, setAgentIsSleeping] = useState(false);

  const publishAgentControl = useCallback(
    async (action: 'sleep' | 'wake', reason: string): Promise<void> => {
      try {
        if (!room) {
          console.warn('[useAgentControl] Room not available');
          return;
        }
        if (!room.localParticipant) {
          console.warn('[useAgentControl] Local participant not available');
          return;
        }
        const payload = new TextEncoder().encode(
          JSON.stringify({ type: 'agent.control', action, reason })
        );
        console.log('[useAgentControl] 📤 Sending agent.control message', {
          action,
          reason,
          payloadSize: payload.length,
          roomName: room.name,
          participantIdentity: room.localParticipant.identity,
        });
        // reliable delivery; topic helps agent filter
        // @ts-expect-error publishData topic overload
        await room.localParticipant.publishData(payload, true, 'agent.control');
        console.log('[useAgentControl] ✅ Successfully sent agent.control', { action, reason });

        // Update local UI state
        setAgentIsSleeping(action === 'sleep');
      } catch (e) {
        console.error('[useAgentControl] ❌ Failed to publish agent.control', e);
        throw e; // Re-throw so caller knows it failed
      }
    },
    [room]
  );

  const sleep = useCallback(
    (reason: string = 'manual_sleep') => {
      return publishAgentControl('sleep', reason);
    },
    [publishAgentControl]
  );

  const wake = useCallback(
    (reason: string = 'manual_wake') => {
      return publishAgentControl('wake', reason);
    },
    [publishAgentControl]
  );

  return {
    sleep,
    wake,
    agentIsSleeping,
    publishAgentControl,
  };
}

