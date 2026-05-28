'use client';

import { useRef } from 'react';
import { AnimatePresence, type Transition, type Variants, motion } from 'motion/react';
import { RoomAudioRenderer, StartAudio, useRoomContext } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { SessionProvider, useSession } from '@/components/app/session-provider';
import { SessionView } from '@/components/app/session-view';
import { Toaster } from '@/components/livekit/toaster';
import { PWAInstaller } from '@/components/pwa-installer';
import { VedicAstrologyWelcomeView } from '@/components/vedic-astrology/vedic-astrology-welcome-view';
import { VedicAstrologyOnboardingView } from '@/components/vedic-astrology/vedic-astrology-onboarding-view';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase-client';
import { useAuth } from '@/components/auth/auth-provider';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const MotionWelcomeView = motion.create(VedicAstrologyWelcomeView);
const MotionOnboardingView = motion.create(VedicAstrologyOnboardingView);
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

function VedicAstrologyViewController() {
    const room = useRoomContext();
    const isSessionActiveRef = useRef(false);
    const { appConfig, isSessionActive, startSession } = useSession();
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const pdfUrl = searchParams.get('pdfUrl');
    const pdfTitle = searchParams.get('pdfTitle');

    const [isOnboarding, setIsOnboarding] = useState(true);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push(`/login?returnUrl=${encodeURIComponent(pathname)}`);
        }
    }, [authLoading, isAuthenticated, pathname, router]);

    useEffect(() => {
        const checkOnboarding = async () => {
            if (authLoading) return;
            if (!user?.uid || !isAuthenticated) {
                setIsChecking(false);
                return;
            }
            try {
                const db = getFirebaseFirestore();
                const q = query(collection(db, 'charts'), where('userId', '==', user.uid));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    setIsOnboarding(false);
                }
            } catch (err) {
                console.error('Error checking charts:', err);
            } finally {
                setIsChecking(false);
            }
        };
        checkOnboarding();
    }, [user?.uid, authLoading, isAuthenticated]);

    // Auto-start session if PDF context was passed from reports page
    useEffect(() => {
      if (!isChecking && !isOnboarding && !isSessionActive && pdfUrl) {
        const intention = `The user wants to discuss their Vedic astrology PDF report titled "${pdfTitle || 'Horoscope Report'}". The report is available at: ${pdfUrl}. Please help the user understand the technical Jyotish terms and insights from their report in simple language.`;
        startSession({ intention });
      }
    }, [isChecking, isOnboarding, isSessionActive, pdfUrl]);

    isSessionActiveRef.current = isSessionActive;

    const handleAnimationComplete = () => {
        if (!isSessionActiveRef.current && room.state !== 'disconnected') {
            room.disconnect();
        }
    };

    return (
        <AnimatePresence mode="wait">
            {(isChecking || authLoading || (!authLoading && !isAuthenticated)) && (
                <motion.div key="loading" {...VIEW_MOTION_PROPS} className="flex min-h-svh w-full items-center justify-center text-orange-500">
                    <span className="h-8 w-8 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
                </motion.div>
            )}
            {!isChecking && !authLoading && isAuthenticated && !isSessionActive && isOnboarding && (
                <MotionOnboardingView key="onboarding" {...VIEW_MOTION_PROPS} onComplete={() => setIsOnboarding(false)} />
            )}
            {!isChecking && !authLoading && isAuthenticated && !isSessionActive && !isOnboarding && (
                <MotionWelcomeView key="welcome" {...VIEW_MOTION_PROPS} onStartCall={startSession} />
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

interface VedicAstrologyAppProps {
    appConfig: AppConfig;
}

export function VedicAstrologyApp({ appConfig }: VedicAstrologyAppProps) {
    return (
        <SessionProvider appConfig={appConfig}>
            <main className="min-h-svh w-full overflow-y-auto">
                <VedicAstrologyViewController />
            </main>
            <StartAudio label="Start Audio" />
            <RoomAudioRenderer />
            <Toaster />
            <PWAInstaller />
        </SessionProvider>
    );
}
