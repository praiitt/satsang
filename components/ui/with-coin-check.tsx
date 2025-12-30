'use client';

import { useState } from 'react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { UpgradeModal } from '@/components/ui/upgrade-modal';
import { useAuth } from '@/components/auth/auth-provider';
import { toast } from 'sonner';

interface WithCoinCheckProps {
    featureId: string;
    featureName: string;
    onSuccess: () => void;
    children: (props: { onClick: () => void; loading: boolean }) => React.ReactNode;
}

/**
 * Higher-order component that wraps feature access with coin checking
 * 
 * Usage:
 * <WithCoinCheck featureId="guru_chat_extended" featureName="Extended Guru Chat" onSuccess={startSession}>
 *   {({ onClick, loading }) => (
 *     <Button onClick={onClick} disabled={loading}>Start Chat</Button>
 *   )}
 * </WithCoinCheck>
 */
export function WithCoinCheck({
    featureId,
    featureName,
    onSuccess,
    children
}: WithCoinCheckProps) {
    const { isAuthenticated } = useAuth();
    const { checkAccess, loading } = useFeatureAccess();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [accessDetails, setAccessDetails] = useState<{
        required?: number;
        available?: number;
    }>({});

    const handleClick = async () => {
        if (!isAuthenticated) {
            toast.error('Please login to use this feature');
            return;
        }

        const access = await checkAccess(featureId);

        if (!access) {
            toast.error('Failed to check access. Please try again.');
            return;
        }

        if (access.hasAccess) {
            // Has access - proceed
            onSuccess();
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
            {children({ onClick: handleClick, loading })}

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                featureName={featureName}
                requiredCoins={accessDetails.required}
                availableCoins={accessDetails.available}
            />
        </>
    );
}

export default WithCoinCheck;
