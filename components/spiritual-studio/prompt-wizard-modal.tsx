'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Sparkles, Loader2, Play, RefreshCw, Clapperboard, Palette, Music } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/language-context';

export type DirectorMode = 'music' | 'art' | 'reels';

export interface PromptWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStartCall: (options: { intention?: string; script?: string; imagePrompt?: string }) => void;
    initialInput?: string;
    mode?: DirectorMode;
}

export function PromptWizardModal({ isOpen, onClose, onStartCall, initialInput, mode = 'music' }: PromptWizardModalProps) {
    const { language } = useLanguage();
    const isHi = language === 'hi';
    const [step, setStep] = useState(1);
    const [userInput, setUserInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    
    // For Music and Art
    const [finalPrompt, setFinalPrompt] = useState('');
    
    // For Reels
    const [finalScript, setFinalScript] = useState('');
    const [finalImagePrompt, setFinalImagePrompt] = useState('');

    useEffect(() => {
        if (isOpen && initialInput) {
            setUserInput(initialInput);
        } else if (!isOpen) {
            reset();
        }
    }, [isOpen, initialInput]);

    const reset = () => {
        setStep(1);
        setUserInput('');
        setFinalPrompt('');
        setFinalScript('');
        setFinalImagePrompt('');
        setIsGenerating(false);
    };

    const handleClose = () => {
        onClose();
    };

    const generatePrompt = async () => {
        if (!userInput.trim()) return;

        setIsGenerating(true);
        setStep(2);

        try {
            const res = await fetch('/api/studio/director', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    intention: userInput, 
                    language,
                    mode 
                }),
            });

            const data = await res.json();
            
            if (res.ok) {
                if (mode === 'reels') {
                    setFinalScript(data.script || userInput);
                    setFinalImagePrompt(data.imagePrompt || userInput);
                } else {
                    setFinalPrompt(data.prompt || userInput);
                }
                setStep(3);
            } else {
                setFinalPrompt(userInput);
                setFinalScript(userInput);
                setFinalImagePrompt(userInput);
                setStep(3);
            }
        } catch (error) {
            console.error('Failed to generate prompt', error);
            setFinalPrompt(userInput);
            setFinalScript(userInput);
            setFinalImagePrompt(userInput);
            setStep(3);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleStart = () => {
        if (mode === 'reels') {
            onStartCall({ 
                intention: userInput,
                script: finalScript, 
                imagePrompt: finalImagePrompt 
            });
        } else {
            onStartCall({ intention: finalPrompt || userInput });
        }
        handleClose();
    };

    const getModeConfig = () => {
        switch (mode) {
            case 'art':
                return {
                    icon: <Palette className="w-5 h-5 text-amber-500" />,
                    title: isHi ? 'कला निर्देशक' : 'Art Director',
                    desc: isHi ? 'अपने विचार का वर्णन करें, और एआई को एक सुंदर कला प्रॉम्प्ट तैयार करने दें।' : 'Describe your idea, and let AI craft a beautiful art prompt.',
                    tags: isHi ? ['भगवान शिव', 'शांतिपूर्ण', 'जल रंग', 'ध्यान', 'प्राकृतिक प्रकाश'] : ['Lord Shiva', 'Peaceful', 'Watercolor', 'Meditation', 'Natural Light'],
                    placeholder: isHi ? 'उदाहरण: भगवान कृष्ण के लिए एक सुंदर कला...' : 'e.g. A beautiful painting of Lord Krishna in a forest...',
                    action: isHi ? 'कला उत्पन्न करें' : 'Generate Art'
                };
            case 'reels':
                return {
                    icon: <Clapperboard className="w-5 h-5 text-amber-500" />,
                    title: isHi ? 'रील्स निर्देशक' : 'Reels Director',
                    desc: isHi ? 'अपना विचार दें, एआई एक पूर्ण 15-सेकंड की स्क्रिप्ट और दृश्य विवरण तैयार करेगा।' : 'Give your idea, AI will craft a full 15-second script and visual description.',
                    tags: isHi ? ['प्रेरणा', 'आशीर्वाद', 'शक्ति', 'सफलता', 'आंतरिक शांति'] : ['Motivation', 'Blessing', 'Strength', 'Success', 'Inner Peace'],
                    placeholder: isHi ? 'उदाहरण: मेरे परिवार के स्वास्थ्य के लिए एक प्रार्थना...' : 'e.g. A prayer for my family\'s health...',
                    action: isHi ? 'रिल उत्पन्न करें' : 'Generate Reel'
                };
            case 'music':
            default:
                return {
                    icon: <Music className="w-5 h-5 text-amber-500" />,
                    title: isHi ? 'संगीत निर्देशक' : 'Music Director',
                    desc: isHi ? 'आप क्या बनाना चाहते हैं उसका वर्णन करें, और एआई को एक विस्तृत प्रॉम्प्ट तैयार करने दें।' : 'Describe what you want to create, and let AI craft the perfect detailed prompt.',
                    tags: isHi ? ['पढ़ाई', 'गहरी नींद', 'भगवान कृष्ण', 'हीलिंग', 'सुबह की बांसुरी'] : ['Study', 'Deep Sleep', 'Lord Krishna', 'Healing', 'Morning Flute'],
                    placeholder: isHi ? 'उदाहरण: भगवान कृष्ण के लिए एक शांतिपूर्ण सुबह की बांसुरी...' : 'e.g. A peaceful morning flute for Lord Krishna...',
                    action: isHi ? 'सत्र शुरू करें' : 'Start Session'
                };
        }
    };

    const config = getModeConfig();

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border border-amber-500/20 text-white overflow-hidden shadow-2xl shadow-amber-500/10">
                <DialogHeader className="pb-4 border-b border-white/5">
                    <DialogTitle className="flex items-center gap-2 text-xl font-medium tracking-wide">
                        {config.icon}
                        {config.title}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        {config.desc}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 relative min-h-[300px] max-h-[70vh] overflow-y-auto custom-scrollbar">
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
                                            ? 'कुछ कीवर्ड दर्ज करें।' 
                                            : 'Enter a few keywords about your idea.'}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {config.tags.map((tag) => (
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
                                    placeholder={config.placeholder}
                                    className="w-full flex-1 min-h-[120px] rounded-xl bg-black/50 border border-white/10 p-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 resize-none"
                                />
                                <div className="flex justify-between pt-2">
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            if (mode === 'reels') {
                                                onStartCall({ intention: userInput, script: userInput, imagePrompt: userInput });
                                            } else {
                                                onStartCall({ intention: userInput });
                                            }
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
                                            : 'Review, edit, or regenerate before starting.'}
                                    </p>
                                </div>
                                
                                {mode === 'reels' ? (
                                    <div className="flex flex-col space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-amber-400/80">Spoken Script</label>
                                            <textarea
                                                value={finalScript}
                                                onChange={(e) => setFinalScript(e.target.value)}
                                                className="w-full min-h-[80px] rounded-lg bg-amber-500/5 border border-amber-500/30 p-3 text-sm text-amber-50 leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-amber-400/80">Visual Description</label>
                                            <textarea
                                                value={finalImagePrompt}
                                                onChange={(e) => setFinalImagePrompt(e.target.value)}
                                                className="w-full min-h-[80px] rounded-lg bg-amber-500/5 border border-amber-500/30 p-3 text-sm text-amber-50 leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <textarea
                                        value={finalPrompt}
                                        onChange={(e) => setFinalPrompt(e.target.value)}
                                        className="w-full flex-1 min-h-[160px] rounded-xl bg-amber-500/5 border border-amber-500/30 p-4 text-sm text-amber-50 leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                                    />
                                )}
                                
                                <div className="flex justify-between pt-2">
                                    <Button variant="ghost" onClick={generatePrompt} className="text-zinc-400 hover:text-white gap-2">
                                        <RefreshCw className="w-4 h-4" /> {isHi ? 'पुन: उत्पन्न करें' : 'Regenerate'}
                                    </Button>
                                    <Button
                                        onClick={handleStart}
                                        className="bg-amber-500 hover:bg-amber-400 text-black font-bold gap-2 animate-in fade-in zoom-in duration-300"
                                    >
                                        <Play className="w-4 h-4 fill-black" /> {config.action}
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
