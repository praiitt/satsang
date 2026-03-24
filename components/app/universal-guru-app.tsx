'use client';

import { useRef, useState, useEffect } from 'react';
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
    theme,
    guruImage
}: {
    guruId: string;
    guruName: string;
    traditionName?: string;
    traditionEmoji?: string;
    theme?: string;
    guruImage?: string;
}) {
    const room = useRoomContext();
    const isSessionActiveRef = useRef(false);
    const { appConfig, isSessionActive, startSession } = useSession();

    // Prasad State
    const [lastRoomName, setLastRoomName] = useState<string | null>(null);
    const [prasadText, setPrasadText] = useState<string | null>(null);

    // Track active room name
    useEffect(() => {
        if (isSessionActive && room?.name) {
            setLastRoomName(room.name);
            setPrasadText(null); // Clear previous
        }
    }, [isSessionActive, room?.name]);

    // Fetch Prasad when session ends
    useEffect(() => {
        if (!isSessionActive && lastRoomName && !prasadText) {
            let attempts = 0;
            let pollingInterval: any = null;

            const fetchPrasad = async () => {
                try {
                    attempts++;
                    if (attempts > 10) { // Try for 40 sec
                        clearInterval(pollingInterval);
                        return;
                    }
                    const res = await fetch(`/api/satsang/summary?roomName=${lastRoomName}&guruId=${guruId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.summary) {
                            setPrasadText(data.summary);
                            clearInterval(pollingInterval);
                            setLastRoomName(null); // Cleanup
                        } else if (!data.pending) {
                            clearInterval(pollingInterval);
                        }
                    }
                } catch (e) { }
            };

            pollingInterval = setInterval(fetchPrasad, 4000);
            fetchPrasad();

            return () => {
                if (pollingInterval) clearInterval(pollingInterval);
            };
        }
    }, [isSessionActive, lastRoomName, prasadText, guruId]);

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
                    traditionEmoji={traditionEmoji}
                    theme={theme}
                    guruImage={guruImage}
                    prasadText={prasadText}
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
    traditionEmoji?: string;
    theme?: string;
    guruImage?: string;
}

export function UniversalGuruApp({ appConfig, guruId, guruName, traditionName, traditionEmoji, theme, guruImage }: UniversalGuruAppProps) {
    return (
        <SessionProvider appConfig={appConfig}>
            <main className="min-h-svh w-full overflow-y-auto">
                <UniversalGuruViewController
                    guruId={guruId}
                    guruName={guruName}
                    traditionName={traditionName}
                    traditionEmoji={traditionEmoji}
                    traditionEmoji={traditionEmoji}
                    theme={theme}
                    guruImage={guruImage}
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
