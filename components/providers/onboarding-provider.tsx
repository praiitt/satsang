'use client';

import { useUserProfile } from '@/hooks/useUserProfile';
import { OnboardingModal } from '@/components/ui/onboarding-modal';

/**
 * Onboarding Provider - Shows onboarding modal when needed
 */
export function OnboardingProvider({ children }: { children: React.ReactNode }) {
    const { needsOnboarding, refreshProfile } = useUserProfile();

    return (
        <>
            {children}
            <OnboardingModal
                isOpen={needsOnboarding}
                onComplete={() => {
                    refreshProfile();
                }}
            />
        </>
    );
}
