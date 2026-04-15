
import { Metadata } from 'next';
import { getAdminDb } from '@/lib/firebase-admin';
import { MusicPlayerCard } from '@/components/rraasi-music/music-player-card';
import { Button } from '@/components/livekit/button';
import Link from 'next/link';
import { ChevronLeft, Sparkles, Moon, Atom } from 'lucide-react';

interface Props {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Fetch track helper
async function getTrack(id: string) {
    try {
        const db = getAdminDb();
        const doc = await db.collection('music_tracks').doc(id).get();

        if (!doc.exists) return null;

        const data = doc.data();
        let trackAudioUrl = data?.audioUrl || data?.audio_url;
        let trackImageUrl = data?.imageUrl || data?.image_url;
        
        // If audioUrl is missing at the root, check if there's a nested tracks array
        if (!trackAudioUrl && data?.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
            trackAudioUrl = data.tracks[0].audioUrl || data.tracks[0].streamAudioUrl || data.tracks[0].sourceAudioUrl;
            trackImageUrl = data.tracks[0].imageUrl || data.tracks[0].sourceImageUrl || trackImageUrl;
        }

        // Safe date parsing
        let createdAt = null;
        if (data?.createdAt) {
            if (typeof data.createdAt === 'string') {
                createdAt = data.createdAt;
            } else if (data.createdAt._seconds) {
                createdAt = new Date(data.createdAt._seconds * 1000).toISOString();
            } else {
                // Try parsing as a generic date object if it's something else
                try {
                    createdAt = new Date(data.createdAt).toISOString();
                } catch {
                    createdAt = null;
                }
            }
        }

        return {
            id: doc.id,
            ...data,
            audioUrl: trackAudioUrl,
            imageUrl: trackImageUrl,
            createdAt: createdAt,
            story: data?.story,
            lyrics: data?.lyrics,
            healingBenefits: data?.healingBenefits,
            tags: data?.tags || tree_metadata_tags(data),
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
    props: Props
): Promise<Metadata> {
    const params = await props.params;
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
    const imageUrl = track.imageUrl || 'https://www.rraasi.com/icon.png';

    return {
        title: `${title} | RRAASI Music`,
        description: description,
        openGraph: {
            title: title,
            description: description,
            images: [imageUrl],
            url: `https://www.rraasi.com/track/${id}`,
            type: 'music.song',
            audio: track.audioUrl,
        },
        twitter: {
            card: 'summary_large_image',
            title: title,
            description: description,
            images: [imageUrl],
        },
    };
}

export default async function TrackPage(props: Props) {
    const params = await props.params;
    const track = await getTrack(params.id);

    if (!track) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-black text-white">
                <h1 className="text-2xl font-bold mb-4">Track Not Found</h1>
                <Link href="/rraasi-music">
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
                    <Link href="/rraasi-music" className="text-sm font-medium text-white/60 hover:text-white flex items-center gap-1 transition-colors">
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
                    story={track.story}
                    lyrics={track.lyrics}
                    healingBenefits={track.healingBenefits}
                    tags={track.tags}
                    enableDownload={true}
                />

                {/* Journey of this Track Section */}
                {(track.story || track.lyrics || (track.healingBenefits?.length > 0)) && (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-8 backdrop-blur-md mt-4">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
                                Journey of this Track
                            </h2>
                            <p className="text-sm text-white/50 w-full max-w-sm mx-auto">
                                The spiritual essence and meaning behind the music
                            </p>
                        </div>
                        
                        {track.story && (
                            <section className="space-y-3">
                                <h3 className="text-sm font-bold tracking-widest text-amber-500 uppercase flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> The Story
                                </h3>
                                <p className="text-white/80 leading-relaxed text-sm sm:text-base font-light p-4 bg-white/5 rounded-2xl">
                                    {track.story}
                                </p>
                            </section>
                        )}
                        
                        {track.healingBenefits && track.healingBenefits.length > 0 && (
                            <section className="space-y-3">
                                <h3 className="text-sm font-bold tracking-widest text-rose-400 uppercase flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> Healing Benefits
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {track.healingBenefits.map((benefit: string, i: number) => (
                                        <span key={i} className="px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-300 text-sm font-medium border border-rose-500/20">
                                            {benefit}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}

                        {track.lyrics && track.lyrics.trim() !== '' && (
                            <section className="space-y-3">
                                <h3 className="text-sm font-bold tracking-widest text-cyan-400 uppercase flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> Lyrics & Mantras
                                </h3>
                                <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/10">
                                    <pre className="whitespace-pre-wrap font-sans text-cyan-50/80 text-sm sm:text-base leading-relaxed">
                                        {track.lyrics}
                                    </pre>
                                </div>
                            </section>
                        )}
                    </div>
                )}

                <div className="text-center space-y-4 mt-4">
                    <Link href="/rraasi-music">
                        <Button className="bg-white/10 hover:bg-white/20 text-white border-white/10 w-full backdrop-blur-md">
                            Discover More Spiritual AI Music
                        </Button>
                    </Link>
                </div>

                {/* Cross-Selling Section */}
                <div className="pt-8 border-t border-white/10">
                    <h3 className="text-center text-sm font-semibold text-amber-500 uppercase tracking-widest mb-6">Explore Rraasi Universe</h3>
                    <div className="grid grid-cols-1 gap-4">
                        <Link href="/meditation" className="group block">
                            <div className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-all hover:scale-[1.02] flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:text-purple-300">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-white">AI Guided Meditation</div>
                                    <div className="text-xs text-white/60">Find your inner peace with AI</div>
                                </div>
                            </div>
                        </Link>

                        <Link href="/vedic-jyotish" className="group block">
                            <div className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-all hover:scale-[1.02] flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:text-indigo-300">
                                    <Moon className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-white">Vedic Astrology</div>
                                    <div className="text-xs text-white/60">Ancient wisdom, modern insights</div>
                                </div>
                            </div>
                        </Link>

                        <Link href="/business" className="group block">
                            <div className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-all hover:scale-[1.02] flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:text-amber-300">
                                    <Atom className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-white">AI for Business</div>
                                    <div className="text-xs text-white/60">Transform your work with AI Agents</div>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
