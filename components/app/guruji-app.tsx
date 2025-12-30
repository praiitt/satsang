'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, type Transition, type Variants, motion } from 'motion/react';
import { RoomAudioRenderer, StartAudio, useRoomContext } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { GurujiWelcomeView } from '@/components/app/guruji-welcome-view';
import { SessionProvider, useSession } from '@/components/app/session-provider';
import { SessionView } from '@/components/app/session-view';
import { HeygenAvatarPlayer } from '@/components/heygen/heygen-avatar-player';
import { Toaster } from '@/components/livekit/toaster';
import { PWAInstaller } from '@/components/pwa-installer';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { UpgradeModal } from '@/components/ui/upgrade-modal';
import { useAuth } from '@/components/auth/auth-provider';
import { toast } from 'sonner';

const MotionGurujiWelcomeView = motion.create(GurujiWelcomeView);
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

function GurujiViewController() {
    const room = useRoomContext();
    const isSessionActiveRef = useRef(false);
    const { appConfig, isSessionActive, startSession } = useSession();
    const { isAuthenticated } = useAuth();
    const { checkAccess } = useFeatureAccess();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [accessDetails, setAccessDetails] = useState<{
        required?: number;
        available?: number;
    }>({});

    // animation handler holds a reference to stale isSessionActive value
    isSessionActiveRef.current = isSessionActive;

    // disconnect room after animation completes
    const handleAnimationComplete = () => {
        if (!isSessionActiveRef.current && room.state !== 'disconnected') {
            room.disconnect();
        }
    };

    // Handle start session with coin check
    const handleStartSession = async () => {
        if (!isAuthenticated) {
            toast.error('Please login to start a conversation');
            return;
        }

        // Check coin access for basic guru chat
        const access = await checkAccess('guru_chat_basic');

        if (!access) {
            toast.error('Failed to check access. Please try again.');
            return;
        }

        if (access.hasAccess) {
            // Has access - start session
            startSession();
        } else {
            // No access - show upgrade modal
            setAccessDetails({
                required: access.requiredCoins,
                available: access.availableCoins
            });
            setShowUpgradeModal(true);
        }
    };

    return (
        <>
            <AnimatePresence mode="wait">
                {/* Welcome screen */}
                {!isSessionActive && (
                    <MotionGurujiWelcomeView
                        key="welcome"
                        {...VIEW_MOTION_PROPS}
                        onStartCall={handleStartSession}
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

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                featureName="Guru Chat"
                requiredCoins={accessDetails.required}
                availableCoins={accessDetails.available}
            />
        </>
    );
}

interface GurujiAppProps {
    appConfig: AppConfig;
}

export function GurujiApp({ appConfig }: GurujiAppProps) {
    return (
        <SessionProvider appConfig={appConfig}>
            <main className="min-h-svh w-full overflow-y-auto">
                <GurujiViewController />
            </main>
            <StartAudio label="Start Audio" />
            <RoomAudioRenderer />
            {appConfig.enableHeygenAvatar ? <HeygenAvatarPlayer /> : null}
            {/* YouTube bhajan player is in SessionView (inside RoomContext) */}
            <Toaster />
            <PWAInstaller />
        </SessionProvider>
    );
}
