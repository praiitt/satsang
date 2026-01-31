import { useEffect, useMemo, useState } from 'react';
import { Room } from 'livekit-client';
import {
  type ReceivedChatMessage,
  type TextStreamData,
  useChat,
  useRoomContext,
  /* useTranscriptions, */
} from '@livekit/components-react';
import { getChatHistory } from '@/lib/auth-api';
import { useAuth } from '@/components/auth/auth-provider';
import { RoomEvent, type TranscriptionSegment, type Participant } from 'livekit-client';

export function useChatMessages() {
  const chat = useChat();
  const room = useRoomContext();
  const { user } = useAuth();
  const [transcriptionMap, setTranscriptionMap] = useState<Record<string, ReceivedChatMessage>>({});
  const [history, setHistory] = useState<ReceivedChatMessage[]>([]);

  // Listen for transcriptions directly from the room events
  useEffect(() => {
    const onTranscription = (
      segments: TranscriptionSegment[],
      participant?: Participant,
      _publication?: unknown // Use underscore to indicate unused
    ) => {
      if (!participant) return;

      setTranscriptionMap((prev) => {
        const next = { ...prev };
        let hasUpdates = false;

        for (const seg of segments) {
          // Update the segment in the map with the latest interim or final text
          // This creates the "continuous stream" effect as text evolves
          next[seg.id] = {
            id: seg.id,
            timestamp: seg.firstReceivedTime || Date.now(),
            message: seg.text,
            from: participant,
          };
          hasUpdates = true;
        }

        return hasUpdates ? next : prev;
      });
    };

    room.on(RoomEvent.TranscriptionReceived, onTranscription);
    return () => {
      room.off(RoomEvent.TranscriptionReceived, onTranscription);
    };
  }, [room]);

  useEffect(() => {
    async function loadHistory() {
      if (!user?.uid) return;
      try {
        const rawHistory = await getChatHistory(user.uid, 'music_agent');
        const formattedHistory: ReceivedChatMessage[] = rawHistory.map((msg) => ({
          id: msg.id || `hist-${msg.timestamp}`,
          timestamp: new Date(msg.timestamp).getTime(),
          message: msg.content,
          from: msg.role === 'user' ? room.localParticipant : undefined,
        }));
        setHistory(formattedHistory);
      } catch (e) {
        console.error('Failed to load chat history', e);
      }
    }
    loadHistory();
  }, [user?.uid, room.localParticipant]);

  const mergedTranscriptions = useMemo(() => {
    const liveMessages: Array<ReceivedChatMessage> = [
      ...Object.values(transcriptionMap),
      ...chat.chatMessages,
    ];

    const combined = [...history, ...liveMessages];
    return combined.sort((a, b) => a.timestamp - b.timestamp);
  }, [chat.chatMessages, room, history, transcriptionMap]);

  return mergedTranscriptions;
}
