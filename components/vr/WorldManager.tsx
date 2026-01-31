'use client';

import { useState } from 'react';
import { Lobby } from './Lobby';
import { MeditationRoom } from './rooms/MeditationRoom';
import { MusicRoom } from './rooms/MusicRoom';

export type VRLocation = 'lobby' | 'meditation' | 'astrology' | 'music';

export function WorldManager() {
    const [location, setLocation] = useState<VRLocation>('lobby');

    const navigateTo = (loc: VRLocation) => {
        // We can add fade transition logic here later
        setLocation(loc);
    };

    return (
        <>
            {location === 'lobby' && (
                <Lobby onNavigate={navigateTo} />
            )}

            {location === 'meditation' && (
                <MeditationRoom onExit={() => navigateTo('lobby')} />
            )}

            {location === 'music' && (
                <MusicRoom onExit={() => navigateTo('lobby')} />
            )}

            {/* Placeholder for Astrology - redirect to lobby for now or show coming soon */}
            {location === 'astrology' && (
                <Lobby onNavigate={navigateTo} />
            )}
        </>
    );
}
