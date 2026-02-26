'use client';

/* eslint-disable prettier/prettier */
import { type HTMLAttributes, useCallback, useState } from 'react';
import { Track } from 'livekit-client';
import { useChat, useRemoteParticipants } from '@livekit/components-react';
import { ChatTextIcon, Moon, PhoneDisconnectIcon, Sun } from '@phosphor-icons/react/dist/ssr';
import { useSession } from '@/components/app/session-provider';
import { TrackToggle } from '@/components/livekit/agent-control-bar/track-toggle';
import { Button } from '@/components/livekit/button';
import { Toggle } from '@/components/livekit/toggle';
import { useLanguage } from '@/contexts/language-context';
import { useAgentControl } from '@/hooks/useAgentControl';
import { cn } from '@/lib/utils';
import { ChatInput } from './chat-input';
import { UseInputControlsProps, useInputControls } from './hooks/use-input-controls';
import { usePublishPermissions } from './hooks/use-publish-permissions';
import { TrackSelector } from './track-selector';

export interface ControlBarControls {
  leave?: boolean;
  camera?: boolean;
  microphone?: boolean;
  screenShare?: boolean;
  chat?: boolean;
}

export interface AgentControlBarProps extends UseInputControlsProps {
  controls?: ControlBarControls;
  onDisconnect?: () => void;
  onChatOpenChange?: (open: boolean) => void;
  onDeviceError?: (error: { source: Track.Source; error: Error }) => void;
}

/**
 * A control bar specifically designed for voice assistant interfaces
 */
export function AgentControlBar({
  controls,
  saveUserChoices = true,
  className,
  onDisconnect,
  onDeviceError,
  onChatOpenChange,
  ...props
}: AgentControlBarProps & HTMLAttributes<HTMLDivElement>) {
  const { send } = useChat();
  const participants = useRemoteParticipants();
  const [chatOpen, setChatOpen] = useState(false);
  const publishPermissions = usePublishPermissions();
  const { isSessionActive, endSession } = useSession();
  const { sleep, wake, agentIsSleeping } = useAgentControl();
  const { t } = useLanguage();

  const {
    micTrackRef,
    cameraToggle,
    microphoneToggle,
    screenShareToggle,
    handleAudioDeviceChange,
    handleVideoDeviceChange,
    handleMicrophoneDeviceSelectError,
    handleCameraDeviceSelectError,
  } = useInputControls({ onDeviceError, saveUserChoices });

  const handleSendMessage = async (message: string) => {
    await send(message);
  };

  const handleToggleTranscript = useCallback(
    (open: boolean) => {
      setChatOpen(open);
      onChatOpenChange?.(open);
    },
    [onChatOpenChange, setChatOpen]
  );

  const handleDisconnect = useCallback(async () => {
    endSession();
    onDisconnect?.();
  }, [endSession, onDisconnect]);

  const handleToggleAgentSleep = useCallback(async () => {
    try {
      if (agentIsSleeping) {
        await wake('manual_wake');
      } else {
        await sleep('manual_sleep');
      }
    } catch (error) {
      console.error('[AgentControlBar] Failed to toggle agent sleep:', error);
    }
  }, [agentIsSleeping, sleep, wake]);

  const visibleControls = {
    leave: controls?.leave ?? true,
    microphone: controls?.microphone ?? publishPermissions.microphone,
    screenShare: controls?.screenShare ?? publishPermissions.screenShare,
    camera: controls?.camera ?? publishPermissions.camera,
    chat: controls?.chat ?? publishPermissions.data,
  };

  const isAgentAvailable = participants.some((p) => p.isAgent);

  return (
    <div
      aria-label="Voice assistant controls"
      className={cn(
        'relative flex w-full flex-col items-center justify-end', // Parent container flexibility
        className
      )}
      {...props}
    >
      {/* End Call Button moved to bottom bar for better UX consistency */}

      {/* Main Control Bar (Bottom Center) */}
      <div className="flex items-center gap-3 rounded-full bg-slate-950/80 p-2 backdrop-blur-xl border border-white/10 shadow-2xl">

        {/* Chat Toggle */}
        {visibleControls.chat && (
          <Button
            variant="secondary"
            size="icon"
            onClick={() => handleToggleTranscript(!chatOpen)}
            className={cn(
              "rounded-full h-16 w-16 border-4 border-slate-900 shadow-xl transition-all flex item-center justify-center shrink-0",
              chatOpen ? "bg-primary text-primary-foreground" : "bg-white text-slate-950 hover:bg-slate-200"
            )}
            aria-label={chatOpen ? 'Close chat' : 'Open chat'}
          >
            <ChatTextIcon weight="fill" className="h-7 w-7" />
          </Button>
        )}

        {/* Microphone Toggle (Central) */}
        {visibleControls.microphone && (
          <div className="mx-2">
            <TrackSelector
              kind="audioinput"
              aria-label="Toggle microphone"
              source={Track.Source.Microphone}
              pressed={microphoneToggle.enabled}
              disabled={microphoneToggle.pending}
              audioTrackRef={micTrackRef}
              onPressedChange={microphoneToggle.toggle}
              onMediaDeviceError={handleMicrophoneDeviceSelectError}
              onActiveDeviceChange={handleAudioDeviceChange}
              className="h-16 w-16 rounded-full border-4 border-slate-900 shadow-xl"
            // Note: You might need to adjust TrackSelector's internal Button styles via className prop if supported, 
            // or ensure it accepts 'className' to override size. 
            // Assuming TrackSelector passes className to its internal button.
            />
          </div>
        )}

        {/* Agent Sleep Toggle */}
        <Button
          size="icon"
          variant={agentIsSleeping ? 'secondary' : 'ghost'}
          onClick={handleToggleAgentSleep}
          className={cn(
            'rounded-full h-12 w-12 transition-colors',
            agentIsSleeping && 'bg-amber-500/20 text-amber-500'
          )}
          title={agentIsSleeping ? 'Wake Agent' : 'Sleep Agent'}
        >
          {agentIsSleeping ? (
            <Moon weight="fill" className="h-6 w-6" />
          ) : (
            <Sun weight="fill" className="h-6 w-6" />
          )}
        </Button>

        {/* End Call Button - Compact & Integrated */}
        {visibleControls.leave && (
          <Button
            variant="destructive"
            size="icon"
            onClick={handleDisconnect}
            disabled={!isSessionActive}
            className="rounded-full h-12 w-12 shrink-0 shadow-lg border border-white/10 ml-2"
            aria-label={t('session.endConversation')}
            title={t('session.endConversation')}
          >
            <PhoneDisconnectIcon weight="fill" className="h-6 w-6" />
          </Button>
        )}
      </div>

      {/* Sleeping State Banner (Floating above controls) */}
      {agentIsSleeping && (
        <div className="absolute bottom-24 bg-black/60 backdrop-blur-md text-amber-200 px-4 py-2 rounded-full text-sm font-medium border border-amber-500/30 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <Moon weight="fill" className="h-4 w-4" />
          {t('session.agentSleeping')}
        </div>
      )}

      {/* Chat Input - Prominent overlay when chat is open */}
      <div className="w-full max-w-lg mb-4">
        <ChatInput
          chatOpen={chatOpen}
          isAgentAvailable={isAgentAvailable}
          onSend={handleSendMessage}
        />
      </div>
    </div>
  );
}
