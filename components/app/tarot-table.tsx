'use client';

import { useEffect, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils'; // Assuming standard utils

interface TarotCard {
    name: string;
    image?: string; // URL to image
    meaning: string;
    position: number;
}

interface TarotTableProps {
    className?: string;
}

export function TarotTable({ className }: TarotTableProps) {
    const room = useRoomContext();
    const [cards, setCards] = useState<TarotCard[]>([]);
    const [isDealing, setIsDealing] = useState(false);
    const [topic, setTopic] = useState<string>("");

    // Listen for Tarot events
    useEffect(() => {
        if (!room) return;

        const onData = (payload: Uint8Array, participant: any, kind: any, topicArg?: string) => {
            // topicArg corresponds to 'topic' in publish_data
            if (topicArg !== 'tarot.event' && topicArg !== 'tarot.deal') {
                // Check if payload has type inside
            }

            try {
                const text = new TextDecoder().decode(payload);
                const data = JSON.parse(text);

                if (data.type === 'tarot.deal') {
                    // Start dealing sequence for 3-card spread
                    setTopic(data.topic);
                    setIsDealing(true);
                    // Clear old cards first
                    setCards([]);

                    // Staggered reveal
                    const newCards = data.cards as TarotCard[];

                    // Add cards one by one for effect (or just set them and let Motion handle exit/enter)
                    setTimeout(() => {
                        setCards(newCards);
                        setIsDealing(false);
                    }, 500);
                } else if (data.type === 'tarot.yesno') {
                    // New: Yes/No single card
                    setTopic(`Yes/No: ${data.question}`);
                    setIsDealing(true);
                    setCards([]);

                    // Display single card with answer
                    const yesNoCard: TarotCard = {
                        name: data.card.name,
                        image: data.card.image,
                        meaning: `${data.answer.toUpperCase()}: ${data.card.meaning}`,
                        position: 0
                    };

                    setTimeout(() => {
                        setCards([yesNoCard]);
                        setIsDealing(false);
                    }, 500);
                }

            } catch (e) {
                console.error("Failed to parse Tarot event", e);
            }
        };

        room.on(RoomEvent.DataReceived, onData);
        return () => {
            room.off(RoomEvent.DataReceived, onData);
        };
    }, [room]);

    return (
        <div className={cn("relative w-full h-full flex flex-col items-center justify-center min-h-[400px]", className)}>
            {/* Table Surface */}
            <div className="absolute inset-0 bg-indigo-950 opacity-50 rounded-lg pointer-events-none" />

            <AnimatePresence>
                {/* Deck in center if no cards */}
                {cards.length === 0 && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0, x: -200 }}
                        className="w-32 h-48 bg-gradient-to-br from-purple-900 to-slate-900 border-2 border-amber-500 rounded-xl shadow-2xl flex items-center justify-center z-10"
                    >
                        <div className="text-amber-500 text-4xl">✨</div>
                    </motion.div>
                )}

                {/* Dealt Cards */}
                {cards.length > 0 && (
                    <div className="flex flex-nowrap md:flex-wrap gap-4 md:gap-8 z-20 justify-start md:justify-center overflow-x-auto md:overflow-visible w-full px-4 md:px-0 scrollbar-hide snap-x snap-mandatory py-4">
                        {cards.map((card, index) => (
                            <motion.div
                                key={`${card.name}-${index}`}
                                initial={{ y: -50, opacity: 0, rotateY: 90 }}
                                animate={{ y: 0, opacity: 1, rotateY: 0 }}
                                transition={{ delay: index * 0.5, duration: 0.8, type: 'spring' }}
                                className="min-w-[240px] w-64 h-96 relative perspective-1000 group snap-center"
                            >
                                <div className="absolute inset-0 bg-slate-900 border border-amber-500/30 rounded-xl shadow-xl overflow-hidden flex flex-col">
                                    {/* Card Image Area */}
                                    <div className="h-2/3 bg-black/50 relative">
                                        {card.image ? (
                                            <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-purple-900/20">
                                                <span className="text-4xl">🎴</span>
                                            </div>
                                        )}

                                        {/* Yes/No Answer Badge */}
                                        {cards.length === 1 && card.meaning.includes('YES:') && (
                                            <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse">
                                                YES ✓
                                            </div>
                                        )}
                                        {cards.length === 1 && card.meaning.includes('NO:') && (
                                            <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse">
                                                NO ✗
                                            </div>
                                        )}
                                        {cards.length === 1 && card.meaning.includes('UNCLEAR:') && (
                                            <div className="absolute top-4 right-4 bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse">
                                                UNCLEAR ?
                                            </div>
                                        )}

                                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                            <h3 className="text-amber-100 font-serif text-xl font-bold text-center">{card.name}</h3>
                                        </div>
                                    </div>
                                    {/* Card Meaning */}
                                    <div className="p-4 text-amber-100/80 text-sm italic text-center overflow-y-auto max-h-[140px]">
                                        "{card.meaning}"
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {topic && (
                <div className="absolute top-4 text-amber-500/50 uppercase tracking-widest text-xs font-semibold">
                    Reading for: {topic}
                </div>
            )}
        </div>
    );
}
