
import Link from "next/link"
import { ArrowRight, Music, Heart, Hotel, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

export default function BusinessHubPage() {
    const segments = [
        {
            title: "For Content Creators",
            description: "Royalty-free, copyright-safe Vedic soundscapes for YouTubers, Podcasters, and Influencers.",
            href: "/business/creators",
            icon: Music,
            color: "text-purple-400 db-border-purple-500/30",
            gradient: "from-purple-900/40 to-black",
            usp: "Monetize Safely"
        },
        {
            title: "For Wellness Pros",
            description: "Custom-length healing frequencies (432Hz, Solfeggio) for Yoga classes, Reiki, and Meditation sessions.",
            href: "/business/wellness",
            icon: Heart,
            color: "text-rose-400 db-border-rose-500/30",
            gradient: "from-rose-900/40 to-black",
            usp: "Healing Frequencies"
        },
        {
            title: "For Hospitality",
            description: "Vastu-compliant 'Sonic Architecture' that evolves with the time of day for Hotels, Resorts, and Spas.",
            href: "/business/hospitality",
            icon: Hotel,
            color: "text-amber-400 db-border-amber-500/30",
            gradient: "from-amber-900/40 to-black",
            usp: "Sonic Architecture"
        },
        {
            title: "For Healthcare",
            description: "Evidence-based binaural beats designed to reduce patient anxiety in dental clinics and waiting rooms.",
            href: "/business/healthcare",
            icon: Activity,
            color: "text-emerald-400 db-border-emerald-500/30",
            gradient: "from-emerald-900/40 to-black",
            usp: "Clinical Calm"
        }
    ]

    return (
        <div className="space-y-16 py-8">
            {/* Hero Section */}
            <div className="text-center space-y-6 max-w-3xl mx-auto">
                <h1 className="text-4xl md:text-6xl font-serif text-transparent bg-clip-text bg-gradient-to-b from-gold-300 via-gold-400 to-gold-600 drop-shadow-[0_2px_10px_rgba(212,175,55,0.3)]">
                    Conscious AI Solutions
                </h1>
                <p className="text-xl text-zinc-400 font-light">
                    RRAASI isn't just a platform. It's a sonic engine powering the next generation of
                    <span className="text-gold-400 font-medium"> wellness, creativity, and sanctuaries.</span>
                </p>
            </div>

            {/* Segment Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {segments.map((segment) => (
                    <Link
                        key={segment.title}
                        href={segment.href}
                        className="group relative overflow-hidden rounded-2xl border border-white/10 p-8 transition-all hover:border-gold-500/50 hover:shadow-[0_0_30px_rgba(212,175,55,0.1)]"
                    >
                        {/* Hover Gradient Background */}
                        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", segment.gradient)} />

                        <div className="relative z-10 flex flex-col h-full space-y-4">
                            <div className="flex items-center justify-between">
                                <segment.icon className={cn("h-8 w-8", segment.color)} />
                                <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 bg-zinc-900/80 px-2 py-1 rounded border border-white/5">
                                    {segment.usp}
                                </span>
                            </div>

                            <h2 className="text-2xl font-serif text-zinc-100 group-hover:text-gold-300 transition-colors">
                                {segment.title}
                            </h2>

                            <p className="text-zinc-400 leading-relaxed flex-1">
                                {segment.description}
                            </p>

                            <div className="flex items-center text-sm font-medium text-zinc-500 group-hover:text-white transition-colors pt-4">
                                Explore Solution <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* CTA Bottom */}
            <div className="text-center pt-12 border-t border-white/5">
                <p className="text-zinc-500 mb-6">Need a custom enterprise solution?</p>
                <Link
                    href="mailto:partners@rraasi.com"
                    className="inline-flex items-center px-8 py-3 bg-zinc-900 hover:bg-zinc-800 text-gold-400 border border-gold-500/20 rounded-full transition-all hover:scale-105"
                >
                    Contact Our Partnerships Team
                </Link>
            </div>
        </div>
    )
}
