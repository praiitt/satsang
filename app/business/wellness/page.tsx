
import Link from "next/link"
import { Clock, Heart, Sparkles, Wind } from "lucide-react"
import { Button } from "@/components/livekit/button"
import { AudioDemoPlayer } from "@/components/b2b/audio-demo-player"

export default function WellnessPage() {
    return (
        <div className="space-y-20">
            {/* Hero Section */}
            <section className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="inline-flex items-center px-3 py-1 rounded-full border border-rose-500/30 bg-rose-900/20 text-rose-300 text-sm font-medium mb-4">
                    <Heart className="w-4 h-4 mr-2" /> For Yoga Studios & Healers
                </div>
                <h1 className="text-5xl md:text-7xl font-serif text-white">
                    The Canvas for <span className="text-rose-400">Healing</span>.
                </h1>
                <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                    Create the perfect sonic environment for every session.
                    <span className="text-white font-medium"> Exact frequencies. Precise timing. Deep peace.</span>
                </p>
                <div className="pt-8 flex justify-center gap-4">
                    <Button size="lg" className="bg-rose-600 hover:bg-rose-700 text-white rounded-full px-8 h-12 text-lg">
                        Get Professional Access
                    </Button>
                </div>

                <div className="pt-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                    <p className="text-sm text-zinc-500 mb-4 font-mono">GENERATED EXAMPLE: "432Hz Flute Meditation"</p>
                    <AudioDemoPlayer
                        src="https://cdn1.suno.ai/ad75d82f-c489-4982-a890-87f8dd4e05d1.mp3"
                        title="Heart Chakra Flow"
                        description="432Hz • Key of F • 60 Minutes"
                        color="text-rose-400"
                    />
                </div>
            </section>

            {/* Feature Grid */}
            <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    {
                        icon: Wind,
                        title: "432Hz Mode",
                        desc: "Instantly tune any generated track to 432Hz universal healing frequency."
                    },
                    {
                        icon: Clock,
                        title: "Session Timer",
                        desc: "Need 45 mins of flow followed by 10 mins of Savasana? We generate exactly that."
                    },
                    {
                        icon: Sparkles,
                        title: "Solfeggio Tones",
                        desc: "Inject specific tones (e.g. 528Hz for DNA repair) into underlying ambient pads."
                    },
                    {
                        icon: Heart,
                        title: "Chakra Alignment",
                        desc: "Select a Chakra (Root to Crown) and get the corresponding key and raga."
                    }
                ].map((feature) => (
                    <div key={feature.title} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-rose-500/30 text-center transition-all hover:-translate-y-1">
                        <feature.icon className="w-10 h-10 text-rose-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                        <p className="text-sm text-zinc-400">{feature.desc}</p>
                    </div>
                ))}
            </section>

            {/* Use Case Story */}
            <section className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                    <h2 className="text-3xl font-serif text-white">Imagine this...</h2>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                        <p>
                            Your client walks in for a <strong>Heart Chakra</strong> healing session.
                        </p>
                        <p>
                            Instead of searching Spotify for "Heart Chakra Music" and getting interruptions,
                            you simply tell RRAASI:
                        </p>
                        <div className="p-4 bg-black/40 border border-rose-500/20 rounded-lg text-rose-200 italic font-medium">
                            "Create a 60-minute journey in Key of F (Heart), starting with gentle flute and building to an expansive orchestral swell, then fading to silence."
                        </div>
                        <p>
                            In seconds, you have a completely unique, royalty-free masterpiece tailored to that specific moment.
                        </p>
                    </div>
                </div>
                <div className="relative h-64 md:h-full min-h-[300px] rounded-2xl overflow-hidden bg-rose-900/10 border border-rose-500/10 flex items-center justify-center">
                    {/* Placeholder for visual or abstract animation */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-rose-900/40 via-transparent to-transparent"></div>
                    <Heart className="w-32 h-32 text-rose-500/20 animate-pulse" />
                </div>
            </section>
        </div>
    )
}
