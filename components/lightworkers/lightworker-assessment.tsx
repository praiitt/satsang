'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/components/auth/auth-provider';
import { db } from '@/lib/firebase-client';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';

const QUESTIONS_EN = [
    {
        id: 'q1',
        trait: 'Purpose',
        text: 'Do you feel a profound, inexplicable calling to help others or bring positive change to the world?'
    },
    {
        id: 'q2',
        trait: 'Empathy',
        text: 'Are you highly sensitive to the energy and emotions of people around you, often absorbing them as your own?'
    },
    {
        id: 'q3',
        trait: 'Wisdom',
        text: 'Have you always felt like an "old soul" with an inner wisdom that goes beyond your years?'
    },
    {
        id: 'q4',
        trait: 'Healing',
        text: 'Do strangers and friends naturally gravitate to you to share their deepest problems and seek comfort?'
    },
    {
        id: 'q5',
        trait: 'Transformation',
        text: 'Have you experienced significant early-life challenges that ultimately acted as a catalyst for your spiritual awakening?'
    },
    {
        id: 'q6',
        trait: 'Alignment',
        text: 'Do you feel a deep connection to nature and solitary reflection to recharge your energy?'
    },
    {
        id: 'q7',
        trait: 'Mission',
        text: 'Do you often feel that human culture needs profound healing and that you are meant to be part of that shift?'
    }
];

const QUESTIONS_HI = [
    {
        id: 'q1',
        trait: 'Purpose',
        text: 'क्या आपको दूसरों की मदद करने या दुनिया में सकारात्मक बदलाव लाने की एक गहरी, अकथनीय पुकार महसूस होती है?'
    },
    {
        id: 'q2',
        trait: 'Empathy',
        text: 'क्या आप अपने आस-पास के लोगों की ऊर्जा और भावनाओं के प्रति अत्यधिक संवेदनशील हैं, और अक्सर उन्हें अपने अंदर समाहित कर लेते हैं?'
    },
    {
        id: 'q3',
        trait: 'Wisdom',
        text: 'क्या आपने हमेशा खुद को एक "पुरानी आत्मा" (old soul) की तरह महसूस किया है, जिसके पास अपनी उम्र से कहीं अधिक भीतरी ज्ञान है?'
    },
    {
        id: 'q4',
        trait: 'Healing',
        text: 'क्या अजनबी और दोस्त स्वाभाविक रूप से अपनी सबसे गहरी समस्याएं साझा करने और सांत्वना पाने के लिए आपकी ओर आकर्षित होते हैं?'
    },
    {
        id: 'q5',
        trait: 'Transformation',
        text: 'क्या आपने जीवन के शुरुआती दौर में महत्वपूर्ण चुनौतियों का सामना किया है, जो अंततः आपके आध्यात्मिक जागरण का कारण बनीं?'
    },
    {
        id: 'q6',
        trait: 'Alignment',
        text: 'क्या आप अपनी ऊर्जा को रिचार्ज करने के लिए प्रकृति और एकांत चिंतन से एक गहरा जुड़ाव महसूस करते हैं?'
    },
    {
        id: 'q7',
        trait: 'Mission',
        text: 'क्या आपको अक्सर लगता है कि मानवीय संस्कृति को गहन उपचार (healing) की आवश्यकता है और आप उस बदलाव का हिस्सा बनने के लिए बने हैं?'
    }
];

