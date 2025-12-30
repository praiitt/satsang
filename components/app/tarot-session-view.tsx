'use client';

import React, { useRef, useState } from 'react';
import { type Transition, type Variants, motion } from 'motion/react';
import type { AppConfig } from '@/app-config';
import { ChatTranscript } from '@/components/app/chat-transcript';
import { useSession } from '@/components/app/session-provider';
import { TarotTable } from '@/components/app/tarot-table';
import { SessionAuthGuard } from '@/components/auth/session-auth-guard';
import {
    AgentControlBar,
    type ControlBarControls,
} from '@/components/livekit/agent-control-bar/agent-control-bar';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useConnectionTimeout } from '@/hooks/useConnectionTimout';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../livekit/scroll-area/scroll-area';
import { RoomAudioRenderer } from '@livekit/components-react';

const MotionBottom = motion.create('div');

const bottomVariants: Variants = {
    visible: { opacity: 1, translateY: '0%' },
    hidden: { opacity: 0, translateY: '100%' },
};

const BOTTOM_VIEW_MOTION_PROPS = {
    variants: bottomVariants,
    initial: 'hidden',
    animate: 'visible',
    exit: 'hidden',
    transition: { duration: 0.3, delay: 0.5 },
} as const;

interface TarotSessionViewProps {
    appConfig: AppConfig;
    onAnimationComplete?: () => void;
}

export function TarotSessionView({ appConfig, onAnimationComplete, ...props }: React.ComponentProps<'section'> & TarotSessionViewProps) {
    useConnectionTimeout(60_000);

    const { isSessionActive } = useSession();
    const messages = useChatMessages();
    const [chatOpen, setChatOpen] = useState(true); // Default to open for visibility
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const controls: ControlBarControls = {
        leave: true,
        microphone: true,
        chat: true,
        camera: false,
        screenShare: false,
    };

    return (
        <SessionAuthGuard isSessionActive={isSessionActive}>
            <section className="bg-background relative z-10 h-full w-full overflow-hidden flex flex-col" {...props}>

                {/* 1. Top Section: Tarot Table (Fixed height to fit cards) */}
                <div className="h-[450px] shrink-0 relative w-full bg-gradient-to-b from-slate-950 to-indigo-950/50">
                    <TarotTable className="w-full h-full" />
                    <RoomAudioRenderer />
                </div>

                {/* 2. Middle Section: Chat Transcript (Takes remaining space) */}
                <div className={cn(
                    "flex-1 w-full border-t border-white/10 bg-black/40 backdrop-blur-md flex flex-col min-h-0 transition-all duration-300",
                    !chatOpen && "h-0 border-none opacity-0 overflow-hidden"
                )}>
                    <ScrollArea ref={scrollAreaRef} className="flex-1 w-full p-4">
                        <ChatTranscript messages={messages} />
                    </ScrollArea>
                </div>

                {/* 3. Bottom Section: Controls (Static, Fixed Height) */}
                <MotionBottom
                    {...BOTTOM_VIEW_MOTION_PROPS}
                    className="w-full bg-slate-950 border-t border-white/10 z-50 p-4 shrink-0 flex justify-center items-center"
                    onAnimationComplete={onAnimationComplete}
                >
                    {/* Controls Container - Centered and constrained */}
                    <div className="w-full max-w-2xl">
                        <AgentControlBar controls={controls} onChatOpenChange={setChatOpen} className="w-full shadow-none border-none bg-transparent" />
                    </div>
                </MotionBottom>

            </section>
        </SessionAuthGuard>
    );
}
