'use client';

import { useRef } from 'react';
import { AnimatePresence, type Transition, type Variants, motion } from 'motion/react';
import { RoomAudioRenderer, StartAudio, useRoomContext } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { HinduismWelcomeView } from '@/components/app/hinduism-welcome-view';
import { SessionProvider, useSession } from '@/components/app/session-provider';
import { SessionView } from '@/components/app/session-view';
import { HeygenAvatarPlayer } from '@/components/heygen/heygen-avatar-player';
import { Toaster } from '@/components/livekit/toaster';
import { PWAInstaller } from '@/components/pwa-installer';

const MotionHinduismWelcomeView = motion.create(HinduismWelcomeView);
const MotionSessionView = motion.create(SessionView);

const viewVariants: Variants = {
    visible: {
        opacity: 1,
    },
    hidden: {
        opacity: 0,
    },
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

function HinduismViewController({ guruId, guruName }: { guruId: string; guruName: string }) {
    const room = useRoomContext();
    const isSessionActiveRef = useRef(false);
    const { appConfig, isSessionActive, startSession } = useSession();

    // animation handler holds a reference to stale isSessionActive value
    isSessionActiveRef.current = isSessionActive;

    // disconnect room after animation completes
    const handleAnimationComplete = () => {
        if (!isSessionActiveRef.current && room.state !== 'disconnected') {
            room.disconnect();
        }
    };

    return (
        <AnimatePresence mode="wait">
            {/* Welcome screen */}
            {!isSessionActive && (
                <MotionHinduismWelcomeView
                    key="welcome"
                    {...VIEW_MOTION_PROPS}
                    onStartCall={startSession}
                    guruId={guruId}
                    guruName={guruName}
                />
            )}
            {/* Session view */}
            {isSessionActive && (
                <MotionSessionView
                    key="session-view"
                    {...VIEW_MOTION_PROPS}
                    appConfig={appConfig}
                    onAnimationComplete={handleAnimationComplete}
                />
            )}
        </AnimatePresence>
    );
}

interface HinduismAppProps {
    appConfig: AppConfig;
    guruId: string;
    guruName: string;
}

export function HinduismApp({ appConfig, guruId, guruName }: HinduismAppProps) {
    return (
        <SessionProvider appConfig={appConfig}>
            <main className="min-h-svh w-full overflow-y-auto">
                <HinduismViewController guruId={guruId} guruName={guruName} />
            </main>
            <StartAudio label="Start Audio" />
            <RoomAudioRenderer />
            {appConfig.enableHeygenAvatar ? <HeygenAvatarPlayer /> : null}
            <Toaster />
            <PWAInstaller />
        </SessionProvider>
    );
}
