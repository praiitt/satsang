export type Language = 'en' | 'hi';

export const translations = {
  en: {
    common: {
      login: 'Login',
      logout: 'Logout',
      faq: 'FAQ',
      welcome: 'Welcome to RRAASI Satsang',
      startConversation: 'Start Conversation',
      freeTrial: 'Free Trial',
      remaining: 'remaining',
      redirecting: 'Redirecting to login...',
    },
    auth: {
      welcome: 'Welcome to Satsang',
      verifyNumber: 'Verify your number',
      enterPhone: 'Enter your phone number to continue',
      codeSent: 'We sent a code to your phone',
      phoneNumber: 'Phone Number',
      enterOTP: 'Enter OTP Code',
      sendOTP: 'Send OTP',
      sending: 'Sending...',
      verify: 'Verify',
      verifying: 'Verifying...',
      back: 'Back',
      resend: "Didn't receive code? Resend",
      codeSentTo: 'Code sent to',
      autoDetect: 'OTP will be auto-detected from SMS',
      phonePlaceholder: '+91 9876543210',
      phoneHint: 'Enter your phone number with country code (e.g., +91 for India)',
      loginSuccess: 'Login to get unlimited access and remove the 15-minute limit',
    },
    session: {
      playing: 'Playing...',
      paused: 'Paused',
      close: 'Close',
      mute: 'Mute',
      unmute: 'Unmute',
      volume: 'Volume',
    },
    welcome: {
      title: 'Your spiritual guru is now with you',
      description:
        'RRAASI Satsang - An AI-powered spiritual assistant that talks to you in Hindi, answers questions, plays bhajans, and narrates gurus discourses. Just speak and enjoy!',
      freeTrial: '🎁 15 minutes free trial - No credit card required',
      features: 'Key Features',
      voiceAI: 'Voice-based AI Assistant',
      voiceAIDesc: 'Talk naturally in Hindi, ask questions, and get spiritual guidance',
      bhajanPlayer: 'Bhajan Player',
      bhajanPlayerDesc: 'Play devotional songs on demand through voice commands',
      pravachan: 'Pravachan Narrator',
      pravachanDesc: 'Listen to spiritual discourses and teachings',
      dailySatsang: 'Daily Satsang',
      dailySatsangDesc: 'Structured daily spiritual sessions with guided meditation',
      videoTitle: 'RRAASI Satsang',
      videoFallback:
        'Your browser does not support video playback. Please update or try a different browser.',
      hindiSupport: 'Full Hindi Support',
      hindiSupportDesc:
        'Speech-to-text, AI processing, and text-to-speech - all in Hindi. Speak in Hindi, listen in Hindi, understand in Hindi.',
      playBhajans: 'Play Bhajans',
      playBhajansDesc:
        'Just say "play Krishna bhajan" or "play Hare Krishna" - AI will instantly search and play bhajans from YouTube. Thousands of bhajans at your voice command.',
      pravachanVani: 'Pravachan and Vani',
      pravachanVaniDesc:
        'Want to listen to a discourse on a topic? Just say "play discourse on devotion" or "play Sadhguru discourse" - AI will instantly find and play the appropriate discourse.',
      spiritualGuidance: 'Spiritual Guidance',
      spiritualGuidanceDesc:
        'Ask questions on Dharma, Yoga, Meditation, Karma, Bhakti, Vedanta - any spiritual topic. Get answers from Gita, Vedas, Upanishads, Ramayana, Mahabharata.',
      easySetup: 'Simple and Fast',
      easySetupDesc:
        'No need to install any app. Just open the browser, allow microphone permission, and start. Connect with your spiritual guru in seconds.',
      howItWorks: 'How It Works?',
      step1Title: 'Login',
      step1Desc: 'Quick and secure login/verification with your mobile number. No complex process.',
      step2Title: 'Allow Microphone',
      step2Desc:
        'Allow microphone and speaker permissions from the browser. This only needs to be done once.',
      step3Title: 'Start Conversation',
      step3Desc:
        'Click the "Start Conversation" button and start speaking in Hindi. Ask questions, request bhajans, or ask for discourses.',
      step4Title: 'Enjoy',
      step4Desc:
        'AI guru listens to you, understands, and responds appropriately. Enjoy bhajans and discourses, and progress on your spiritual journey.',
      useCases: 'What Can You Do?',
      useCase1: 'Get answers to spiritual questions',
      useCase2: 'Listen to your favorite bhajans',
      useCase3: 'Listen to gurus discourses',
      useCase4: 'Learn about meditation and yoga',
      ctaReady: 'Ready? Start your conversation with AI guru now.',
      ctaStartSatsang: 'Start Satsang',
      ctaWatchDemo: 'Watch Demo',
      ctaOneClick: 'Just one click away - start your conversation with Guruji.',
      ctaStartNow: 'Start Now',
      ctaViewFAQ: 'View FAQ',
      technology: 'Modern Technology, Traditional Knowledge',
      technologyDesc:
        'RRAASI Satsang uses AI and modern technology to make spiritual knowledge easily accessible to every seeker. Our goal is to make the spiritual experience smooth, accessible, and meaningful through technology.',
      aiPowered: 'AI-Powered',
      realTime: 'Real-time',
      secure: 'Secure',
      browserBased: 'Browser-based',
      faq: 'Frequently Asked Questions',
      faq1Question: 'What is this feature and how does it work?',
      faq1Answer:
        'RRAASI Satsang is an AI-powered spiritual assistant that talks to you in Hindi. You can ask questions through voice, request bhajans, or ask for discourses. AI understands you and responds appropriately or plays the requested content.',
      faq2Question: 'Do I need to download any app?',
      faq2Answer:
        'No! RRAASI Satsang is completely browser-based. You just need to open the website in your browser, allow microphone permission, and start. No need to install any app.',
      faq3Question: 'Which bhajans can I listen to?',
      faq3Answer:
        'You can listen to any bhajan by saying its name. For example, "play Krishna bhajan", "play Hare Krishna", "play Om Namah Shivaya", etc. AI will instantly search and play the appropriate bhajan from YouTube.',
      faq4Question: 'Can I listen to pravachan or vani?',
      faq4Answer:
        'Yes! You can ask to listen to discourses on any topic. For example, "play discourse on devotion", "play Sadhguru discourse", "play Osho vani", etc. AI will find and play the appropriate discourse.',
      faq5Question: 'Microphone/speaker not working - what should I do?',
      faq5Answer:
        'Make sure you have allowed microphone and speaker permissions to the browser. Check microphone/speaker permissions for this site in browser settings. If the problem persists, refresh the page and allow permissions again.',
      faq6Question: 'Is this service free?',
      faq6Answer:
        'Yes, we provide a 15-minute free trial that requires no credit card. After that, you may need to subscribe to continue using the service.',
      faq7Question: 'Can I talk in English?',
      faq7Answer:
        'RRAASI Satsang is primarily designed for Hindi language, but AI can understand multiple languages. However, it is recommended to talk in Hindi for the best experience.',
      faq8Question: 'Who developed this feature?',
      faq8Answer:
        'This feature is developed and presented by RRAASI. Our goal is to make the spiritual experience smooth, accessible, and meaningful through technology, so that every seeker can easily connect and benefit.',
    },
  },
  hi: {
    common: {
      login: 'लॉगिन करें',
      logout: 'लॉग आउट',
      faq: 'FAQ',
      welcome: 'RRAASI सत्संग में आपका स्वागत है',
      startConversation: 'बातचीत शुरू करें',
      freeTrial: 'Free Trial',
      remaining: 'शेष',
      redirecting: 'लॉगिन पर रीडायरेक्ट हो रहा है...',
    },
    auth: {
      welcome: 'सत्संग में आपका स्वागत है',
      verifyNumber: 'अपना नंबर सत्यापित करें',
      enterPhone: 'जारी रखने के लिए अपना फोन नंबर दर्ज करें',
      codeSent: 'हमने आपके फोन पर एक कोड भेजा है',
      phoneNumber: 'फोन नंबर',
      enterOTP: 'OTP कोड दर्ज करें',
      sendOTP: 'OTP भेजें',
      sending: 'भेज रहे हैं...',
      verify: 'सत्यापित करें',
      verifying: 'सत्यापित कर रहे हैं...',
      back: 'वापस',
      resend: 'कोड नहीं मिला? पुनः भेजें',
      codeSentTo: 'कोड भेजा गया:',
      autoDetect: '📱 OTP स्वचालित रूप से SMS से पहचाना जाएगा',
      phonePlaceholder: '+91 9876543210',
      phoneHint: 'देश कोड के साथ अपना फोन नंबर दर्ज करें (उदाहरण: भारत के लिए +91)',
      loginSuccess:
        'लॉगिन करके आप 15 मिनट की सीमा से मुक्त हो जाएंगे और असीमित समय तक गुरुजी से बात कर सकेंगे',
    },
    session: {
      playing: '▶️ Playing...',
      paused: '⏸️ Paused',
      close: 'Close',
      mute: 'Mute',
      unmute: 'Unmute',
      volume: 'Volume',
    },
    welcome: {
      title: 'आपका आध्यात्मिक गुरु अब आपके साथ है',
      description:
        'RRAASI सत्संग - एक AI-संचालित आध्यात्मिक सहायक जो हिन्दी में आपसे बात करता है, प्रश्नों के उत्तर देता है, भजन चलाता है, और गुरुओं के प्रवचन सुनाता है। बस बोलिए और आनंद लीजिए!',
      freeTrial: '🎁 15 मिनट का निःशुल्क परीक्षण - कोई क्रेडिट कार्ड की आवश्यकता नहीं',
      features: 'मुख्य विशेषताएं',
      voiceAI: 'आवाज़-आधारित AI सहायक',
      voiceAIDesc:
        'हिन्दी में बोलकर अपने आध्यात्मिक गुरु से बातचीत करें। वास्तविक समय में प्रश्न पूछें, मार्गदर्शन प्राप्त करें, और गहन आध्यात्मिक चर्चा करें।',
      bhajanPlayer: 'भजन प्लेयर',
      bhajanPlayerDesc: 'आवाज़ कमांड के माध्यम से मांग पर भक्ति गीत चलाएं',
      pravachan: 'प्रवचन वाचक',
      pravachanDesc: 'आध्यात्मिक प्रवचन और शिक्षाओं को सुनें',
      dailySatsang: 'डेली सत्संग',
      dailySatsangDesc: 'निर्देशित ध्यान के साथ संरचित दैनिक आध्यात्मिक सत्र',
      videoTitle: 'RRAASI सत्संग',
      videoFallback:
        'आपका ब्राउज़र वीडियो प्लेबैक समर्थित नहीं करता। कृपया अपडेट करें या अलग ब्राउज़र आज़माएं।',
      hindiSupport: 'पूर्ण हिन्दी समर्थन',
      hindiSupportDesc:
        'भाषण-से-पाठ, AI प्रसंस्करण, और पाठ-से-भाषण - सभी हिन्दी में। बोलिए हिन्दी में, सुनिए हिन्दी में, समझिए हिन्दी में।',
      playBhajans: 'भजन चलाएं',
      playBhajansDesc:
        'बस कहिए "कृष्ण का भजन सुनाओ" या "हरे कृष्ण सुनाओ" - AI तुरंत YouTube से भजन खोजकर चला देगा। हजारों भजन आपकी आवाज़ के एक आदेश पर।',
      pravachanVani: 'प्रवचन और वाणी',
      pravachanVaniDesc:
        'किसी विषय पर प्रवचन सुनना चाहते हैं? बस कहिए "भक्ति पर प्रवचन सुनाओ" या "सद्गुरु का प्रवचन सुनाओ" - AI तुरंत उपयुक्त प्रवचन खोजकर चला देगा।',
      spiritualGuidance: 'आध्यात्मिक मार्गदर्शन',
      spiritualGuidanceDesc:
        'धर्म, योग, ध्यान, कर्म, भक्ति, वेदांत - किसी भी आध्यात्मिक विषय पर प्रश्न पूछें। गीता, वेद, उपनिषद, रामायण, महाभारत से उत्तर प्राप्त करें।',
      easySetup: 'सरल और तेज़',
      easySetupDesc:
        'कोई ऐप इंस्टॉल करने की आवश्यकता नहीं। बस ब्राउज़र खोलिए, माइक की अनुमति दीजिए, और शुरू करें। सेकंडों में अपने आध्यात्मिक गुरु से जुड़ें।',
      howItWorks: 'यह कैसे काम करता है?',
      step1Title: 'लॉगिन करें',
      step1Desc:
        'अपने मोबाइल नंबर से त्वरित और सुरक्षित लॉगिन/सत्यापन करें। कोई जटिल प्रक्रिया नहीं।',
      step2Title: 'माइक की अनुमति दें',
      step2Desc: 'ब्राउज़र से माइक और स्पीकर की अनुमति दें। यह केवल एक बार करना होता है।',
      step3Title: 'बातचीत शुरू करें',
      step3Desc:
        '"गुरुजी से बातचीत" बटन पर क्लिक करें और हिन्दी में बोलना शुरू करें। प्रश्न पूछें, भजन सुनने को कहें, या प्रवचन सुनने को कहें।',
      step4Title: 'आनंद लें',
      step4Desc:
        'AI गुरु आपकी बात सुनता है, समझता है, और उचित उत्तर देता है। भजन और प्रवचन का आनंद लें, और अपनी आध्यात्मिक यात्रा में आगे बढ़ें।',
      useCases: 'आप क्या कर सकते हैं?',
      useCase1: 'आध्यात्मिक प्रश्नों के उत्तर प्राप्त करें',
      useCase2: 'अपने पसंदीदा भजन सुनें',
      useCase3: 'गुरुओं के प्रवचन सुनें',
      useCase4: 'ध्यान और योग के बारे में जानें',
      ctaReady: 'तैयार हैं? अभी अपने AI गुरु से बातचीत शुरू करें।',
      ctaStartSatsang: 'सत्संग शुरू करें',
      ctaWatchDemo: 'डेमो देखें',
      ctaOneClick: 'बस एक क्लिक दूर — गुरुजी से बातचीत शुरू करें।',
      ctaStartNow: 'अभी शुरू करें',
      ctaViewFAQ: 'FAQ देखें',
      technology: 'आधुनिक तकनीक, पारंपरिक ज्ञान',
      technologyDesc:
        'RRAASI सत्संग AI और आधुनिक तकनीक का उपयोग करता है ताकि हर साधक को आध्यात्मिक ज्ञान तक आसान पहुंच मिल सके। हमारा उद्देश्य है कि तकनीक के माध्यम से आध्यात्मिक अनुभव को सहज, सुलभ और सार्थक बनाया जाए।',
      aiPowered: '🤖 AI-संचालित',
      realTime: '🎯 वास्तविक समय',
      secure: '🔒 सुरक्षित',
      browserBased: '🌐 ब्राउज़र-आधारित',
      faq: 'अक्सर पूछे जाने वाले प्रश्न',
      faq1Question: 'यह सुविधा क्या है और यह कैसे काम करती है?',
      faq1Answer:
        'RRAASI सत्संग एक AI-संचालित आध्यात्मिक सहायक है जो आपसे हिन्दी में बात करता है। आप आवाज़ के माध्यम से प्रश्न पूछ सकते हैं, भजन सुनने को कह सकते हैं, या प्रवचन सुनने को कह सकते हैं। AI आपकी बात समझता है और उचित उत्तर देता है या मांगी गई सामग्री चलाता है।',
      faq2Question: 'क्या मुझे कोई ऐप डाउनलोड करना होगा?',
      faq2Answer:
        'नहीं! RRAASI सत्संग पूर्णतः ब्राउज़र-आधारित है। आपको केवल अपने ब्राउज़र में वेबसाइट खोलनी है, माइक की अनुमति देनी है, और शुरू करना है। कोई ऐप इंस्टॉल करने की आवश्यकता नहीं है।',
      faq3Question: 'मैं कौन से भजन सुन सकता हूं?',
      faq3Answer:
        'आप किसी भजन का नाम बोलकर सुन सकते हैं। उदाहरण के लिए, "कृष्ण का भजन सुनाओ", "हरे कृष्ण सुनाओ", "ओम नमः शिवाय सुनाओ", आदि। AI YouTube से उपयुक्त भजन खोजकर तुरंत चला देगा।',
      faq4Question: 'क्या मैं प्रवचन या वाणी सुन सकता हूं?',
      faq4Answer:
        'हाँ! आप किसी विषय पर प्रवचन सुनने के लिए कह सकते हैं। उदाहरण के लिए, "भक्ति पर प्रवचन सुनाओ", "सद्गुरु का प्रवचन सुनाओ", "ओशो की वाणी सुनाओ", आदि। AI उपयुक्त प्रवचन खोजकर चला देगा।',
      faq5Question: 'माइक/स्पीकर काम नहीं कर रहा है - क्या करूं?',
      faq5Answer:
        'सुनिश्चित करें कि आपने ब्राउज़र को माइक और स्पीकर की अनुमति दी है। ब्राउज़र सेटिंग्स में जाकर इस साइट के लिए माइक/स्पीकर की अनुमति चेक करें। यदि समस्या बनी रहे, तो पेज को रीफ़्रेश करें और फिर से अनुमति दें।',
      faq6Question: 'क्या यह सेवा निःशुल्क है?',
      faq6Answer:
        'हाँ, हम 15 मिनट का निःशुल्क परीक्षण प्रदान करते हैं जिसमें कोई क्रेडिट कार्ड की आवश्यकता नहीं है। इसके बाद, सेवा का उपयोग जारी रखने के लिए सदस्यता लेने की आवश्यकता हो सकती है।',
      faq7Question: 'क्या मैं अंग्रेजी में बात कर सकता हूं?',
      faq7Answer:
        'RRAASI सत्संग मुख्य रूप से हिन्दी भाषा के लिए डिज़ाइन किया गया है, लेकिन AI कई भाषाओं को समझ सकता है। हालाँकि, सर्वोत्तम अनुभव के लिए हिन्दी में बात करने की सलाह दी जाती है।',
      faq8Question: 'यह सुविधा किसने विकसित की है?',
      faq8Answer:
        'यह सुविधा RRAASI द्वारा विकसित और प्रस्तुत की गई है। हमारा उद्देश्य तकनीक के माध्यम से आध्यात्मिक अनुभव को सहज, सुलभ और सार्थक बनाना है, ताकि हर साधक आसानी से जुड़ सके और लाभान्वित हो।',
    },
  },
} as const;

export function getTranslation(language: Language, key: string): string {
  const keys = key.split('.');
  let value: unknown = translations[language] as unknown;

  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = (value as Record<string, unknown>)[k];
    } else {
      value = undefined;
      break;
    }
  }

  return typeof value === 'string' ? value : key;
}

export function useTranslation(language: Language) {
  return (key: string) => getTranslation(language, key);
}
