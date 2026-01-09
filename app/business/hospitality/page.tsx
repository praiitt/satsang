
import Link from "next/link"
import { Sun, Moon, MapPin, Hotel, Speaker } from "lucide-react"
import { Button } from "@/components/livekit/button"

export default function HospitalityPage() {
    return (
        <div className="space-y-20">
            {/* Hero Section */}
            <section className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="inline-flex items-center px-3 py-1 rounded-full border border-amber-500/30 bg-amber-900/20 text-amber-300 text-sm font-medium mb-4">
                    <Hotel className="w-4 h-4 mr-2" /> For Hotels, Resorts & Spas
                </div>
                <h1 className="text-5xl md:text-7xl font-serif text-white">
                    Sonic <span className="text-amber-400">Architecture</span>.
                </h1>
                <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                    Transform your property into a sanctuary.
                    <span className="text-white font-medium"> Music that evolves with the sun, the season, and the Vastu energy of every room.</span>
                </p>
                <div className="pt-8 flex justify-center gap-4">
                    <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-white rounded-full px-8 h-12 text-lg">
                        Request Consult
                    </Button>
                </div>
            </section>

            {/* The Day Cycle Visual */}
            <section className="relative py-12">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-900/10 via-amber-900/10 to-blue-900/10 rounded-3xl border border-white/5 mx-4 md:mx-0"></div>
                <div className="relative z-10 max-w-4xl mx-auto text-center space-y-12 p-8">
                    <h2 className="text-3xl font-serif text-white">The Circadian Raga System</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="space-y-4">
                            <Sun className="w-12 h-12 text-orange-400 mx-auto" />
                            <h3 className="text-xl font-medium text-orange-200">Morning (Bhairav)</h3>
                            <p className="text-sm text-zinc-400">Awakening, grounding energy for breakfast zones and lobbies. 6:00 AM - 10:00 AM.</p>
                        </div>
                        <div className="space-y-4">
                            <Sun className="w-12 h-12 text-amber-400 mx-auto" />
                            <h3 className="text-xl font-medium text-amber-200">Afternoon (Bhimpalasi)</h3>
                            <p className="text-sm text-zinc-400">Active, focused energy for business centers and gyms. 10:00 AM - 4:00 PM.</p>
                        </div>
                        <div className="space-y-4">
                            <Moon className="w-12 h-12 text-blue-400 mx-auto" />
                            <h3 className="text-xl font-medium text-blue-200">Evening (Yaman)</h3>
                            <p className="text-sm text-zinc-400">Romantic, soothing energy for lounges and dining. 4:00 PM - Midnight.</p>
                        </div>
                    </div>
                    <div className="inline-block px-4 py-2 rounded bg-white/5 border border-white/10 text-xs text-zinc-500">
                        *RRAASI automates these transitions seamlessly across your existing sound system.
                    </div>
                </div>
            </section>

            {/* Vastu Feature */}
            <section className="grid md:grid-cols-2 gap-12 items-center bg-zinc-900/30 p-8 rounded-3xl border border-white/5">
                <div className="order-2 md:order-1 relative h-64 md:h-80 rounded-2xl overflow-hidden bg-black/40 flex items-center justify-center border border-amber-500/20">
                    <MapPin className="w-24 h-24 text-amber-500/20" />
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs text-zinc-600 font-mono">
                        <span>NE: WATER</span>
                        <span>SW: EARTH</span>
                    </div>
                </div>
                <div className="order-1 md:order-2 space-y-6">
                    <h2 className="text-3xl font-serif text-white">Vastu-Compliant Zones</h2>
                    <p className="text-zinc-400 leading-relaxed">
                        Ancient Indian architecture meets modern AI. We generate soundscapes specifically timed for the directional energy of your property.
                    </p>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3 text-zinc-300">
                            <Speaker className="w-5 h-5 text-amber-500 shrink-0" />
                            <span><strong>North-East (Ishanya):</strong> Water flows, temple bells, high-frequency clarity.</span>
                        </li>
                        <li className="flex items-start gap-3 text-zinc-300">
                            <Speaker className="w-5 h-5 text-amber-500 shrink-0" />
                            <span><strong>South-West (Nairutya):</strong> Earthy drums, bass-heavy mantras for stability.</span>
                        </li>
                    </ul>
                </div>
            </section>
        </div>
    )
}
