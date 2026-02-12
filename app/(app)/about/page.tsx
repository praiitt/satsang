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

                <div className="border-t border-border pt-8 mt-12">
                    <p className="text-sm text-muted-foreground">
                        RRAASI is a product of <a href="https://absolutedimension.in/" target="_blank" rel="noopener noreferrer" className="text-foreground font-medium hover:underline">Absolute Dimension Pvt Ltd</a>.
                    </p>
                </div>
            </div>
        </div>
    );
}
