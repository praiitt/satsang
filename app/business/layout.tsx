export default function BusinessLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="relative min-h-screen flex flex-col bg-black text-white selection:bg-gold-500/30">
            {/* Background Noise Texture */}
            <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-overlay">
                <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-20"></div>
            </div>

            {/* Main Content */}
            <main className="flex-1 relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                {children}
            </main>
        </div>
    )
}
