'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Leaf, Zap, Waves, Mic2, Sparkles } from 'lucide-react';
import { PresetCard } from '@/components/business/preset-card';
import { BusinessMusicPlayer } from '@/components/business/business-music-player';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth/auth-provider';

export default function GymSpaPage() {
    const { user } = useAuth();
    const [activeMode, setActiveMode] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [status, setStatus] = useState<'idle' | 'generating' | 'playing' | 'error'>('idle');
    const [agentPrompt, setAgentPrompt] = useState('');

    // Mock current track for UI demonstration
    const [currentTrack, setCurrentTrack] = useState<{ title: string, style: string, url: string } | undefined>(undefined);

    const presets = [
        {
            id: 'gym',
            title: 'Gym Mode',
            description: 'High energy, motivating beats for upbeat workouts.',
            icon: Dumbbell,
            theme: 'orange' as const,
            style: 'High Energy Upbeat EDM Workout Music',
        },
        {
            id: 'spa',
            title: 'Spa Mode',
            description: 'Deep relaxation, ambient textures, 432Hz healing.',
            icon: Leaf,
            theme: 'green' as const,
            style: 'Ambient 432Hz Healing Spa Music with Water Sounds',
        },
        {
            id: 'hiit',
            title: 'HIIT Blast',
            description: 'Intense rhythm for interval training and cardio.',
            icon: Zap,
            theme: 'red' as const,
            style: 'Intense Phonk Bass Heavy Workout',
        },
        {
            id: 'yoga',
            title: 'Yoga Flow',
            description: 'Balanced flow, gentle rhythm, spiritual focus.',
            icon: Waves,
            theme: 'blue' as const,
            style: 'Gentle Yoga Flow Music with Flute',
        },
    ];

    const handleModeSelect = async (presetId: string) => {
        setActiveMode(presetId);
        const preset = presets.find(p => p.id === presetId);
        if (!preset) return;

        // Simulate connection to Music Agent
        console.log(`[Business] Switching to ${preset.title} Mode`);
        setStatus('generating');

        // In a real implementation, this would call startSession or trigger the agent
        setTimeout(() => {
            setCurrentTrack({
                title: `Satsang ${preset.title} Session`,
                style: preset.style,
                url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' // Placeholder
            });
            setStatus('playing');
            setIsPlaying(true);
        }, 2500);
    };

    const handleAgentCommand = (e: React.FormEvent) => {
        e.preventDefault();
        if (!agentPrompt.trim()) return;

        // Simulate sending command to agent
        console.log(`[Business] Agent Command: ${agentPrompt}`);
        setAgentPrompt('');
        setStatus('generating');
        setTimeout(() => {
            setCurrentTrack(prev => prev ? { ...prev, title: `Custom: ${agentPrompt}`, style: 'Custom Agent Selection' } : undefined);
            setStatus('playing');
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-background pb-32">
            <div className="bg-gradient-to-b from-primary/10 to-background pb-12 pt-16">
                <div className="container mx-auto px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-12 text-center"
                    >
                        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                            Satsang for <span className="text-primary">Business</span>
                        </h1>
                        <p className="mt-4 text-lg text-muted-foreground">
                            Intelligent AI Music curation for your Gym, Spa, or Wellness Center.
                        </p>
                    </motion.div>

                    {/* Agent Command Center */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mx-auto mb-16 max-w-2xl rounded-2xl border bg-card/50 p-6 backdrop-blur-sm"
                    >
                        <form onSubmit={handleAgentCommand} className="flex gap-4">
                            <div className="relative flex-1">
                                <Mic2 className="absolute left-3 top-3 text-muted-foreground" size={20} />
                                <Input
                                    placeholder="Talk to your AI DJ... (e.g., 'Make it more intense', 'Switch to cool down')"
                                    className="pl-10 h-12 text-lg"
                                    value={agentPrompt}
                                    onChange={(e) => setAgentPrompt(e.target.value)}
                                />
                            </div>
                            <Button type="submit" size="lg" className="h-12 px-8">
                                <Sparkles className="mr-2" size={18} />
                                Command
                            </Button>
                        </form>
                    </motion.div>

                    {/* Presets Grid */}
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {presets.map((preset, index) => (
                            <motion.div
                                key={preset.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 + 0.3 }}
                                className="h-64"
                            >
                                <PresetCard
                                    {...preset}
                                    isActive={activeMode === preset.id}
                                    onClick={() => handleModeSelect(preset.id)}
                                    colorTheme={preset.theme}
                                />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Info Section */}
            <div className="container mx-auto px-4 py-12">
                <div className="grid gap-8 md:grid-cols-3">
                    <div className="rounded-xl bg-card p-6 shadow-sm border">
                        <h3 className="mb-2 font-semibold">Continuous Flow</h3>
                        <p className="text-sm text-muted-foreground">Our AI ensures there are no awkward silences between tracks, keeping the vibe alive.</p>
                    </div>
                    <div className="rounded-xl bg-card p-6 shadow-sm border">
                        <h3 className="mb-2 font-semibold">Venue Optimization</h3>
                        <p className="text-sm text-muted-foreground">Audio is normalized and equalized specifically for large open spaces like gyms and halls.</p>
                    </div>
                    <div className="rounded-xl bg-card p-6 shadow-sm border">
                        <h3 className="mb-2 font-semibold">Royalty Free</h3>
                        <p className="text-sm text-muted-foreground">All generated music is unique and royalty-free, tailored for your business use.</p>
                    </div>
                </div>
            </div>

            {/* Persistent Player */}
            <BusinessMusicPlayer
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onPlayPause={() => setIsPlaying(!isPlaying)}
                onNext={() => handleModeSelect(activeMode || 'gym')}
                status={status}
            />
        </div>
    );
}
