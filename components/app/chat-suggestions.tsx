'use client';

import * as React from 'react';
import { useChat } from '@livekit/components-react';
import { useChatMessages } from '@/hooks/useChatMessages';
import { Button } from '@/components/livekit/button';
import { cn } from '@/lib/utils';
import { Sparkle } from '@phosphor-icons/react/dist/ssr';

// Define the suggestion mapping based on agent type and keywords
const SUGGESTIONS_MAP: Record<string, { starters: string[], keywords: Record<string, string[]> }> = {
    // General Spiritual / Satsang Avatar
    guruji: {
        starters: [
            "नमस्ते गुरुजी। मुझे मन की शांति कैसे मिल सकती है?",
            "ध्यान कैसे शुरू करूं?",
            "कर्म क्या है?"
        ],
        keywords: {
            "ध्यान": ["ध्यान के दौरान मुझे क्या सोचना चाहिए?", "कितनी देर ध्यान करना सही है?"],
            "कर्म": ["क्या बुरे कर्मों का फल टाला जा सकता है?", "निष्काम कर्म क्या होता है?"],
            "शांति": ["आज के तनावपूर्ण जीवन में शांति कैसे पाएं?", "क्या ध्यान से शांति मिलती है?"],
            "भक्ति": ["भक्ति योग क्या है?", "भगवान की सच्ची आराधना कैसे करें?"],
            "मोक्ष": ["क्या गृहस्थ जीवन में मोक्ष संभव है?", "मोक्ष प्राप्ति का सबसे सरल मार्ग क्या है?"]
        }
    },
    // Tarot Reader Avatar
    tarot: {
        starters: [
            "मेरा आज का दिन कैसा रहेगा?",
            "मेरे करियर में क्या बदलाव आने वाले हैं?",
            "क्या मुझे इस रिश्ते में आगे बढ़ना चाहिए?"
        ],
        keywords: {
            "करियर": ["क्या मुझे नई नौकरी खोजनी चाहिए?", "व्यापार में सफलता कैसे मिलेगी?"],
            "रिश्ता": ["क्या वह इंसान मेरे लिए सही है?", "मेरा वैवाहिक जीवन कैसा रहेगा?"],
            "पैसा": ["क्या मेरी आर्थिक स्थिति में सुधार होगा?", "धन लाभ के क्या संकेत हैं?"],
            "भविष्य": ["अगले 6 महीने मेरे लिए कैसे रहेंगे?", "क्या मुझे कोई बड़ी सफलता मिलेगी?"]
        }
    },
    // Vedic Astrology Avatar
    astrology: {
        starters: [
            "मेरी कुंडली में मेरा मुख्य ग्रह कौन सा है?",
            "राहु और केतु का मेरे जीवन पर क्या प्रभाव है?",
            "क्या मेरी कुंडली में कोई राजयोग है?"
        ],
        keywords: {
            "ग्रह": ["मेरे खराब ग्रहों को शांत करने के उपाय क्या हैं?", "क्या मुझे कोई रत्न पहनना चाहिए?"],
            "दशा": ["मेरी वर्तमान महादशा कब तक चलेगी?", "शनि की साढ़े साती का क्या प्रभाव होगा?"],
            "विवाह": ["मेरी शादी कब होगी?", "मेरा जीवनसाथी कैसा होगा?"]
        }
    }
};

interface ChatSuggestionsProps {
    agentName?: string;
    className?: string;
}

export function ChatSuggestions({ agentName = 'guruji', className }: ChatSuggestionsProps) {
    const { send } = useChat();
    const messages = useChatMessages();

    // We use this to track if the agent is actively typing/speaking if possible
    // In LiveKit, usually we wait until the agent sends a complete message.

    const handleSuggestionClick = async (suggestion: string) => {
        // Send the message natively using LiveKit hook
        await send(suggestion);
    };

    // Determine which suggestions to show
    const currentMap = SUGGESTIONS_MAP[agentName] || SUGGESTIONS_MAP['guruji'];
    let activeSuggestions = currentMap.starters;

    // If there are messages, find the last agent message to determine context
    if (messages.length > 0) {
        // Filter to find the last message from the Remote participant (Agent)
        const agentMessages = messages.filter(m => !m.from?.isLocal);

        if (agentMessages.length > 0) {
            const lastAgentMessage = agentMessages[agentMessages.length - 1].message.toLowerCase();

            // Look for keyword matches to provide contextual follow-ups
            let matchFound = false;

            // Simple loop to find the first keyword hit in the agent's message
            for (const [keyword, questions] of Object.entries(currentMap.keywords)) {
                if (lastAgentMessage.includes(keyword.toLowerCase())) {
                    activeSuggestions = questions;
                    matchFound = true;
                    break;
                }
            }

            // If we are mid-conversation but no keywords matched, provide generic continuations
            if (!matchFound) {
                if (agentName === 'tarot') {
                    activeSuggestions = ["क्या आप इसके बारे में और बता सकते हैं?", "मुझे आगे क्या करना चाहिए?", "कोई और कार्ड चुनें?"];
                } else if (agentName === 'astrology') {
                    activeSuggestions = ["इसके लिए मुझे क्या उपाय करने चाहिए?", "यह समय कब तक रहेगा?"];
                } else {
                    activeSuggestions = ["कृपया इसे विस्तार से समझाएं।", "मुझे अपने दैनिक जीवन में इसे कैसे अपनाना चाहिए?"];
                }
            }
        }
    }

    // Only show the first 3 suggestions maximum to avoid clutter
    const suggestionsToShow = activeSuggestions.slice(0, 3);

    if (suggestionsToShow.length === 0) return null;

    return (
        <div className={cn("w-full flex w-full overflow-x-auto gap-2 pb-2 scrollbar-hide snap-x pt-2 px-1", className)}>
            {suggestionsToShow.map((suggestion, idx) => (
                <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="snap-start shrink-0 rounded-full border-white/20 bg-white/5 backdrop-blur-md hover:bg-white/10 text-white shadow-sm transition-all whitespace-nowrap text-xs md:text-sm font-light flex items-center gap-1.5"
                >
                    <Sparkle className="w-3.5 h-3.5 text-orange-400" weight="fill" />
                    {suggestion}
                </Button>
            ))}
        </div>
    );
}
