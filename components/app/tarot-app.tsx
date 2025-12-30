'use client';

import { useRef } from 'react';
import { AnimatePresence, type Transition, type Variants, motion } from 'motion/react';
import { RoomAudioRenderer, StartAudio, useRoomContext } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { TarotEarlyAccessView } from '@/components/app/tarot-early-access-view';
import { SessionProvider, useSession } from '@/components/app/session-provider';
import { TarotSessionView } from '@/components/app/tarot-session-view';
import { Toaster } from '@/components/livekit/toaster';

const MotionEarlyAccessView = motion.create(TarotEarlyAccessView);
const MotionSessionView = motion.create(TarotSessionView);

const viewVariants: Variants = {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
};

const viewTransition: Transition = {
    duration: 0.5,
    ease: [0.16, 1, 0.3, 1],
};

const VIEW_MOTION_PROPS = {
    variants: viewVariants,
    initial: 'hidden',
    animate: 'visible',
    exit: 'hidden',
    transition: viewTransition,
} as const;

function TarotViewController() {
    // Show early access for now since Tarot is coming soon
    return (
        <AnimatePresence mode="wait">
            <MotionEarlyAccessView key="early-access" {...VIEW_MOTION_PROPS} />
        </AnimatePresence>
    );
}

interface TarotAppProps {
    appConfig: AppConfig;
}

export function TarotApp({ appConfig }: TarotAppProps) {
    return (
        <SessionProvider appConfig={appConfig}>
            <main className="h-screen w-full overflow-hidden bg-black text-amber-100">
                <TarotViewController />
            </main>
            <StartAudio label="Connect to the Cards" />
            <RoomAudioRenderer />
            <Toaster />
        </SessionProvider>
    );
}
