'use client';

import { useRef } from 'react';
import { AnimatePresence, type Transition, type Variants, motion } from 'motion/react';
import { RoomAudioRenderer, StartAudio, useRoomContext } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { SessionProvider, useSession } from '@/components/app/session-provider';
import { SessionView } from '@/components/app/session-view';
import { Toaster } from '@/components/livekit/toaster';
import { PWAInstaller } from '@/components/pwa-installer';
import { MeditationWelcomeView } from '@/components/meditation/meditation-welcome-view';

const MotionWelcomeView = motion.create(MeditationWelcomeView);
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

function MeditationViewController() {
    const room = useRoomContext();
    const isSessionActiveRef = useRef(false);
    const { appConfig, isSessionActive, startSession } = useSession();

    isSessionActiveRef.current = isSessionActive;

    const handleAnimationComplete = () => {
        if (!isSessionActiveRef.current && room.state !== 'disconnected') {
            room.disconnect();
        }
    };

    return (
        <AnimatePresence mode="wait">
            {!isSessionActive && (
                <MotionWelcomeView
                    key="meditation-welcome"
                    {...VIEW_MOTION_PROPS}
                    onStartCall={startSession}
                />
            )}
            {isSessionActive && (
                <MotionSessionView
                    key="meditation-session"
                    {...VIEW_MOTION_PROPS}
                    appConfig={appConfig}
                    onAnimationComplete={handleAnimationComplete}
                />
            )}
        </AnimatePresence>
    );
}

interface MeditationAppProps {
    appConfig: AppConfig;
}

export function MeditationApp({ appConfig }: MeditationAppProps) {
    return (
        <SessionProvider appConfig={appConfig}>
            <main className="min-h-svh w-full overflow-y-auto bg-gradient-to-b from-indigo-950 via-purple-900 to-indigo-950">
                <MeditationViewController />
            </main>
            <StartAudio label="Start Audio" />
            <RoomAudioRenderer />
            <Toaster />
            <PWAInstaller />
        </SessionProvider>
    );
}