export function LightworkerAssessment() {
    const { language, t } = useLanguage();
    const { user } = useAuth();
    
    const [started, setStarted] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [isComplete, setIsComplete] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [score, setScore] = useState(0);

    const [isLoadingPrevious, setIsLoadingPrevious] = useState(true);

    const questions = language === 'hi' ? QUESTIONS_HI : QUESTIONS_EN;

    useEffect(() => {
        async function fetchPreviousAssessment() {
            if (!user?.uid) {
                setIsLoadingPrevious(false);
                return;
            }

            try {
                const assessmentRef = doc(db, 'users', user.uid, 'assessments', 'lightworker');
                const docSnap = await getDoc(assessmentRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.scorePercentage !== undefined) {
                        setScore(data.scorePercentage);
                        if (data.answers) setAnswers(data.answers);
                        setIsComplete(true);
                    }
                }
            } catch (error) {
                console.error("Error fetching previous assessment:", error);
            } finally {
                setIsLoadingPrevious(false);
            }
        }

        fetchPreviousAssessment();
    }, [user]);

    const handleStart = () => {
        setStarted(true);
    };

    const handleAnswer = async (value: number) => {
        const currentQ = questions[currentStep];
        const newAnswers = { ...answers, [currentQ.id]: value };
        setAnswers(newAnswers);

        if (currentStep < questions.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            // Calculate final score
            const finalScore = Object.values(newAnswers).reduce((a, b) => a + b, 0);
            const totalPossible = questions.length * 2; // Assuming max score 2 per Q
            const percentage = (finalScore / totalPossible) * 100;
            
            setScore(percentage);
            setIsComplete(true);
            saveResults(newAnswers, percentage);
        }
    };

    const saveResults = async (finalAnswers: Record<string, number>, finalScore: number) => {
        if (!user || !user.uid) return; // Only save if user is logged in
        
        setIsSaving(true);
        try {
            // Save to users/{uid}/assessments/lightworker
            const assessmentRef = doc(db, 'users', user.uid, 'assessments', 'lightworker');
            await setDoc(assessmentRef, {
                answers: finalAnswers,
                scorePercentage: Math.round(finalScore),
                isLightworker: finalScore >= 70, // Threshold to be considered a lightworker
                completedAt: serverTimestamp(),
                languageTaken: language
            }, { merge: true });
            
            // Also maintain a master list of lightworkers for easy querying
            if (finalScore >= 70) {
                 const masterRef = doc(db, 'lightworkers', user.uid);
                 await setDoc(masterRef, {
                     userId: user.uid,
                     scorePercentage: Math.round(finalScore),
                     assessedAt: serverTimestamp(),
                     status: 'active'
                 }, { merge: true });
            }
        } catch (error) {
            console.error('Error saving assessment:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const isLightworker = score >= 70;

    return (
        <section className="relative w-full overflow-hidden rounded-3xl bg-card border border-border shadow-xl">
            <div className="absolute top-0 right-0 p-32 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 p-8 sm:p-12 min-h-[400px] flex flex-col justify-center">
                {isLoadingPrevious ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                ) : (
                <AnimatePresence mode="wait">
                    
                    {/* Intro Screen */}
                    {!started && !isComplete && (
                        <motion.div
                            key="intro"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="text-center space-y-6 max-w-2xl mx-auto"
                        >
                            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
                                <span className="text-3xl">✨</span>
                            </div>
                            <h3 className="text-3xl font-bold bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
                                {language === 'hi' ? 'क्या आप एक लाइटवर्कर हैं?' : 'Are you a Lightworker?'}
                            </h3>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                {language === 'hi' 
                                    ? 'जानें कि क्या आपकी आत्मा में दुनिया को ठीक करने और ऊपर उठाने का एक गहरा उद्देश्य है। इस 7-प्रश्नों के मूल्यांकन के माध्यम से अपनी आध्यात्मिक पुकार का पता लगाएं।' 
                                    : 'Discover if your soul carries a deeper mission to heal and uplift the world. Take this 7-question assessment to explore your spiritual calling.'}
                            </p>
                            
                            {!user && (
                                <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-600 dark:text-amber-400">
                                    {language === 'hi' 
                                    ? 'नोट: अपना परिणाम सहेजने के लिए कृपया सत्संग ऐप में लॉग इन करें।' 
                                    : 'Note: Please log in to the Satsang app to save your results.'}
                                </div>
                            )}

                            <div className="pt-4">
                                <Button 
                                    onClick={handleStart}
                                    size="lg"
                                    className="rounded-full px-8 text-lg"
                                >
                                    {language === 'hi' ? 'मूल्यांकन शुरू करें' : 'Start Assessment'}
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* Questions Screen */}
                    {started && !isComplete && (
                        <motion.div
                            key="questions"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="max-w-2xl mx-auto w-full"
                        >
                            <div className="mb-8 flex justify-between items-center text-sm font-medium text-muted-foreground">
                                <span>Question {currentStep + 1} of {questions.length}</span>
                                <span>{Math.round(((currentStep) / questions.length) * 100)}% Complete</span>
                            </div>
                            
                            {/* Progress bar */}
                            <div className="w-full h-2 bg-muted rounded-full mb-10 overflow-hidden">
                                <motion.div 
                                    className="h-full bg-primary"
                                    initial={{ width: `${((currentStep) / questions.length) * 100}%` }}
                                    animate={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={`q-${currentStep}`}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-10"
                                >
                                    <h4 className="text-2xl sm:text-3xl font-medium leading-tight text-foreground text-center">
                                        {questions[currentStep].text}
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <Button 
                                            variant="outline" 
                                            size="lg"
                                            onClick={() => handleAnswer(2)}
                                            className="h-16 text-lg border-primary/20 hover:border-primary hover:bg-primary/5 rounded-xl transition-all"
                                        >
                                            {language === 'hi' ? 'हां, बिल्कुल' : 'Yes, deeply'}
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="lg"
                                            onClick={() => handleAnswer(1)}
                                            className="h-16 text-lg border-border hover:border-foreground/30 hover:bg-muted rounded-xl transition-all"
                                        >
                                            {language === 'hi' ? 'कभी-कभी' : 'Sometimes'}
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="lg"
                                            onClick={() => handleAnswer(0)}
                                            className="h-16 text-lg border-border hover:border-destructive/30 hover:bg-destructive/5 rounded-xl transition-all"
                                        >
                                            {language === 'hi' ? 'नहीं' : 'No'}
                                        </Button>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {/* Results Screen */}
                    {isComplete && (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center space-y-6 max-w-2xl mx-auto"
                        >
                            <div className={`inline-flex items-center justify-center p-4 rounded-full mb-2 ${isLightworker ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                                <span className="text-4xl">{isLightworker ? '🌟' : '🌱'}</span>
                            </div>
                            
                            <h3 className="text-3xl font-bold text-foreground">
                                {language === 'hi' ? 'आपका परिणाम' : 'Your Result'}
                            </h3>
                            
                            <div className={`p-8 rounded-2xl border ${isLightworker ? 'bg-amber-500/5 border-amber-500/20' : 'bg-card border-border'}`}>
                                <h4 className={`text-2xl font-bold mb-4 ${isLightworker ? 'text-amber-500' : 'text-primary'}`}>
                                    {isLightworker 
                                        ? (language === 'hi' ? 'आप एक जागृत लाइटवर्कर हैं' : 'You are an Awakened Lightworker')
                                        : (language === 'hi' ? 'आप आध्यात्मिक विकास के मार्ग पर हैं' : 'You are on the Path of Spiritual Growth')}
                                </h4>
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    {isLightworker
                                        ? (language === 'hi' 
                                            ? 'आपके उत्तर एक मजबूत आत्मा उद्देश्य का संकेत देते हैं। गहरी सहानुभूति, भीतरी ज्ञान और बदलाव लाने की प्रेरणा लाइटवर्कर के स्पष्ट संकेत हैं। आप पृथ्वी पर चेतना बढ़ाने में मदद करने के लिए यहाँ हैं। सचेत रूप से अपने उपहारों को अपनाने का समय आ गया है।'
                                            : 'Your responses indicate a strong soul purpose. The deep empathy, inner wisdom, and drive to create change are clear signs of a Lightworker. You are here to help shift consciousness on Earth. It is time to consciously embrace your gifts.')
                                        : (language === 'hi'
                                            ? 'आप सहानुभूति और समझ के गुण धारण करते हैं, और आपकी आध्यात्मिक यात्रा सुंदरता से अनफोल्ड हो रही है। अपनी अंतर्ज्ञान का पोषण करते रहें और आंतरिक शांति की तलाश करें।'
                                            : 'You hold beautiful qualities of empathy and understanding, and your spiritual journey is unfolding. Continue to nurture your intuition and seek inner peace.')}
                                </p>
                            </div>
                            
                            {user ? (
                                <p className="text-sm text-green-500 font-medium">
                                    {language === 'hi' ? '✓ परिणाम आपकी प्रोफ़ाइल में सहेज लिया गया है' : '✓ Result saved to your profile'}
                                </p>
                            ) : (
                                <div className="p-4 rounded-xl bg-muted border border-border text-sm">
                                    {language === 'hi' 
                                    ? 'अपने परिणाम सुरक्षित रखने और अपना आध्यात्मिक मार्गदर्शिका प्राप्त करने के लिए साइन इन करें।' 
                                    : 'Sign in to save your results and get your personalized spiritual guide.'}
                                </div>
                            )}

                            <div className="pt-6">
                                <Button 
                                    variant="outline"
                                    onClick={() => {
                                        setStarted(false);
                                        setIsComplete(false);
                                        setCurrentStep(0);
                                        setAnswers({});
                                        setScore(0);
                                    }}
                                    className="rounded-full"
                                >
                                    {language === 'hi' ? 'दोबारा टेस्ट दें' : 'Retake Assessment'}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                )}
            </div>
        </section>
    );
}
