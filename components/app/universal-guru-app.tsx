'use client';

import { useRef } from 'react';
import { AnimatePresence, type Transition, type Variants, motion } from 'motion/react';
import { RoomAudioRenderer, StartAudio, useRoomContext } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { UniversalGuruWelcomeView } from '@/components/app/universal-guru-welcome';
import { SessionProvider, useSession } from '@/components/app/session-provider';
import { SessionView } from '@/components/app/session-view';
import { HeygenAvatarPlayer } from '@/components/heygen/heygen-avatar-player';
import { Toaster } from '@/components/livekit/toaster';
import { PWAInstaller } from '@/components/pwa-installer';

const MotionUniversalGuruWelcomeView = motion.create(UniversalGuruWelcomeView);
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

function UniversalGuruViewController({
    guruId,
    guruName,
    traditionName,
    traditionEmoji,
    theme
}: {
    guruId: string;
    guruName: string;
    traditionName?: string;
    traditionEmoji?: string;
    theme?: string;
}) {
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
                <MotionUniversalGuruWelcomeView
                    key="welcome"
                    {...VIEW_MOTION_PROPS}
                    onStartCall={startSession}
                    guruId={guruId}
                    guruName={guruName}
                    traditionName={traditionName}
                    traditionEmoji={traditionEmoji}
                    theme={theme}
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

interface UniversalGuruAppProps {
    appConfig: AppConfig;
    guruId: string;
    guruName: string;
    traditionName?: string;
    traditionEmoji?: string;
    theme?: string;
}

export function UniversalGuruApp({ appConfig, guruId, guruName, traditionName, traditionEmoji, theme }: UniversalGuruAppProps) {
    return (
        <SessionProvider appConfig={appConfig}>
            <main className="min-h-svh w-full overflow-y-auto">
                <UniversalGuruViewController
                    guruId={guruId}
                    guruName={guruName}
                    traditionName={traditionName}
                    traditionEmoji={traditionEmoji}
                    theme={theme}
                />
            </main>
            <StartAudio label="Start Audio" />
            <RoomAudioRenderer />
            {appConfig.enableHeygenAvatar ? <HeygenAvatarPlayer /> : null}
            <Toaster />
            <PWAInstaller />
        </SessionProvider>
    );
}
