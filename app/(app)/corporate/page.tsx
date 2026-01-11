
import { Button } from '@/components/livekit/button';
import { ArrowRight, Building2, Heart, Sparkles, Brain, Music, Users } from 'lucide-react';
import Link from 'next/link';
import { CorporateOfferings } from "@/components/corporate-offerings"

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
                            <Link href="/business/signup">
                                <Button size="lg" className="text-lg px-8 h-14 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/20">
                                    Get Your Team's Vibration Report
                                </Button>
                            </Link>
                            <Link href="/business/signup">
                                <Button size="lg" variant="outline" className="text-lg px-8 h-14 border-2">
                                    View Demo
                                </Button>
                            </Link>
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

            {/* Hybrid Feature Section (Fuel & Flow Integration) */}
            < section className="py-20 px-6" >
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="order-2 lg:order-1">
                        <div className="w-full h-[400px] rounded-3xl overflow-hidden bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10 border border-green-200 dark:border-green-800/50 flex items-center justify-center p-8">
                            <div className="grid grid-cols-2 gap-4 w-full h-full">
                                <div className="bg-white dark:bg-card p-4 rounded-xl shadow-sm flex flex-col justify-center items-center text-center">
                                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-3">
                                        <Heart className="w-6 h-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <h4 className="font-bold text-sm">Anti-Inflammatory Diet</h4>
                                </div>
                                <div className="bg-white dark:bg-card p-4 rounded-xl shadow-sm flex flex-col justify-center items-center text-center mt-8">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-3">
                                        <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h4 className="font-bold text-sm">Tai Chi & Qigong</h4>
                                </div>
                                <div className="bg-white dark:bg-card p-4 rounded-xl shadow-sm flex flex-col justify-center items-center text-center -mt-8">
                                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center mb-3">
                                        <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <h4 className="font-bold text-sm">Yoga Therapy</h4>
                                </div>
                                <div className="bg-white dark:bg-card p-4 rounded-xl shadow-sm flex flex-col justify-center items-center text-center">
                                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mb-3">
                                        <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <h4 className="font-bold text-sm">Meditation Events</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="order-1 lg:order-2 space-y-6">
                        <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm font-medium border border-green-200 dark:border-green-700/50">
                            <Heart className="w-4 h-4 mr-2" />
                            New: Hybrid Wellness Events
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                            Beyond the App: <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-500">Physical Restoration</span>
                        </h2>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            We believe in "Fueling the body, not fighting it." Our new <strong>Fuel & Flow</strong> program brings physical healing to your workplace.
                        </p>
                        <ul className="space-y-4">
                            {[
                                "Personalized Anti-Inflammatory Diet Plans",
                                "On-site & Virtual Yoga, Tai Chi, and Qigong",
                                "Weekly Movement Sessions for Fascia Health",
                                "Holistic Gut-Healing Approaches"
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                                        <ArrowRight className="w-3 h-3 text-green-600 dark:text-green-400" />
                                    </div>
                                    <span className="font-medium">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section >

            {/* Pricing / Offerings Section */}
            < div className="bg-muted/30" >
                <CorporateOfferings />
            </div >

            {/* Contact Section */}
            < section className="py-20 px-6" >
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
            </section >
        </div >
    );
}
