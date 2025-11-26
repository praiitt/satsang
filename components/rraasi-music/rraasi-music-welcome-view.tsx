'use client';

import { Button } from '@/components/livekit/button';

function MusicIcon() {
    return (
        <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-fg0 mb-4 size-16"
        >
            {/* Musical note with healing frequency waves */}
            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
            <circle cx="32" cy="32" r="16" stroke="currentColor" strokeWidth="2" />
            <path
                d="M32 20 L32 44 M28 42 A4 4 0 1 0 36 42 A4 4 0 1 0 28 42"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="currentColor"
            />
        </svg>
    );
}

interface RRaaSiMusicWelcomeViewProps {
    onStartCall: () => void;
}

export const RRaaSiMusicWelcomeView = ({
    onStartCall,
    ref,
}: React.ComponentProps<'div'> & RRaaSiMusicWelcomeViewProps) => {
    return (
        <div ref={ref} className="w-full pb-24 md:pb-32">
            {/* Hero Section */}
            <section className="bg-background flex min-h-[70vh] flex-col items-center justify-center px-4 py-8 text-center sm:min-h-[80vh] md:min-h-screen md:py-12">
                <MusicIcon />

                <h1 className="text-foreground mt-4 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
                    RRAASI Music Creator
                </h1>
                <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base leading-7 sm:text-lg md:text-xl">
                    Create personalized healing frequencies, bhajans, and meditation music with AI
                </p>

                {/* Action Button */}
                <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={onStartCall}
                        className="h-14 w-full text-lg font-semibold shadow-lg sm:w-auto sm:min-w-[240px]"
                    >
                        🎵 Start Creating Music
                    </Button>
                </div>
                <p className="text-muted-foreground mt-3 text-sm">
                    Free trial available • No credit card required
                </p>
            </section>

            {/* Key Features Section */}
            <section className="mx-auto mt-12 max-w-6xl px-4 sm:mt-16">
                <h2 className="text-foreground mb-8 text-center text-3xl font-bold sm:text-4xl">
                    What You Can Create
                </h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Feature 1: Bhajans */}
                    <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
                        <div className="mb-3 text-3xl">🙏</div>
                        <h3 className="text-foreground mb-3 text-xl font-semibold">Devotional Bhajans</h3>
                        <p className="text-muted-foreground text-sm leading-6">
                            Generate authentic bhajans for Krishna, Shiva, Ganesh, and other deities with traditional instruments
                        </p>
                    </div>

                    {/* Feature 2: Healing Frequencies */}
                    <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
                        <div className="mb-3 text-3xl">🎵</div>
                        <h3 className="text-foreground mb-3 text-xl font-semibold">Healing Frequencies</h3>
                        <p className="text-muted-foreground text-sm leading-6">
                            Create 432Hz, 528Hz, and other Solfeggio frequencies for healing and meditation
                        </p>
                    </div>

                    {/* Feature 3: Meditation Music */}
                    <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
                        <div className="mb-3 text-3xl">🧘</div>
                        <h3 className="text-foreground mb-3 text-xl font-semibold">Meditation Tracks</h3>
                        <p className="text-muted-foreground text-sm leading-6">
                            Ambient soundscapes with nature sounds, crystal bowls, and calming instruments
                        </p>
                    </div>

                    {/* Feature 4: Mantras */}
                    <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
                        <div className="mb-3 text-3xl">🕉️</div>
                        <h3 className="text-foreground mb-3 text-xl font-semibold">Sacred Mantras</h3>
                        <p className="text-muted-foreground text-sm leading-6">
                            Om Namah Shivaya, Gayatri Mantra, and other sacred chants in various styles
                        </p>
                    </div>

                    {/* Feature 5: Yoga Music */}
                    <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
                        <div className="mb-3 text-3xl">🌸</div>
                        <h3 className="text-foreground mb-3 text-xl font-semibold">Yoga Flow Music</h3>
                        <p className="text-muted-foreground text-sm leading-6">
                            Rhythmic tracks for vinyasa, hatha, or restorative yoga practice
                        </p>
                    </div>

                    {/* Feature 6: Custom Creations */}
                    <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
                        <div className="mb-3 text-3xl">✨</div>
                        <h3 className="text-foreground mb-3 text-xl font-semibold">Fully Customizable</h3>
                        <p className="text-muted-foreground text-sm leading-6">
                            Specify instruments, mood, tempo, and lyrics to create your perfect track
                        </p>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="mx-auto mt-16 max-w-4xl px-4">
                <h2 className="text-foreground mb-8 text-center text-3xl font-bold sm:text-4xl">
                    How It Works
                </h2>
                <div className="space-y-6">
                    <div className="flex gap-4">
                        <div className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold">
                            1
                        </div>
                        <div>
                            <h3 className="text-foreground mb-1 text-lg font-semibold">Connect with the Agent</h3>
                            <p className="text-muted-foreground text-sm">
                                Start a conversation with our AI music producer
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold">
                            2
                        </div>
                        <div>
                            <h3 className="text-foreground mb-1 text-lg font-semibold">Describe Your Vision</h3>
                            <p className="text-muted-foreground text-sm">
                                Tell us what kind of music you want - the agent will ask detailed questions
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold">
                            3
                        </div>
                        <div>
                            <h3 className="text-foreground mb-1 text-lg font-semibold">AI Generates Your Track</h3>
                            <p className="text-muted-foreground text-sm">
                                Our system creates your music in about 60 seconds
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold">
                            4
                        </div>
                        <div>
                            <h3 className="text-foreground mb-1 text-lg font-semibold">Listen & Enjoy</h3>
                            <p className="text-muted-foreground text-sm">
                                Your music plays automatically when ready
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="mx-auto mt-12 max-w-4xl px-4">
                <div className="bg-primary text-primary-foreground flex flex-col items-center gap-3 rounded-2xl p-6 text-center shadow-sm sm:flex-row sm:justify-between">
                    <p className="text-base font-semibold sm:text-left">Ready to create your perfect track?</p>
                    <div className="flex gap-3">
                        <Button onClick={onStartCall} variant="ghost" className="h-12 bg-white/10 hover:bg-white/20">
                            Start Now
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
};
