'use client';

/* eslint-disable prettier/prettier */

import { type HTMLAttributes, useCallback, useState } from 'react';
import { Track } from 'livekit-client';
import { useChat, useRemoteParticipants } from '@livekit/components-react';
import { ChatTextIcon, PhoneDisconnectIcon, Moon, Sun } from '@phosphor-icons/react/dist/ssr';
import { useSession } from '@/components/app/session-provider';
import { TrackToggle } from '@/components/livekit/agent-control-bar/track-toggle';
import { Button } from '@/components/livekit/button';
import { Toggle } from '@/components/livekit/toggle';
import { cn } from '@/lib/utils';
import { useAgentControl } from '@/hooks/useAgentControl';
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
        'bg-background border-input/50 dark:border-muted flex flex-col overflow-visible rounded-[31px] border p-3 drop-shadow-md/3',
        className
      )}
      {...props}
    >
      {/* Chat Input */}
      {visibleControls.chat && (
        <ChatInput
          chatOpen={chatOpen}
          isAgentAvailable={isAgentAvailable}
          onSend={handleSendMessage}
        />
      )}

      <div className="flex flex-col gap-2">
        {/* Agent sleep/wake status banner */}
        {agentIsSleeping && (
          <div className="bg-amber-500/10 border-amber-400/40 text-amber-800 dark:text-amber-200 flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs animate-pulse">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/70 shadow-sm">
              <Moon weight="fill" className="h-4 w-4 text-amber-900" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-[11px] tracking-wide">
                गुरुजी विश्राम मोड में हैं
              </span>
              <span className="text-[10px] opacity-80">
                भजन या वाणी चल रही है — समाप्त या pausa होने पर फिर से सुनना शुरू करेंगे।
              </span>
            </div>
          </div>
        )}
        {/* Chat Button - Prominent */}
        {visibleControls.chat && (
          <Button
            variant={chatOpen ? 'primary' : 'outline'}
            size="lg"
            onClick={() => handleToggleTranscript(!chatOpen)}
            className="w-full justify-center gap-2 font-semibold shadow-lg"
            aria-label={chatOpen ? 'Close chat' : 'Open chat'}
          >
            <ChatTextIcon weight="bold" className="h-5 w-5" />
            <span>{chatOpen ? 'चैट बंद करें' : '💬 चैट खोलें'}</span>
          </Button>
        )}

        {/* Control Row */}
        <div className="flex gap-1">
          <div className="flex grow gap-1">
            {/* Toggle Microphone */}
            {visibleControls.microphone && (
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
              />
            )}

            {/* Toggle Camera */}
            {visibleControls.camera && (
              <TrackSelector
                kind="videoinput"
                aria-label="Toggle camera"
                source={Track.Source.Camera}
                pressed={cameraToggle.enabled}
                pending={cameraToggle.pending}
                disabled={cameraToggle.pending}
                onPressedChange={cameraToggle.toggle}
                onMediaDeviceError={handleCameraDeviceSelectError}
                onActiveDeviceChange={handleVideoDeviceChange}
              />
            )}

            {/* Toggle Screen Share */}
            {visibleControls.screenShare && (
              <TrackToggle
                size="icon"
                variant="secondary"
                aria-label="Toggle screen share"
                source={Track.Source.ScreenShare}
                pressed={screenShareToggle.enabled}
                disabled={screenShareToggle.pending}
                onPressedChange={screenShareToggle.toggle}
              />
            )}

            {/* Manual Agent Sleep/Wake Toggle */}
            <Button
              size="icon"
              variant={agentIsSleeping ? 'secondary' : 'outline'}
              onClick={handleToggleAgentSleep}
              className={cn(
                'transition-colors',
                agentIsSleeping && 'bg-yellow-500/20 hover:bg-yellow-500/30'
              )}
              title={agentIsSleeping ? 'Wake Agent (Agent is sleeping)' : 'Sleep Agent (Agent is awake)'}
              aria-label={agentIsSleeping ? 'Wake agent' : 'Sleep agent'}
            >
              {agentIsSleeping ? (
                <Moon weight="fill" className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              ) : (
                <Sun weight="fill" className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* End Call Button - Most Prominent */}
        {visibleControls.leave && (
          <Button
            variant="destructive"
            size="lg"
            onClick={handleDisconnect}
            disabled={!isSessionActive}
            className="relative z-10 min-h-[50px] w-full justify-center gap-2 text-base font-bold shadow-xl transition-all hover:shadow-2xl"
            aria-label="End call"
          >
            <PhoneDisconnectIcon weight="bold" className="h-6 w-6" />
            <span className="whitespace-nowrap">❌ बातचीत समाप्त करें</span>
          </Button>
        )}
      </div>
    </div>
  );
}
