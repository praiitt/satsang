'use client';

import { HeroVideoPlayer } from '@/components/app/hero-video-player';
import { Button } from '@/components/livekit/button';
import { useLanguage } from '@/contexts/language-context';

function GurujiWelcomeImage() {
    return (
        <div className="mb-4 text-8xl">
            🕉️
        </div>
    );
}

interface GurujiWelcomeViewProps {
    startButtonText?: string;
    onStartCall: () => void;
}

export const GurujiWelcomeView = ({
    startButtonText,
    onStartCall,
    ref,
}: React.ComponentProps<'div'> & GurujiWelcomeViewProps) => {
    const { t } = useLanguage();

    // Use translation if startButtonText is not provided
    const buttonText = startButtonText || t('guruji.startButton') || 'गुरूजी से बात करें';

    return (
        <div ref={ref} className="w-full pb-24 md:pb-32">
            {/* Hero Section */}
            <section className="bg-background flex min-h-[70vh] flex-col items-center justify-center px-4 py-8 text-center sm:min-h-[80vh] md:min-h-screen md:py-12">
                <GurujiWelcomeImage />

                <h1 className="text-foreground mt-4 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
                    गुरूजी
                </h1>
                <h2 className="text-primary mt-2 text-xl font-semibold sm:text-2xl md:text-3xl">
                    Sanatana Dharma
                </h2>
                <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base leading-7 sm:text-lg md:text-xl">
                    हिंदू और सनातन धर्म में निहित आपका आध्यात्मिक मार्गदर्शक
                </p>
                <p className="text-muted-foreground mx-auto mt-2 max-w-2xl text-sm sm:text-base">
                    धर्म, योग, ध्यान, कर्म, भक्ति और वेदांत में विशेषज्ञता रखने वाला एक दयालु आध्यात्मिक गुरु। गीता, वेद, उपनिषद, रामायण और महाभारत से प्रश्नों के उत्तर देता है।
                </p>

                {/* Action Button */}
                <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={onStartCall}
                        className="h-14 w-full text-lg font-semibold shadow-lg sm:w-auto sm:min-w-[240px]"
                    >
                        {buttonText}
                    </Button>
                </div>
                <p className="text-muted-foreground mt-3 text-sm">निःशुल्क परीक्षण • कोई क्रेडिट कार्ड की आवश्यकता नहीं</p>
            </section>

            {/* Video Introduction Section */}
            <section className="mx-auto mt-8 w-full max-w-5xl px-4 sm:mt-12 md:mt-16">
                <div className="w-full">
                    <h2 className="text-foreground mb-4 text-center text-xl font-bold sm:mb-6 sm:text-2xl md:text-3xl">
                        गुरूजी से मिलें
                    </h2>
                    <div className="overflow-hidden rounded-2xl shadow-2xl">
                        <HeroVideoPlayer
                            src="https://storage.googleapis.com/satsangpublicurls/Raassi_Intro.mp4"
                            poster="https://storage.googleapis.com/satsangpublicurls/Raassi_Intro.mp4#t=0.1"
                            autoPlay
                            loop
                            className="w-full"
                        />
                    </div>
                </div>
            </section>

            {/* Key Features Section */}
            <section className="mx-auto mt-12 max-w-6xl px-4 sm:mt-16">
                <h2 className="text-foreground mb-8 text-center text-3xl font-bold sm:text-4xl">
                    प्रमुख विशेषताएं
                </h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Feature 1: Voice AI */}
                    <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
                        <div className="mb-3 text-3xl">🎤</div>
                        <h3 className="text-foreground mb-3 text-xl font-semibold">
                            वॉयस एआई सहायक
                        </h3>
                        <p className="text-muted-foreground text-sm leading-6">
                            हिंदी और संस्कृत में वास्तविक समय में बातचीत करें
                        </p>
                    </div>

                    {/* Feature 2: Hindi Support */}
                    <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
                        <div className="mb-3 text-3xl">🇮🇳</div>
                        <h3 className="text-foreground mb-3 text-xl font-semibold">
                            हिंदी भाषा समर्थन
                        </h3>
                        <p className="text-muted-foreground text-sm leading-6">
                            अपनी मातृभाषा में आध्यात्मिक मार्गदर्शन प्राप्त करें
                        </p>
                    </div>

                    {/* Feature 3: Bhajan Playback */}
                    <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
                        <div className="mb-3 text-3xl">🎵</div>
                        <h3 className="text-foreground mb-3 text-xl font-semibold">
                            भजन प्लेबैक
                        </h3>
                        <p className="text-muted-foreground text-sm leading-6">
                            गुरूजी के साथ भक्ति भजन सुनें और गाएं
                        </p>
                    </div>

                    {/* Feature 4: Vani/Pravachan */}
                    <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
                        <div className="mb-3 text-3xl">📿</div>
                        <h3 className="text-foreground mb-3 text-xl font-semibold">
                            प्रवचन और वाणी
                        </h3>
                        <p className="text-muted-foreground text-sm leading-6">
                            संतों और गुरुओं के प्रवचन सुनें
                        </p>
                    </div>

                    {/* Feature 5: Spiritual Guidance */}
                    <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
                        <div className="mb-3 text-3xl">🕉️</div>
                        <h3 className="text-foreground mb-3 text-xl font-semibold">
                            आध्यात्मिक मार्गदर्शन
                        </h3>
                        <p className="text-muted-foreground text-sm leading-6">
                            धर्म, योग, ध्यान और कर्म पर मार्गदर्शन
                        </p>
                    </div>

                    {/* Feature 6: Scripture Knowledge */}
                    <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
                        <div className="mb-3 text-3xl">📖</div>
                        <h3 className="text-foreground mb-3 text-xl font-semibold">
                            शास्त्र ज्ञान
                        </h3>
                        <p className="text-muted-foreground text-sm leading-6">
                            गीता, वेद, उपनिषद से उत्तर प्राप्त करें
                        </p>
                    </div>
                </div>
            </section>

            {/* Tags Section */}
            <section className="mx-auto mt-12 max-w-6xl px-4">
                <div className="flex flex-wrap justify-center gap-3">
                    <span className="bg-muted text-muted-foreground rounded-full px-4 py-2 text-sm">Hindu</span>
                    <span className="bg-muted text-muted-foreground rounded-full px-4 py-2 text-sm">Dharma</span>
                    <span className="bg-muted text-muted-foreground rounded-full px-4 py-2 text-sm">Bhakti</span>
                    <span className="bg-muted text-muted-foreground rounded-full px-4 py-2 text-sm">Yoga</span>
                    <span className="bg-muted text-muted-foreground rounded-full px-4 py-2 text-sm">Meditation</span>
                    <span className="bg-muted text-muted-foreground rounded-full px-4 py-2 text-sm">Karma</span>
                    <span className="bg-muted text-muted-foreground rounded-full px-4 py-2 text-sm">Vedanta</span>
                </div>
            </section>

            {/* CTA Section */}
            <section className="mx-auto mt-8 max-w-4xl px-4">
                <div className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex flex-col items-center gap-3 rounded-2xl border border-orange-500/30 p-6 text-center shadow-sm sm:flex-row sm:justify-between">
                    <p className="text-foreground text-base font-semibold sm:text-left">अपनी आध्यात्मिक यात्रा शुरू करें</p>
                    <div className="flex gap-3">
                        <Button
                            onClick={onStartCall}
                            variant="primary"
                            className="h-12"
                        >
                            गुरूजी से अभी बात करें
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
};
