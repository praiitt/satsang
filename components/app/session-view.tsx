'use client';

import React, { useEffect, useRef, useState } from 'react';
import { type Transition, type Variants, motion } from 'motion/react';
import type { AppConfig } from '@/app-config';
import { ChatTranscript } from '@/components/app/chat-transcript';
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
import { useChatMessages } from '@/hooks/useChatMessages';
import { useConnectionTimeout } from '@/hooks/useConnectionTimout';
import { useDebugMode } from '@/hooks/useDebug';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { useWakeLock } from '@/hooks/useWakeLock';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../livekit/scroll-area/scroll-area';

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

export const SessionView = ({
  appConfig,
  ...props
}: React.ComponentProps<'section'> & SessionViewProps) => {
  useConnectionTimeout(200_000);
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useWakeLock(true);

  // Idle timeout: disconnect after 5 minutes of inactivity (configurable via env)
  const idleTimeoutMs = process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MS
    ? parseInt(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MS, 10)
    : 5 * 60 * 1000; // Default: 5 minutes
  useIdleTimeout(idleTimeoutMs, true);

  const { isSessionActive } = useSession();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { minutesRemaining, secondsRemaining, isTrialExpired } = useSessionTimer(isSessionActive);
  const messages = useChatMessages();
  const [chatOpen, setChatOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomSectionRef = useRef<HTMLDivElement>(null);
  const [bottomPadding, setBottomPadding] = useState(150);

  const controls: ControlBarControls = {
    leave: true,
    microphone: true,
    chat: appConfig.supportsChatInput,
    camera: appConfig.supportsVideoInput,
    screenShare: appConfig.supportsVideoInput,
  };

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
      <section className="bg-background relative z-10 h-full w-full overflow-hidden" {...props}>
        {/* Free Trial Timer Indicator - Only show if user is not authenticated */}
        {!isAuthenticated && !isTrialExpired && (
          <div className="bg-muted/80 text-muted-foreground fixed top-20 right-4 z-50 rounded-lg border px-3 py-2 text-sm shadow-lg md:top-4">
            <div className="font-semibold">{t('common.freeTrial')}</div>
            <div className="text-xs">
              {minutesRemaining}:{secondsRemaining.toString().padStart(2, '0')}{' '}
              {t('common.remaining')}
            </div>
          </div>
        )}

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
            <ChatTranscript
              hidden={!chatOpen}
              messages={messages}
              className="mx-auto max-w-2xl space-y-3 transition-opacity duration-300 ease-out"
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
            {/* YouTube Bhajan Player with controls */}
            <div className="mb-2 px-3">
              <YouTubeBhajanPlayer />
            </div>
            <AgentControlBar controls={controls} onChatOpenChange={setChatOpen} />
          </div>
        </MotionBottom>
      </section>
    </SessionAuthGuard>
  );
};
