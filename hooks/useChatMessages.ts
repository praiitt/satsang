import { useEffect, useMemo, useState } from 'react';
import { Room } from 'livekit-client';
import {
  type ReceivedChatMessage,
  type TextStreamData,
  useChat,
  useRoomContext,
  useTranscriptions,
} from '@livekit/components-react';
import { getChatHistory } from '@/lib/auth-api';
import { useAuth } from '@/components/auth/auth-provider';

function transcriptionToChatMessage(textStream: TextStreamData, room: Room): ReceivedChatMessage {
  return {
    id: textStream.streamInfo.id,
    timestamp: textStream.streamInfo.timestamp,
    message: textStream.text,
    from:
      textStream.participantInfo.identity === room.localParticipant.identity
        ? room.localParticipant
        : Array.from(room.remoteParticipants.values()).find(
          (p) => p.identity === textStream.participantInfo.identity
        ),
  };
}

export function useChatMessages() {
  const chat = useChat();
  const room = useRoomContext();
  const { user } = useAuth();
  const transcriptions: TextStreamData[] = useTranscriptions();
  const [history, setHistory] = useState<ReceivedChatMessage[]>([]);

  useEffect(() => {
    async function loadHistory() {
      if (!user?.uid) return;
      try {
        const rawHistory = await getChatHistory(user.uid, 'music_agent');
        const formattedHistory: ReceivedChatMessage[] = rawHistory.map((msg) => ({
          id: msg.id || `hist-${msg.timestamp}`,
          timestamp: new Date(msg.timestamp).getTime(),
          message: msg.content,
          from: msg.role === 'user' ? room.localParticipant : undefined, // undefined 'from' usually treated as remote/system
          // We can add a custom field if needed, but 'from' is optional in some types or we can treat undefined as remote
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
      ...transcriptions.map((transcription) => transcriptionToChatMessage(transcription, room)),
      ...chat.chatMessages,
    ];

    // Filter out duplicates if any (simple check by ID or timestamp fuzzy match could be better)
    // For now just concat. History is older.
    const combined = [...history, ...liveMessages];

    return combined.sort((a, b) => a.timestamp - b.timestamp);
  }, [transcriptions, chat.chatMessages, room, history]);

  return mergedTranscriptions;
}
