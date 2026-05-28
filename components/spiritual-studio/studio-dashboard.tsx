'use client';

import { DiscoverFeedView } from './discover-feed-view';
import { motion } from 'framer-motion';

export function StudioDashboard({ onStartCall }: { onStartCall: (options?: { intention?: string }) => void }) {
    return (
        <div className="w-full min-h-screen bg-[#050505] text-white">
            <DiscoverFeedView onStartCall={onStartCall} />
        </div>
    );
}
