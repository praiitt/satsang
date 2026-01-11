
import { Check, Brain, Activity, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function CorporateOfferings() {
    return (
        <section className="py-16 space-y-12">
            <div className="text-center space-y-4 max-w-3xl mx-auto px-4">
                <h2 className="text-3xl md:text-5xl font-serif text-transparent bg-clip-text bg-gradient-to-b from-amber-600 via-amber-500 to-amber-700 dark:from-gold-300 dark:via-gold-400 dark:to-gold-600">
                    Our Corporate Wellness Offerings
                </h2>
                <p className="text-muted-foreground text-lg">
                    A holistic approach combining ancient wisdom and modern science to support your team's Mind and Body.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto px-4">
                {/* Mind Care - App */}
                <Card className="bg-card/50 border-border overflow-hidden group hover:border-purple-500/50 hover:shadow-lg transition-all dark:hover:border-gold-500/30">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Brain className="h-6 w-6" />
                            </div>
                            <span className="text-sm font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">Mind Care</span>
                        </div>
                        <CardTitle className="text-2xl text-foreground">RRAASI App Subscription</CardTitle>
                        <CardDescription className="text-muted-foreground">
                            AI-powered spiritual and mental wellness guidance for every employee.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 relative z-10">
                        <ul className="space-y-3">
                            {[
                                "Unlimited access to AI Spiritual Gurus (Osho, Buddha, etc.)",
                                "Personalized Daily Satsangs & Meditation",
                                "Vedic Astrological Insights & Tarot Readings",
                                "24/7 Emotional Support & Guidance",
                                "Curated Soundscapes for Focus & Sleep"
                            ].map((feature) => (
                                <li key={feature} className="flex items-start gap-2 text-foreground/80">
                                    <Check className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* Body Care - Fuel and Flow */}
                <Card className="bg-card/50 border-border overflow-hidden group hover:border-emerald-500/50 hover:shadow-lg transition-all dark:hover:border-gold-500/30">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Activity className="h-6 w-6" />
                            </div>
                            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Body Care</span>
                        </div>
                        <CardTitle className="text-2xl text-foreground">Fuel & Flow Integration</CardTitle>
                        <CardDescription className="text-muted-foreground">
                            Personalized anti-inflammatory nutrition and movement for physical vitality.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 relative z-10">
                        <ul className="space-y-3">
                            {[
                                "Personalized Anti-Inflammatory Nutrition Plans",
                                "Weekly Online Movement Classes (Yoga, Tai Chi, Qigong)",
                                "Fascia-based Healing & Mobility Work",
                                "Gut Health & Metabolic Balance Support",
                                "Weekly Plan Reviews & Adjustments"
                            ].map((feature) => (
                                <li key={feature} className="flex items-start gap-2 text-foreground/80">
                                    <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>

            {/* Pricing / Plan */}
            <div className="px-4">
                <div className="relative rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-50 to-white dark:from-zinc-900 dark:to-black p-8 md:p-12 text-center overflow-hidden max-w-4xl mx-auto shadow-xl">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

                    <div className="space-y-6 relative z-10">
                        <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
                            <Users className="h-8 w-8 text-amber-600 dark:text-gold-400" />
                        </div>

                        <h3 className="text-3xl font-serif text-foreground">Complete Corporate Wellness Plan</h3>
                        <p className="max-w-2xl mx-auto text-muted-foreground">
                            Empower your workforce with our comprehensive "Mind + Body" package.
                            A unified solution for holistic employee well-being.
                        </p>

                        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-12 py-8">
                            <div className="text-center">
                                <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Per Employee</div>
                                <div className="text-4xl md:text-5xl font-bold text-amber-600 dark:text-gold-400 flex items-baseline justify-center gap-1">
                                    <span className="text-2xl text-muted-foreground">$</span>
                                    15
                                    <span className="text-lg text-muted-foreground font-normal">/month</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button className="px-8 py-3 bg-gradient-to-r from-amber-600 to-orange-600 dark:bg-gold-500 dark:from-gold-500 dark:to-gold-500 text-white dark:text-black font-semibold rounded-full hover:opacity-90 transition-all w-full sm:w-auto shadow-lg shadow-amber-500/20">
                                Get Started
                            </button>
                            <button className="px-8 py-3 border border-input text-foreground rounded-full hover:bg-accent hover:text-accent-foreground transition-colors w-full sm:w-auto">
                                Schedule Demo
                            </button>
                        </div>

                        <p className="text-xs text-muted-foreground mt-4">
                            *Pricing based on annual billing. Minimum 10 seats required.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}
