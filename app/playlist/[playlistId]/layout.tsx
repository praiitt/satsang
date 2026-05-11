import type { Metadata } from 'next';
import { MusicPlayerProvider } from '@/contexts/music-player-context';
import { FloatingPlayer } from '@/components/rraasi-music/floating-player';

export const metadata: Metadata = {
    title: 'RRAASI Playlist',
    description: 'Listen to curated spiritual music playlists on RRAASI.',
};

export default function PlaylistLayout({ children }: { children: React.ReactNode }) {
    return (
        <MusicPlayerProvider>
            {children}
            <FloatingPlayer />
        </MusicPlayerProvider>
    );
}
