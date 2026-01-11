
import Link from "next/link"
import { Check, Music, ShieldCheck, Zap } from "lucide-react"
import { Button } from "@/components/livekit/button"
import { AudioDemoPlayer } from "@/components/b2b/audio-demo-player"

export default function CreatorsPage() {
    return (
        <div className="space-y-20">
            {/* Hero Section */}
            <section className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="inline-flex items-center px-3 py-1 rounded-full border border-purple-500/30 bg-purple-900/20 text-purple-300 text-sm font-medium mb-4">
                    <Zap className="w-4 h-4 mr-2" /> For YouTubers & Podcasters
                </div>
                <h1 className="text-5xl md:text-7xl font-serif text-white">
                    Monetize Without <span className="text-purple-400">Fear</span>.
                </h1>
                <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                    Generate infinite, royalty-free Vedic soundscapes.
                    <span className="text-white font-medium"> No strikes. No claims. Just pure flow.</span>
                </p>
                <div className="pt-8 flex justify-center gap-4">
                    <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-8 h-12 text-lg">
                        Start Creator Trial
                    </Button>
                    <Button variant="outline" size="lg" className="border-white/10 hover:bg-white/5 text-zinc-300 rounded-full h-12">
                        Listen to Samples
                    </Button>
                </div>

                <div className="pt-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                    <p className="text-sm text-zinc-500 mb-4 font-mono">GENERATED EXAMPLE: "Upbeat Lo-Fi intro with sitar"</p>
                    <AudioDemoPlayer
                        src="https://cdn1.suno.ai/ad75d82f-c489-4982-a890-87f8dd4e05d1.mp3"
                        title="Cosmic Lo-Fi Beat"
                        description="Royalty-Free • Generated in 15s"
                        color="text-purple-400"
                    />
                </div>
            </section>

            {/* Feature Grid */}
            <section className="grid md:grid-cols-3 gap-8">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors">
                    <ShieldCheck className="w-10 h-10 text-purple-400 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">100% Copyright Safe</h3>
                    <p className="text-zinc-400">
                        Every track is uniquely generated for you. You own the license. Use it on YouTube, Twitch, Instagram without worry.
                    </p>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors">
                    <Music className="w-10 h-10 text-purple-400 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Voice-to-Music</h3>
                    <p className="text-zinc-400">
                        "Make an energetic 5-minute intro with sitar and trap beats." Just say it, and RRAASI creates it.
                    </p>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors">
                    <Zap className="w-10 h-10 text-purple-400 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Stem Separation</h3>
                    <p className="text-zinc-400">
                        Need just the vocals or just the flute? Export individual stems to mix perfectly with your commentary.
                    </p>
                </div>
            </section>

            {/* Comparison Table */}
            <section className="bg-zinc-900/50 rounded-3xl p-8 md:p-12 border border-white/5">
                <h2 className="text-3xl font-serif text-center mb-10">Why RRAASI vs Stock Music?</h2>
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 pb-4 border-b border-white/10 text-sm font-medium text-zinc-500 uppercase tracking-wider">
                        <div>Feature</div>
                        <div className="text-center">Stock Libraries</div>
                        <div className="text-center text-purple-400">RRAASI AI</div>
                    </div>
                    {[
                        { feature: "Originality", stock: "Overused tracks", rraasi: "Unique every time" },
                        { feature: "Cost", stock: "$20-$100 per track", rraasi: "Flat Monthly Sub" },
                        { feature: "Custom Length", stock: "Fixed duration", rraasi: "Exact fit (e.g. 13:42)" },
                        { feature: "Cultural Vibe", stock: "Generic 'World' folder", rraasi: "Authentic Ragas" },
                    ].map((row) => (
                        <div key={row.feature} className="grid grid-cols-3 gap-4 py-3 items-center">
                            <div className="text-white font-medium">{row.feature}</div>
                            <div className="text-center text-zinc-500">{row.stock}</div>
                            <div className="text-center text-white flex justify-center gap-2 items-center">
                                <Check className="w-4 h-4 text-purple-500" /> {row.rraasi}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}
