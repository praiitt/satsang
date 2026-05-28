'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { type Transition, type Variants, motion } from 'motion/react';
import type { AppConfig } from '@/app-config';
import { AgentChatTranscript } from '@/components/agents-ui/agent-chat-transcript';
import { PreConnectMessage } from '@/components/app/preconnect-message';
import { useSession } from '@/components/app/session-provider';
import { TileLayout } from '@/components/app/tile-layout';
import { useAuth } from '@/components/auth/auth-provider';
import { SessionAuthGuard } from '@/components/auth/session-auth-guard';
import {
  AgentControlBar,
  type ControlBarControls,
} from '@/components/livekit/agent-control-bar/agent-control-bar';
import { YouTubeBhajanPlayer } from '@/components/youtube/youtube-bhajan-player';
import { useLanguage } from '@/contexts/language-context';
import { useAgentControl } from '@/hooks/useAgentControl';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useConnectionTimeout } from '@/hooks/useConnectionTimout';
import { useDebugMode } from '@/hooks/useDebug';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { useWakeLock } from '@/hooks/useWakeLock';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../livekit/scroll-area/scroll-area';
import { RecordingsModal } from './recordings-modal';
import { Button } from '@/components/livekit/button';
import { History } from 'lucide-react';
import { useDataChannel } from '@livekit/components-react';
import { useMusicPlayer } from '@/contexts/music-player-context';
import BuyCoinsModal from '@/components/spiritual-studio/buy-coins-modal';

const MotionBottom = motion.create('div');

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';
const bottomVariants: Variants = {
  visible: {
    opacity: 1,
    translateY: '0%',
  },
  hidden: {
    opacity: 0,
    translateY: '100%',
  },
};

const bottomTransition: Transition = {
  duration: 0.3,
  delay: 0.5,
  ease: [0.16, 1, 0.3, 1],
};

const BOTTOM_VIEW_MOTION_PROPS = {
  variants: bottomVariants,
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: bottomTransition,
} as const;

interface FadeProps {
  top?: boolean;
  bottom?: boolean;
  className?: string;
}

export function Fade({ top = false, bottom = false, className }: FadeProps) {
  return (
    <div
      className={cn(
        'from-background pointer-events-none h-4 bg-linear-to-b to-transparent',
        top && 'bg-linear-to-b',
        bottom && 'bg-linear-to-t',
        className
      )}
    />
  );
}
interface SessionViewProps {
  appConfig: AppConfig;
}

