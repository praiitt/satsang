import React from 'react';

export default function AboutPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6 text-foreground">About Us</h1>

            <div className="prose dark:prose-invert max-w-none space-y-8 text-foreground/90">
                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-primary">Our Mission</h2>
                    <p className="text-lg leading-relaxed">
                        At RRAASI, our mission is to leverage the power of Artificial Intelligence to make profound spiritual wisdom accessible, personalized, and transformative for everyone. We believe that technology can be a bridge to the divine, helping seekers connect with their inner self and the cosmos in meaningful ways.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-primary">Our Vision</h2>
                    <p className="text-lg leading-relaxed">
                        We envision a world where spiritual growth is seamlessly integrated into daily life, supported by intelligent companions who understand, guide, and inspire. RRAASI aims to be the foremost platform for digital spirituality, offering authentic experiences in Satsang, Music, Tarot, and Vedic Astrology.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-primary">Creator Studio & Music Distribution</h2>
                    <p className="text-lg leading-relaxed mb-4">
                        A key feature of our Creator Studio is the AI Music Generation tool, which allows users to create deeply personalized healing music, mantras, and meditation tracks. To help our creators share their light with the world, RRAASI offers an integrated Music Distribution service. Users can choose to publish their self-generated spiritual music and meditation tracks directly to their personal YouTube channels.
                    </p>
                    <h3 className="text-xl font-medium mb-3 text-foreground">YouTube Data & Privacy</h3>
                    <p className="text-lg leading-relaxed">
                        To enable direct music distribution, RRAASI requests authorization to access your YouTube account (specifically the <code>youtube.upload</code> scope). We only use this permission to upload the specific music videos you explicitly authorize from our platform. RRAASI does not read, modify, or delete any of your existing YouTube videos. Our use of information received from Google APIs adheres to the <a href="/privacy" className="text-primary hover:underline">RRAASI Privacy Policy</a> and the Google API Services User Data Policy, including the Limited Use requirements.
                    </p>
                </section>

                <div className="border-t border-border pt-8 mt-12">
                    <p className="text-sm text-muted-foreground">
                        RRAASI is a product of <a href="https://absolutedimension.in/" target="_blank" rel="noopener noreferrer" className="text-foreground font-medium hover:underline">Absolute Dimension Pvt Ltd</a>.
                    </p>
                </div>
            </div>
        </div>
    );
}
