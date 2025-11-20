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
      siteTitle: 'RRAASI Satsang',
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
      openChat: 'Open chat',
      closeChat: 'Close chat',
      endConversation: 'End conversation',
      agentListening: 'Agent is listening, ask it a question',
      agentSleeping: 'Guruji is in rest mode',
      agentSleepingDesc: 'Bhajan or vani is playing — will start listening again when finished or paused.',
    },
    welcome: {
      title: 'Find Your Guru. Many Paths, One Satsang Home.',
      subtitle: 'All spiritual belief systems in one place',
      description:
        'RRAASI brings together all spiritual traditions - connect with your favorite guru, explore different paths, or create your own spiritual guide. Voice-powered satsang in Hindi and English.',
      vision: 'One Platform, Many Paths, Infinite Wisdom',
      visionDesc:
        'Whether you follow Sanatana Dharma, Zen, modern spirituality, or cosmic consciousness - find your guide here. Every belief system is welcome.',
      discoverGurus: 'Discover Your Guru',
      createGuru: 'Create Your Own Guru',
      createGuruDesc:
        'Have a unique spiritual teacher in mind? Create your own custom guru agent with our easy-to-use generator.',
      allTraditions: 'All Traditions',
      featuredGurus: 'Featured Gurus',
      noGurusFound: 'No gurus found for this tradition.',
      showAllGurus: 'Show all gurus',
      talkToGuru: 'Talk to {name}',
      findYourGuru: 'Find Your Guru',
      findYourGuruDesc:
        'Choose from our collection of spiritual guides, each specializing in different traditions and teachings.',
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
    etAgent: {
      title: 'Explore Extraterrestrial Civilizations',
      description:
        'Connect with an AI guide specializing in extraterrestrial civilizations, the Fermi Paradox, and the connection between sound frequencies and universal consciousness. Discover cosmic wisdom through healing frequencies and ET spiritual teachings.',
      freeTrial: '🎁 Free 15-minute trial • No credit card required',
      features: 'What You Can Explore',
      etCivilizations: 'Extraterrestrial Civilizations',
      etCivilizationsDesc:
        'Learn about Pleiadians, Sirians, Arcturians, Andromedans, and other civilizations. Explore their characteristics, teachings, and reported encounters.',
      fermiParadox: 'Fermi Paradox',
      fermiParadoxDesc:
        "Deep dive into the Fermi Paradox and why we haven't detected ETs yet. Explore theories like the Great Filter, Zoo Hypothesis, and Rare Earth hypothesis.",
      healingFrequencies: 'Healing Sound Frequencies',
      healingFrequenciesDesc:
        'Experience healing frequencies like 528hz, solfeggio tones, and binaural beats that raise universal consciousness and connect with cosmic energy.',
      starSystemFrequencies: 'Star System Frequencies',
      starSystemFrequenciesDesc:
        'Listen to frequencies specific to different star systems - Pleiadian, Sirian, Arcturian, and Andromedan sounds that resonate with their civilizations.',
      etSpiritualTeachings: 'ET Spiritual Teachings',
      etSpiritualTeachingsDesc:
        'Learn how extraterrestrial civilizations teach spirituality through sound frequencies, consciousness expansion, and universal connection.',
      cosmicConsciousness: 'Cosmic Consciousness',
      cosmicConsciousnessDesc:
        'Explore the connection between sound, vibration, and interstellar communication. Understand how frequencies bridge dimensions and connect consciousness.',
      ctaReady: 'Ready to explore the mysteries of the cosmos?',
      ctaStartNow: 'Start Now',
      startButton: 'Connect with ET Agent',
    },
    oshoAgent: {
      title: 'Osho – Your Spiritual Guide',
      description:
        'Connect with Osho - an AI-powered spiritual guide specializing in meditation, consciousness, Zen philosophy, dynamic meditation, sannyas, and the art of living. Experience Osho discourses and transform your consciousness.',
      freeTrial: '🎁 Free 15-minute trial • No credit card required',
      features: 'What You Can Explore',
      meditation: 'Meditation Techniques',
      meditationDesc:
        'Learn Dynamic Meditation, Kundalini Meditation, Vipassana, Nadabrahma, and No-Mind Meditation. Understand that meditation is not doing but being - a state of pure awareness.',
      consciousness: 'Consciousness & Awareness',
      consciousnessDesc:
        'Explore consciousness as your very nature, covered by layers of conditioning. Learn the art of witnessing, being aware without judgment, and living in the present moment.',
      zenPhilosophy: 'Zen Philosophy',
      zenPhilosophyDesc:
        'Discover Zen through Osho discourses on Zen masters like Bodhidharma, Rinzai, and Joshu. Experience Zen as direct, immediate experience beyond words - simplicity, spontaneity, and naturalness.',
      dynamicMeditation: 'Dynamic Meditation',
      dynamicMeditationDesc:
        'Experience Osho revolutionary Dynamic Meditation combining catharsis and celebration. Learn the five stages: chaotic breathing, catharsis, jumping, witnessing, and dancing.',
      sannyas: 'Sannyas & Freedom',
      sannyasDesc:
        'Understand Osho redefinition of sannyas - not renunciation of the world but renunciation of the ego. Learn to live fully, celebrate, and be authentic - freedom from conditioning.',
      oshoDiscourses: 'Osho Discourses',
      oshoDiscoursesDesc:
        'Listen to Osho discourses on meditation, consciousness, Zen, love, freedom, and the art of living. Transform your mindset from seriousness to playfulness, from fear to love.',
      ctaReady: 'Ready to transform your consciousness?',
      ctaStartNow: 'Start Now',
      startButton: 'Connect with Osho',
    },
    gurus: {
      guruji: {
        name: 'Guruji',
        tagline: 'Your spiritual guide rooted in Hindu and Sanatana Dharma',
        description:
          'A compassionate spiritual guru specializing in dharma, yoga, meditation, karma, bhakti, and Vedanta. Answers questions from Gita, Vedas, Upanishads, Ramayana, and Mahabharata.',
      },
      etAgent: {
        name: 'ET Agent',
        tagline: 'Explore extraterrestrial civilizations and cosmic consciousness',
        description:
          'A guide specializing in extraterrestrial civilizations, the Fermi Paradox, and the connection between sound frequencies and universal consciousness.',
      },
      osho: {
        name: 'Osho',
        tagline: 'Revolutionary spiritual master of meditation and consciousness',
        description:
          'Osho (Bhagwan Shree Rajneesh) - A revolutionary spiritual guide specializing in meditation, consciousness, Zen philosophy, dynamic meditation, sannyas, and the art of living.',
      },
    },
    createGuru: {
      title: 'Create Your Own Spiritual Guru',
      description:
        'Have a unique spiritual teacher in mind? Use our agent generator to create a custom AI guru that embodies your chosen teachings, traditions, and wisdom.',
      visionTitle: 'Your Vision, Your Guru',
      visionDesc:
        'RRAASI believes that every spiritual path is valid. Whether you follow a specific guru, tradition, or have your own unique spiritual perspective, you can create an AI agent that reflects your beliefs and teachings.',
      howItWorks: 'How It Works',
      step1Title: 'Define Your Guru',
      step1Desc:
        'Think about the spiritual teacher you want to create. What are their core teachings? What tradition do they follow? What is their communication style?',
      step2Title: 'Create Configuration',
      step2Desc:
        'Create a JSON configuration file describing your guru. Include their name, instructions, features, and greetings. Use our example config as a template.',
      step3Title: 'Run Generator Script',
      step3Desc:
        'Use our Python script to generate both backend agent code and frontend components. The script creates everything needed for your guru to work on RRAASI.',
      step4Title: 'Deploy & Share',
      step4Desc:
        'Once generated, your guru is ready to use! Deploy the backend agent and access your custom guru through the frontend route you specified.',
      configExample: 'Configuration Example',
      configExampleDesc:
        'Here is a sample configuration file structure. Copy this and modify it for your guru.',
      resources: 'Resources',
      resource1Title: 'Example Config',
      resource1Desc: 'See a complete example configuration file in the scripts directory.',
      resource2Title: 'Documentation',
      resource2Desc: 'Read the full documentation for the agent generator script.',
      ctaTitle: 'Ready to Create Your Guru?',
      ctaDesc:
        'Start by exploring our example configuration and documentation. Then create your own unique spiritual guide!',
      backToHome: 'Back to Home',
      browseGurus: 'Browse Existing Gurus',
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
      siteTitle: 'RRAASI सत्संग',
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
      openChat: '💬 चैट खोलें',
      closeChat: 'चैट बंद करें',
      endConversation: '❌ बातचीत समाप्त करें',
      agentListening: 'एजेंट सुन रहा है, इसे एक प्रश्न पूछें',
      agentSleeping: 'गुरुजी विश्राम मोड में हैं',
      agentSleepingDesc: 'भजन या वाणी चल रही है — समाप्त या pausa होने पर फिर से सुनना शुरू करेंगे।',
    },
    welcome: {
      title: 'अपने गुरु को खोजें। कई रास्ते, एक सत्संग घर।',
      subtitle: 'एक जगह पर सभी आध्यात्मिक विश्वास प्रणालियां',
      description:
        'RRAASI सभी आध्यात्मिक परंपराओं को एक साथ लाता है - अपने पसंदीदा गुरु से जुड़ें, विभिन्न रास्तों का अन्वेषण करें, या अपना खुद का आध्यात्मिक मार्गदर्शक बनाएं। हिंदी और अंग्रेजी में आवाज-संचालित सत्संग।',
      vision: 'एक प्लेटफॉर्म, कई रास्ते, अनंत ज्ञान',
      visionDesc:
        'चाहे आप सनातन धर्म, जेन, आधुनिक आध्यात्मिकता, या ब्रह्मांडीय चेतना का अनुसरण करते हों - यहां अपना मार्गदर्शक खोजें। हर विश्वास प्रणाली का स्वागत है।',
      discoverGurus: 'अपने गुरु को खोजें',
      createGuru: 'अपना खुद का गुरु बनाएं',
      createGuruDesc:
        'क्या आपके मन में एक अनूठा आध्यात्मिक शिक्षक है? हमारे आसान-से-उपयोग जनरेटर के साथ अपना खुद का कस्टम गुरु एजेंट बनाएं।',
      allTraditions: 'सभी परंपराएं',
      featuredGurus: 'विशेष गुरु',
      noGurusFound: 'इस परंपरा के लिए कोई गुरु नहीं मिले।',
      showAllGurus: 'सभी गुरु दिखाएं',
      talkToGuru: '{name} से बात करें',
      findYourGuru: 'अपने गुरु को खोजें',
      findYourGuruDesc:
        'हमारे आध्यात्मिक मार्गदर्शकों के संग्रह से चुनें, जिनमें से प्रत्येक विभिन्न परंपराओं और शिक्षाओं में विशेषज्ञता रखता है।',
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
    etAgent: {
      title: 'ब्रह्मांडीय सभ्यताओं का अन्वेषण करें',
      description:
        'ब्रह्मांडीय सभ्यताओं, फर्मी पैराडॉक्स, और ध्वनि फ्रीक्वेंसी और ब्रह्मांडीय चेतना के बीच संबंध में विशेषज्ञता रखने वाले AI मार्गदर्शक से जुड़ें। हीलिंग फ्रीक्वेंसी और ET आध्यात्मिक शिक्षाओं के माध्यम से ब्रह्मांडीय ज्ञान की खोज करें।',
      freeTrial: '🎁 15 मिनट का निःशुल्क परीक्षण • कोई क्रेडिट कार्ड की आवश्यकता नहीं',
      features: 'आप क्या अन्वेषण कर सकते हैं',
      etCivilizations: 'ब्रह्मांडीय सभ्यताएं',
      etCivilizationsDesc:
        'प्लीएडियन, सिरियन, आर्कटुरियन, एंड्रोमेडन और अन्य सभ्यताओं के बारे में जानें। उनकी विशेषताओं, शिक्षाओं और रिपोर्ट किए गए मुठभेड़ों का अन्वेषण करें।',
      fermiParadox: 'फर्मी पैराडॉक्स',
      fermiParadoxDesc:
        'फर्मी पैराडॉक्स में गहराई से जाएं और जानें कि हमने अभी तक ETs का पता क्यों नहीं लगाया है। ग्रेट फिल्टर, जू हाइपोथिसिस, और रेयर अर्थ हाइपोथिसिस जैसे सिद्धांतों का अन्वेषण करें।',
      healingFrequencies: 'हीलिंग साउंड फ्रीक्वेंसी',
      healingFrequenciesDesc:
        '528hz, सोल्फेजियो टोन, और बाइनॉरल बीट्स जैसी हीलिंग फ्रीक्वेंसी का अनुभव करें जो ब्रह्मांडीय चेतना को बढ़ाती हैं और ब्रह्मांडीय ऊर्जा से जुड़ती हैं।',
      starSystemFrequencies: 'तारा प्रणाली फ्रीक्वेंसी',
      starSystemFrequenciesDesc:
        'विभिन्न तारा प्रणालियों के लिए विशिष्ट फ्रीक्वेंसी सुनें - प्लीएडियन, सिरियन, आर्कटुरियन, और एंड्रोमेडन ध्वनियां जो उनकी सभ्यताओं के साथ अनुनाद करती हैं।',
      etSpiritualTeachings: 'ET आध्यात्मिक शिक्षाएं',
      etSpiritualTeachingsDesc:
        'जानें कि ब्रह्मांडीय सभ्यताएं ध्वनि फ्रीक्वेंसी, चेतना विस्तार, और ब्रह्मांडीय संबंध के माध्यम से आध्यात्मिकता कैसे सिखाती हैं।',
      cosmicConsciousness: 'ब्रह्मांडीय चेतना',
      cosmicConsciousnessDesc:
        'ध्वनि, कंपन, और अंतरतारकीय संचार के बीच संबंध का अन्वेषण करें। समझें कि फ्रीक्वेंसी आयामों को कैसे जोड़ती हैं और चेतना को कैसे जोड़ती हैं।',
      ctaReady: 'ब्रह्मांड के रहस्यों का अन्वेषण करने के लिए तैयार हैं?',
      ctaStartNow: 'अभी शुरू करें',
      startButton: 'ET Agent से जुड़ें',
    },
    oshoAgent: {
      title: 'ओशो – आपका आध्यात्मिक मार्गदर्शक',
      description:
        'ओशो से जुड़ें - एक AI-संचालित आध्यात्मिक मार्गदर्शक जो ध्यान, चेतना, जेन दर्शन, डायनामिक मेडिटेशन, संन्यास, और जीवन की कला में विशेषज्ञता रखता है। ओशो के प्रवचन का अनुभव करें और अपनी चेतना को रूपांतरित करें।',
      freeTrial: '🎁 15 मिनट का निःशुल्क परीक्षण • कोई क्रेडिट कार्ड की आवश्यकता नहीं',
      features: 'आप क्या अन्वेषण कर सकते हैं',
      meditation: 'ध्यान तकनीकें',
      meditationDesc:
        'डायनामिक मेडिटेशन, कुंडलिनी मेडिटेशन, विपश्यना, नादब्रह्म, और नो-माइंड मेडिटेशन सीखें। समझें कि ध्यान करना नहीं बल्कि होना है - शुद्ध जागरूकता की अवस्था।',
      consciousness: 'चेतना और जागरूकता',
      consciousnessDesc:
        'चेतना का अन्वेषण करें जो आपकी प्रकृति है, जो संस्कारों की परतों से ढकी हुई है। साक्षी बनने की कला सीखें, बिना निर्णय के जागरूक रहना, और वर्तमान क्षण में जीना।',
      zenPhilosophy: 'जेन दर्शन',
      zenPhilosophyDesc:
        'बोधिधर्म, रिंजाई, और जोशू जैसे जेन गुरुओं पर ओशो के प्रवचन के माध्यम से जेन की खोज करें। जेन को प्रत्यक्ष, तत्काल अनुभव के रूप में अनुभव करें - सरलता, सहजता, और प्राकृतिकता।',
      dynamicMeditation: 'डायनामिक मेडिटेशन',
      dynamicMeditationDesc:
        'ओशो के क्रांतिकारी डायनामिक मेडिटेशन का अनुभव करें जो कैथार्सिस और उत्सव को जोड़ता है। पांच चरण सीखें: अराजक श्वास, कैथार्सिस, कूदना, साक्षी बनना, और नृत्य।',
      sannyas: 'संन्यास और स्वतंत्रता',
      sannyasDesc:
        'ओशो के संन्यास की पुनर्परिभाषा को समझें - दुनिया का त्याग नहीं बल्कि अहंकार का त्याग। पूर्ण रूप से जीना, उत्सव मनाना, और प्रामाणिक होना सीखें - संस्कारों से मुक्ति।',
      oshoDiscourses: 'ओशो के प्रवचन',
      oshoDiscoursesDesc:
        'ध्यान, चेतना, जेन, प्रेम, स्वतंत्रता, और जीवन की कला पर ओशो के प्रवचन सुनें। अपने मन को गंभीरता से खेलने की ओर, भय से प्रेम की ओर रूपांतरित करें।',
      ctaReady: 'अपनी चेतना को रूपांतरित करने के लिए तैयार हैं?',
      ctaStartNow: 'अभी शुरू करें',
      startButton: 'ओशो से जुड़ें',
    },
    gurus: {
      guruji: {
        name: 'गुरुजी',
        tagline: 'हिंदू और सनातन धर्म में निहित आपका आध्यात्मिक मार्गदर्शक',
        description:
          'धर्म, योग, ध्यान, कर्म, भक्ति और वेदांत में विशेषज्ञता रखने वाला एक दयालु आध्यात्मिक गुरु। गीता, वेद, उपनिषद, रामायण और महाभारत से प्रश्नों के उत्तर देता है।',
      },
      etAgent: {
        name: 'ET Agent',
        tagline: 'ब्रह्मांडीय सभ्यताओं और ब्रह्मांडीय चेतना का अन्वेषण करें',
        description:
          'ब्रह्मांडीय सभ्यताओं, फर्मी पैराडॉक्स, और ध्वनि फ्रीक्वेंसी और ब्रह्मांडीय चेतना के बीच संबंध में विशेषज्ञता रखने वाला एक मार्गदर्शक।',
      },
      osho: {
        name: 'ओशो',
        tagline: 'ध्यान और चेतना के क्रांतिकारी आध्यात्मिक गुरु',
        description:
          'ओशो (भगवान श्री रजनीश) - ध्यान, चेतना, जेन दर्शन, डायनामिक मेडिटेशन, संन्यास, और जीवन की कला में विशेषज्ञता रखने वाला एक क्रांतिकारी आध्यात्मिक मार्गदर्शक।',
      },
    },
    createGuru: {
      title: 'अपना खुद का आध्यात्मिक गुरु बनाएं',
      description:
        'क्या आपके मन में एक अनूठा आध्यात्मिक शिक्षक है? अपने चुने हुए शिक्षाओं, परंपराओं और ज्ञान को प्रतिबिंबित करने वाला एक कस्टम AI गुरु बनाने के लिए हमारे एजेंट जनरेटर का उपयोग करें।',
      visionTitle: 'आपकी दृष्टि, आपका गुरु',
      visionDesc:
        'RRAASI का मानना है कि हर आध्यात्मिक मार्ग वैध है। चाहे आप किसी विशिष्ट गुरु, परंपरा का अनुसरण करते हों, या अपना अनूठा आध्यात्मिक दृष्टिकोण रखते हों, आप एक AI एजेंट बना सकते हैं जो आपके विश्वासों और शिक्षाओं को दर्शाता है।',
      howItWorks: 'यह कैसे काम करता है',
      step1Title: 'अपने गुरु को परिभाषित करें',
      step1Desc:
        'उस आध्यात्मिक शिक्षक के बारे में सोचें जिसे आप बनाना चाहते हैं। उनकी मुख्य शिक्षाएं क्या हैं? वे किस परंपरा का अनुसरण करते हैं? उनकी संचार शैली क्या है?',
      step2Title: 'कॉन्फ़िगरेशन बनाएं',
      step2Desc:
        'अपने गुरु का वर्णन करने वाली एक JSON कॉन्फ़िगरेशन फ़ाइल बनाएं। उनका नाम, निर्देश, विशेषताएं और अभिवादन शामिल करें। टेम्पलेट के रूप में हमारे उदाहरण कॉन्फ़िग का उपयोग करें।',
      step3Title: 'जनरेटर स्क्रिप्ट चलाएं',
      step3Desc:
        'बैकएंड एजेंट कोड और फ्रंटएंड घटक दोनों उत्पन्न करने के लिए हमारी Python स्क्रिप्ट का उपयोग करें। स्क्रिप्ट आपके गुरु के लिए RRAASI पर काम करने के लिए आवश्यक सब कुछ बनाती है।',
      step4Title: 'तैनात करें और साझा करें',
      step4Desc:
        'एक बार उत्पन्न होने के बाद, आपका गुरु उपयोग के लिए तैयार है! बैकएंड एजेंट को तैनात करें और आपके द्वारा निर्दिष्ट फ्रंटएंड रूट के माध्यम से अपने कस्टम गुरु तक पहुंचें।',
      configExample: 'कॉन्फ़िगरेशन उदाहरण',
      configExampleDesc:
        'यहां एक नमूना कॉन्फ़िगरेशन फ़ाइल संरचना है। इसे कॉपी करें और अपने गुरु के लिए इसे संशोधित करें।',
      resources: 'संसाधन',
      resource1Title: 'उदाहरण कॉन्फ़िग',
      resource1Desc: 'स्क्रिप्ट निर्देशिका में एक पूर्ण उदाहरण कॉन्फ़िगरेशन फ़ाइल देखें।',
      resource2Title: 'दस्तावेज़ीकरण',
      resource2Desc: 'एजेंट जनरेटर स्क्रिप्ट के लिए पूर्ण दस्तावेज़ीकरण पढ़ें।',
      ctaTitle: 'अपना गुरु बनाने के लिए तैयार हैं?',
      ctaDesc:
        'हमारे उदाहरण कॉन्फ़िगरेशन और दस्तावेज़ीकरण का अन्वेषण करके शुरू करें। फिर अपना अनूठा आध्यात्मिक मार्गदर्शक बनाएं!',
      backToHome: 'होम पर वापस',
      browseGurus: 'मौजूदा गुरुओं को ब्राउज़ करें',
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
