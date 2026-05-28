'use client';

import { useRef, useEffect } from 'react';
import { AnimatePresence, type Transition, type Variants, motion } from 'motion/react';
import { RoomAudioRenderer, StartAudio, useRoomContext } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { SessionProvider, useSession } from '@/components/app/session-provider';
import { SessionView } from '@/components/app/session-view';
import { Toaster } from '@/components/livekit/toaster';
import { PWAInstaller } from '@/components/pwa-installer';
import { StudioDashboard } from '@/components/spiritual-studio/studio-dashboard';
import { PoetsLandingView } from '@/components/spiritual-studio/poets-landing-view';

const MotionDashboard = motion.create(StudioDashboard);
const MotionPoetsView = motion.create(PoetsLandingView);
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

function SpiritualStudioViewController({ variant = 'default' }: { variant?: 'default' | 'poets' }) {
    const room = useRoomContext();
    const isSessionActiveRef = useRef(false);
    const { appConfig, isSessionActive, startSession } = useSession();

    // Listen for custom start session events (e.g. from RecordingsModal)
    useEffect(() => {
        const handleStartSession = (event: CustomEvent) => {
            const { intention, resumeSessionId } = event.detail;
            console.log("[SpiritualStudioApp] Starting session from event:", { intention, resumeSessionId });
            startSession({ intention, resumeSessionId });
        };

        window.addEventListener('spiritual-studio-start-session', handleStartSession as EventListener);
        return () => {
            window.removeEventListener('spiritual-studio-start-session', handleStartSession as EventListener);
        };
    }, [startSession]);

    isSessionActiveRef.current = isSessionActive;

    const handleAnimationComplete = () => {
        if (!isSessionActiveRef.current && room.state !== 'disconnected') {
            room.disconnect();
        }
    };

    return (
        <AnimatePresence mode="wait">
            {!isSessionActive && (
                variant === 'poets' ? (
                    <MotionPoetsView key="poets-welcome" {...VIEW_MOTION_PROPS} onStartCall={startSession} />
                ) : (
                    <MotionDashboard key="welcome" {...VIEW_MOTION_PROPS} onStartCall={startSession} />
                )
            )}
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

interface SpiritualStudioAppProps {
    appConfig: AppConfig;
    variant?: 'default' | 'poets';
}

export function SpiritualStudioApp({ appConfig, variant = 'default' }: SpiritualStudioAppProps) {
    return (
        <SessionProvider appConfig={appConfig}>
            <main className="min-h-svh w-full overflow-y-auto">
                <SpiritualStudioViewController variant={variant} />
            </main>
            <StartAudio label="Start Audio" />
            <RoomAudioRenderer />
            <Toaster />
            <PWAInstaller />
        </SessionProvider>
    );
}
