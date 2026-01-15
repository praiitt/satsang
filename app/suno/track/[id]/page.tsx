
import { Metadata } from 'next';
import { getAdminDb } from '@/lib/firebase-admin';
import { MusicPlayerCard } from '@/components/rraasi-music/music-player-card';
import { Button } from '@/components/livekit/button';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface Props {
    params: { id: string };
    searchParams: { [key: string]: string | string[] | undefined };
}

// Fetch track helper
async function getTrack(id: string) {
    try {
        const db = getAdminDb();
        const doc = await db.collection('music_tracks').doc(id).get();

        if (!doc.exists) return null;

        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            // Serializable dates
            createdAt: data?.createdAt ? new Date(data.createdAt._seconds * 1000).toISOString() : null,
        };
    } catch (error) {
        console.error("Error fetching track:", error);
        return null;
    }
}

// Helper to extract tags safely
function tree_metadata_tags(metadata: any): string | null {
    if (typeof metadata === 'object' && metadata?.tags) {
        return metadata.tags;
    }
    return null;
}

// Dynamic Metadata for Social Sharing
export async function generateMetadata(
    { params }: Props
): Promise<Metadata> {
    // read route params
    const id = params.id;

    // fetch data
    const track = await getTrack(id);

    if (!track) {
        return {
            title: 'Track Not Found | RRAASI Music',
        };
    }

    const title = track.title || 'Spiritual Music by RRAASI';
    const description = track.description || track.prompt || (tree_metadata_tags(track.metadata)) || "Listen to this beautiful spiritual composition created by RRAASI AI.";
    const imageUrl = track.imageUrl || 'https://rraasi.com/icon.png';

    return {
        title: `${title} | RRAASI Music`,
        description: description,
        openGraph: {
            title: title,
            description: description,
            images: [imageUrl],
            url: `https://rraasi.com/suno/track/${id}`,
            type: 'music.song',
        },
        twitter: {
            card: 'summary_large_image',
            title: title,
            description: description,
            images: [imageUrl],
        },
    };
}

export default async function TrackPage({ params }: Props) {
    const track = await getTrack(params.id);

    if (!track) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-black text-white">
                <h1 className="text-2xl font-bold mb-4">Track Not Found</h1>
                <Link href="/suno">
                    <Button variant="outline">Return to Music</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Blur Effect */}
            <div className="absolute inset-0 z-0">
                {track.imageUrl && (
                    <div
                        className="absolute inset-0 bg-cover bg-center opacity-30 blur-3xl scale-125"
                        style={{ backgroundImage: `url(${track.imageUrl})` }}
                    />
                )}
                <div className="absolute inset-0 bg-neutral-950/60" />
            </div>

            <div className="relative z-10 w-full max-w-md flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <Link href="/suno" className="text-sm font-medium text-white/60 hover:text-white flex items-center gap-1 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                        All Music
                    </Link>
                    <div className="text-xs font-bold tracking-widest text-amber-500 uppercase">
                        RRAASI MUSIC
                    </div>
                </div>

                <MusicPlayerCard
                    id={track.id}
                    title={track.title}
                    audioUrl={track.audioUrl}
                    imageUrl={track.imageUrl}
                    category={track.category || "Music"}
                    description={track.description || track.prompt}
                    createdAt={track.createdAt}
                    status={track.status}
                    metadata={track.metadata}
                />

                <div className="text-center space-y-4">
                    <Link href="/suno">
                        <Button className="bg-white/10 hover:bg-white/20 text-white border-white/10 w-full backdrop-blur-md">
                            Discover More Spiritual AI Music
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
