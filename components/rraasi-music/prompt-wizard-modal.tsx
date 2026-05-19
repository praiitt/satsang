'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Sparkles, Loader2, Play, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/language-context';

export interface PromptWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStartCall: (options: { intention: string }) => void;
}

export function PromptWizardModal({ isOpen, onClose, onStartCall }: PromptWizardModalProps) {
    const { language } = useLanguage();
    const isHi = language === 'hi';
    const [step, setStep] = useState(1);
    const [userInput, setUserInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [finalPrompt, setFinalPrompt] = useState('');

    const reset = () => {
        setStep(1);
        setUserInput('');
        setFinalPrompt('');
        setIsGenerating(false);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const generatePrompt = async () => {
        if (!userInput.trim()) return;

        setIsGenerating(true);
        setStep(2); // Loading step

        try {
            const res = await fetch('/api/rraasi-music/generate-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ theme: 'General Spiritual Music', keywords: userInput, language }),
            });

            const data = await res.json();
            if (res.ok && data.prompt) {
                setFinalPrompt(data.prompt);
                setStep(3); // Review step
            } else {
                setFinalPrompt(userInput);
                setStep(3);
            }
        } catch (error) {
            console.error('Failed to generate prompt', error);
            setFinalPrompt(userInput);
            setStep(3);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleStart = () => {
        onStartCall({ intention: finalPrompt || userInput });
        handleClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border border-amber-500/20 text-white overflow-hidden shadow-2xl shadow-amber-500/10">
                <DialogHeader className="pb-4 border-b border-white/5">
                    <DialogTitle className="flex items-center gap-2 text-xl font-medium tracking-wide">
                        <Wand2 className="w-5 h-5 text-amber-500" />
                        {isHi ? 'एआई प्रॉम्प्ट एन्हांसर' : 'AI Prompt Enhancer'}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        {isHi 
                            ? 'आप क्या बनाना चाहते हैं उसका वर्णन करें, और एआई को एक विस्तृत प्रॉम्प्ट तैयार करने दें।' 
                            : 'Describe what you want to create, and let AI craft the perfect detailed prompt.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 relative min-h-[300px]">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4 flex flex-col h-full"
                            >
                                <div className="space-y-1">
                                    <h3 className="text-sm font-medium text-amber-200 uppercase tracking-widest">
                                        {isHi ? 'आपका विचार' : 'Your Idea'}
                                    </h3>
                                    <p className="text-xs text-zinc-400">
                                        {isHi 
                                            ? 'देवता, मनोदशा, या वाद्ययंत्रों के बारे में कुछ कीवर्ड दर्ज करें।' 
                                            : 'Enter a few keywords about the deity, mood, or instruments.'}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(isHi 
                                        ? ['पढ़ाई', 'गहरी नींद', 'एकाग्रता', 'भगवान कृष्ण', 'भगवान शिव', 'हीलिंग', 'सुबह की बांसुरी']
                                        : ['Study', 'Deep Sleep', 'Concentration', 'Lord Krishna', 'Lord Shiva', 'Healing', 'Morning Flute']
                                    ).map((tag) => (
                                        <button
                                            key={tag}
                                            onClick={() => setUserInput(prev => prev ? `${prev}, ${tag}` : tag)}
                                            className="px-3 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all text-xs text-zinc-300"
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    placeholder={isHi ? 'उदाहरण: भगवान कृष्ण के लिए एक शांतिपूर्ण सुबह की बांसुरी...' : 'e.g. A peaceful morning flute for Lord Krishna...'}
                                    className="w-full flex-1 min-h-[120px] rounded-xl bg-black/50 border border-white/10 p-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 resize-none"
                                />
                                <div className="flex justify-between pt-2">
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            onStartCall({ intention: userInput });
                                            handleClose();
                                        }}
                                        className="text-zinc-400 hover:text-white"
                                    >
                                        {isHi ? 'छोड़ें और सीधे शुरू करें' : 'Skip & Start Direct'}
                                    </Button>
                                    <Button
                                        onClick={generatePrompt}
                                        disabled={!userInput.trim()}
                                        className="bg-amber-500 hover:bg-amber-400 text-black font-bold gap-2"
                                    >
                                        <Sparkles className="w-4 h-4" /> {isHi ? 'एआई के साथ बढ़ाएं' : 'Enhance with AI'}
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                className="absolute inset-0 flex flex-col items-center justify-center space-y-4"
                            >
                                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center relative">
                                    <div className="absolute inset-0 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
                                    <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-amber-400 font-medium tracking-wide">
                                        {isHi ? 'आपका प्रॉम्प्ट बढ़ाया जा रहा है...' : 'Enhancing your prompt...'}
                                    </h3>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        {isHi ? 'हमारा एआई सही निर्देश तैयार कर रहा है।' : 'Our AI is composing the perfect instructions.'}
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4 flex flex-col h-full"
                            >
                                <div className="space-y-1">
                                    <h3 className="text-sm font-medium text-amber-200 uppercase tracking-widest">
                                        {isHi ? 'संवर्धित प्रॉम्प्ट' : 'Enhanced Prompt'}
                                    </h3>
                                    <p className="text-xs text-zinc-400">
                                        {isHi 
                                            ? 'सत्र शुरू करने से पहले समीक्षा करें, संपादित करें, या पुन: उत्पन्न करें।' 
                                            : 'Review, edit, or regenerate before starting the session.'}
                                    </p>
                                </div>
                                <textarea
                                    value={finalPrompt}
                                    onChange={(e) => setFinalPrompt(e.target.value)}
                                    className="w-full flex-1 min-h-[160px] rounded-xl bg-amber-500/5 border border-amber-500/30 p-4 text-sm text-amber-50 leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                                />
                                <div className="flex justify-between pt-2">
                                    <Button variant="ghost" onClick={generatePrompt} className="text-zinc-400 hover:text-white gap-2">
                                        <RefreshCw className="w-4 h-4" /> {isHi ? 'पुन: उत्पन्न करें' : 'Regenerate'}
                                    </Button>
                                    <Button
                                        onClick={handleStart}
                                        className="bg-amber-500 hover:bg-amber-400 text-black font-bold gap-2 animate-in fade-in zoom-in duration-300"
                                    >
                                        <Play className="w-4 h-4 fill-black" /> {isHi ? 'सत्र शुरू करें' : 'Start Session'}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}