export const SessionView = React.forwardRef<HTMLElement, React.ComponentProps<'section'> & SessionViewProps>(({
  appConfig,
  ...props
}, ref) => {
  useConnectionTimeout(200_000);
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useWakeLock(true);

  // Idle timeout: disconnect after 15 minutes of inactivity (configurable via env)
  const idleTimeoutMs = process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MS
    ? parseInt(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MS, 10)
    : 15 * 60 * 1000; // Default: 15 minutes
  useIdleTimeout(idleTimeoutMs, true);

  const { isSessionActive } = useSession();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { minutesRemaining, secondsRemaining, isTrialExpired } = useSessionTimer(isSessionActive);
  const messages = useChatMessages();
  const { agentIsSleeping } = useAgentControl();
  const [chatOpen, setChatOpen] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomSectionRef = useRef<HTMLDivElement>(null);
  const [bottomPadding, setBottomPadding] = useState(150);
  const [showRecordings, setShowRecordings] = useState(false);

  const controls: ControlBarControls = {
    leave: true,
    microphone: true,
    chat: appConfig.supportsChatInput,
    camera: appConfig.supportsVideoInput,
    screenShare: appConfig.supportsVideoInput,
  };

  const [showBuyCoins, setShowBuyCoins] = useState(false);

  // Try to use music player — may not be available in all session contexts
  let playTrack: ((track: any) => void) | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const player = useMusicPlayer();
    playTrack = player.playTrack;
  } catch {
    // MusicPlayerProvider not in tree — data channel playback disabled
  }

  // Use a ref to avoid stale closure in useDataChannel callback
  const setShowBuyCoinsRef = useRef(setShowBuyCoins);
  setShowBuyCoinsRef.current = setShowBuyCoins;
  const playTrackRef = useRef(playTrack);
  playTrackRef.current = playTrack;

  // Also listen for window-level event as fallback (e.g. fired from other components)
  useEffect(() => {
    const handler = () => setShowBuyCoinsRef.current(true);
    window.addEventListener('rraasi-show-add-coins', handler);
    return () => window.removeEventListener('rraasi-show-add-coins', handler);
  }, []);

  // Listen for data messages from the music agent
  // Use useCallback with no deps so the function identity is stable,
  // but access latest state via refs.
  const onDataMessage = useCallback((msg: any) => {
    try {
      const raw = new TextDecoder().decode(msg.payload);
      console.log('[SessionView] 📡 Raw data channel message:', raw);
      const payload = JSON.parse(raw);
      console.log('[SessionView] 📡 Parsed payload:', payload);

      // Play a track when agent sends audio_url
      if (payload.audio_url && playTrackRef.current) {
        console.log('[SessionView] 🎵 Agent requested playback:', payload);
        playTrackRef.current({
          id: payload.audio_url,
          title: payload.name || payload.title || 'RRAASI Music',
          audioUrl: payload.audio_url,
          artist: payload.artist || 'RRAASI AI',
          imageUrl: payload.image_url,
        });
      }

      // Show buy-coins modal when agent asks for it
      if (payload.type === 'show_add_coins') {
        console.log('[SessionView] 💰 Agent requested Add Coins UI — showing modal NOW');
        setShowBuyCoinsRef.current(true);
        // Also fire a window event so any other component can react
        window.dispatchEvent(new CustomEvent('rraasi-show-add-coins'));
      }
    } catch {
      // Not JSON — ignore
    }
  }, []);

  useDataChannel(onDataMessage);

  useEffect(() => {
    const lastMessage = messages.at(-1);
    const lastMessageIsLocal = lastMessage?.from?.isLocal === true;

    if (scrollAreaRef.current && lastMessageIsLocal) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Update bottom padding based on bottom section height (accounts for player)
  useEffect(() => {
    const updatePadding = () => {
      if (bottomSectionRef.current) {
        const height = bottomSectionRef.current.offsetHeight;
        // Add extra padding to ensure all content is visible
        const newPadding = Math.max(150, height + 20);
        setBottomPadding(newPadding);
      }
    };

    // Update on mount and when chat opens
    updatePadding();
    const resizeObserver = new ResizeObserver(updatePadding);

    if (bottomSectionRef.current) {
      resizeObserver.observe(bottomSectionRef.current);
    }

    // Also update when chat opens/closes
    const timeoutId = setTimeout(updatePadding, 100);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
    };
  }, [chatOpen]);

  // Scroll to bottom when chat opens
  useEffect(() => {
    if (chatOpen && scrollAreaRef.current) {
      // Small delay to ensure padding is updated
      const timeoutId = setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
      }, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [chatOpen, bottomPadding]);

  return (
    <SessionAuthGuard isSessionActive={isSessionActive}>
      <section ref={ref} className="bg-background relative z-10 h-full w-full overflow-hidden" {...props}>
        {/* Agent Sleep Indicator - Blinking dot in top corner */}
        {agentIsSleeping && (
          <div className="fixed top-4 left-4 z-50 flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/20 px-3 py-1.5 shadow-lg backdrop-blur-sm">
            <div className="relative h-3 w-3">
              <div className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-75" />
              <div className="relative h-3 w-3 rounded-full bg-amber-500" />
            </div>
            <span className="animate-pulse text-xs font-semibold text-amber-800 dark:text-amber-200">
              {t('session.agentSleeping')}
            </span>
          </div>
        )}

        {/* Recordings Toggle */}
        {isAuthenticated && (
          <div className="fixed top-4 right-4 z-50 md:right-12">
            <Button
              variant="outline"
              size="sm"
              className="bg-background/80 hover:bg-background backdrop-blur-sm shadow-md gap-2"
              onClick={() => setShowRecordings(true)}
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common.recordings') || 'History'}</span>
            </Button>
          </div>
        )}

        {/* Recordings Modal */}
        <RecordingsModal isOpen={showRecordings} onClose={() => setShowRecordings(false)} />

        {/* Buy Coins Modal - triggered by agent when balance is low */}
        <BuyCoinsModal isOpen={showBuyCoins} onClose={() => setShowBuyCoins(false)} />

        {/* Chat Transcript */}
        <div
          className={cn(
            'fixed inset-0 grid grid-cols-1 grid-rows-1',
            !chatOpen && 'pointer-events-none'
          )}
        >
          <Fade top className="absolute inset-x-4 top-0 h-40" />
          <ScrollArea
            ref={scrollAreaRef}
            className="px-4 pt-40 md:px-6"
            style={{ paddingBottom: `${bottomPadding}px` }}
          >
            <AgentChatTranscript
              agentState={agentIsSleeping ? 'thinking' : 'listening'}
              messages={messages}
              className={cn("mx-auto max-w-2xl space-y-3 transition-opacity duration-300 ease-out", !chatOpen && "hidden")}
            />
          </ScrollArea>
        </div>

        {/* Tile Layout */}
        <TileLayout chatOpen={chatOpen} />

        {/* Bottom */}
        <MotionBottom
          {...BOTTOM_VIEW_MOTION_PROPS}
          className="fixed inset-x-3 bottom-0 z-50 md:inset-x-12"
        >
          {appConfig.isPreConnectBufferEnabled && (
            <PreConnectMessage messages={messages} className="pb-4" />
          )}
          <div
            ref={bottomSectionRef}
            className="bg-background relative mx-auto max-w-2xl pb-[max(12px,env(safe-area-inset-bottom))] md:pb-12"
          >
            <Fade bottom className="absolute inset-x-0 top-0 h-4 -translate-y-full" />
            {/* YouTube Bhajan Player with controls (Removed as per request) */}
            <AgentControlBar controls={controls} onChatOpenChange={setChatOpen} />
          </div>
        </MotionBottom>
      </section>
    </SessionAuthGuard>
  );
});
SessionView.displayName = 'SessionView';
