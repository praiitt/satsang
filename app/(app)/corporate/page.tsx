
import { Button } from '@/components/livekit/button';
import { ArrowRight, Building2, Heart, Sparkles, Brain, Music, Users } from 'lucide-react';
import Link from 'next/link';

export default function CorporatePage() {
    return (
        <div className="flex flex-col min-h-screen bg-transparent">
            {/* Hero Section */}
            <section className="relative py-20 px-6 overflow-hidden">
                {/* Abstract Background Element */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-amber-500/10 to-transparent blur-3xl -z-10" />

                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                        <div className="inline-flex items-center px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-sm font-medium border border-amber-200 dark:border-amber-700/50">
                            <Sparkles className="w-4 h-4 mr-2" />
                            New: Corporate Spiritual Health Benefit
                        </div>

                        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
                            What are you doing for your employees' <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-500">Spiritual Health?</span>
                        </h1>

                        <p className="text-xl text-muted-foreground leading-relaxed">
                            Burnout isn't just physical. It's a vibration problem.
                            Give your team the missing pillar of wellness with Rraasi's AI-powered spiritual toolkit.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button size="lg" className="text-lg px-8 h-14 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/20">
                                Get Your Team's Vibration Report
                            </Button>
                            <Button size="lg" variant="outline" className="text-lg px-8 h-14 border-2">
                                View Demo
                            </Button>
                        </div>
                    </div>

                    <div className="relative h-[600px] rounded-3xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl flex items-center justify-center">
                        {/* Placeholder for "Vibration Report" Mockup */}
                        <div className="text-center p-8">
                            <div className="w-24 h-24 bg-white dark:bg-black rounded-full mx-auto mb-6 flex items-center justify-center shadow-xl">
                                <Building2 className="w-10 h-10 text-amber-500" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">Acme Corp</h3>
                            <p className="text-muted-foreground mb-6">Aggregate Vibration Score</p>
                            <div className="text-6xl font-black text-amber-600 dark:text-amber-400">842</div>
                            <div className="mt-2 text-sm text-green-500 font-medium">↑ 12% vs last month</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem/Solution Section */}
            <section className="py-20 px-6 bg-muted/30">
                <div className="max-w-7xl mx-auto text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">The Missing Tier of Wellness</h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        You have Gyms (Body) and Therapy (Mind). But without Spirit, the stool falls over.
                    </p>
                </div>

                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-8 rounded-2xl bg-card border shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6">
                            <Music className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Instant "Spirit Breaks"</h3>
                        <p className="text-muted-foreground">
                            Forget 1-hour naps. Our AI Trance Music Guide shifts brainwaves in 15 minutes, resetting focus and vibration instantly.
                        </p>
                    </div>

                    <div className="p-8 rounded-2xl bg-card border shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-6">
                            <Brain className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Wisdom On-Demand</h3>
                        <p className="text-muted-foreground">
                            Conflict at work? Osho and Wisdom Agents provide instant, ego-free perspective to resolving team tension.
                        </p>
                    </div>

                    <div className="p-8 rounded-2xl bg-card border shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Vibration Reports</h3>
                        <p className="text-muted-foreground">
                            Monthly Astrological and Vedic insights help each employee understand their natural rhythms and power periods.
                        </p>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section className="py-20 px-6">
                <div className="max-w-3xl mx-auto bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-12 text-center text-white shadow-2xl">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">Raise Your Company's Vibration</h2>
                    <p className="text-lg text-white/90 mb-8">
                        Join the forward-thinking organizations prioritizing Spiritual Health.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button variant="secondary" size="lg" className="h-14 px-8 text-lg">
                            Book a Consultation
                        </Button>
                    </div>
                    <p className="mt-6 text-white/70 text-sm">
                        Pilots available for teams of 50+
                    </p>
                </div>
            </section>
        </div>
    );
}
