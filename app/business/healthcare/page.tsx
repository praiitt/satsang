
import Link from "next/link"
import { Activity, Brain, HeartPulse, Stethoscope } from "lucide-react"
import { Button } from "@/components/livekit/button"

export default function HealthcarePage() {
    return (
        <div className="space-y-20">
            {/* Hero Section */}
            <section className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="inline-flex items-center px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-900/20 text-emerald-300 text-sm font-medium mb-4">
                    <Stethoscope className="w-4 h-4 mr-2" /> For Clinics & Hospitals
                </div>
                <h1 className="text-5xl md:text-7xl font-serif text-white">
                    Evidence-Based <span className="text-emerald-400">Healing</span>.
                </h1>
                <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                    Reduce patient anxiety before they even see the doctor.
                    <span className="text-white font-medium"> Clinically designed soundscapes for waiting rooms and recovery.</span>
                </p>
                <div className="pt-8 flex justify-center gap-4">
                    <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8 h-12 text-lg">
                        Partner With Us
                    </Button>
                </div>
            </section>

            {/* The Problem/Solution */}
            <section className="grid md:grid-cols-2 gap-8">
                <div className="p-8 rounded-3xl bg-red-950/10 border border-red-500/10">
                    <h3 className="text-xl font-serif text-red-200 mb-4">The Problem: "White Coat Hypertension"</h3>
                    <p className="text-zinc-400 mb-6">
                        Clinical silence or jarring TV news in waiting rooms increases cortisol levels. Anxious patients trigger slower procedures and lower satisfaction scores.
                    </p>
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full w-3/4 bg-red-500/50"></div>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2 text-right">High Cortisol</p>
                </div>
                <div className="p-8 rounded-3xl bg-emerald-950/10 border border-emerald-500/20">
                    <h3 className="text-xl font-serif text-emerald-200 mb-4">The Solution: Entrainment</h3>
                    <p className="text-zinc-400 mb-6">
                        RRAASI uses <strong>Theta Wave (4-7Hz)</strong> binaural beats masked under pleasant ambient music to physically lower heart rate and blood pressure.
                    </p>
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full w-1/4 bg-emerald-500"></div>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2 text-right">Relaxed State</p>
                </div>
            </section>

            {/* Features */}
            <section className="py-12">
                <h2 className="text-3xl font-serif text-white text-center mb-12">Clinical Applications</h2>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-xl space-y-4">
                        <Activity className="w-8 h-8 text-emerald-400" />
                        <h4 className="text-lg font-medium text-white">Dental Anxiety</h4>
                        <p className="text-sm text-zinc-400">Mask drill sounds with noise-canceling frequencies tailored for dental chairs.</p>
                    </div>
                    <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-xl space-y-4">
                        <HeartPulse className="w-8 h-8 text-emerald-400" />
                        <h4 className="text-lg font-medium text-white">Post-Op Recovery</h4>
                        <p className="text-sm text-zinc-400">Delta wave sleep induction tracks to speed up the body's natural healing process.</p>
                    </div>
                    <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-xl space-y-4">
                        <Brain className="w-8 h-8 text-emerald-400" />
                        <h4 className="text-lg font-medium text-white">Neuro-Divergent Care</h4>
                        <p className="text-sm text-zinc-400">Sensory-friendly, predictable, and calm auditory environments for clinics.</p>
                    </div>
                </div>
            </section>

        </div>
    )
}
