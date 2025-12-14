import fs from 'fs';

const translationsPath = './lib/translations.ts';
const content = fs.readFileSync(translationsPath, 'utf8');

// Find the position to insert (before Hindi section starts)
const hiSectionIndex = content.indexOf('\n  hi: {');

if (hiSectionIndex === -1) {
    console.error('Could not find Hindi section');
    process.exit(1);
}

// Music translations for English
const musicTranslationsEN = `    music: {
      title: 'Create Healing & Spiritual Music with AI',
      subtitle: 'Generate bhajans, mantras, meditation music, and healing frequencies instantly',
      startButton: 'Start Creating Music',
      freeTrial: 'Free trial - No credit card required',
      featuresTitle: 'What You Can Create',
      bhajansTitle: 'Devotional Bhajans',
      bhajansDesc: 'Create beautiful bhajans for Krishna, Shiva, Ram, and other deities in traditional Indian classical styles',
      healingTitle: 'Healing Frequencies',
      healingDesc: '432Hz, 528Hz, and other Solfeggio frequencies for chakra healing and energy balancing',
      meditationTitle: 'Meditation Music',
      meditationDesc: 'Ambient soundscapes with nature sounds, singing bowls, and binaural beats for deep meditation',
      mantrasTitle: 'Sacred Mantras',
      mantrasDesc: 'Om chanting, Gayatri Mantra, and other Vedic mantras with authentic pronunciation',
      yogaTitle: 'Yoga Music',
      yogaDesc: 'Gentle instrumental music perfect for yoga practice, pranayama, and relaxation',
      customTitle: 'Custom Creations',
      customDesc: 'Describe any spiritual or healing music you need and let AI create it for you',
      howItWorksTitle: 'How It Works',
      step1Title: 'Tell the AI what you need',
      step1Desc: 'Use voice or text to describe the music you want - bhajan, mantra, meditation track, or healing frequency',
      step2Title: 'AI generates your music',
      step2Desc: 'Our advanced AI creates original music based on your request in seconds',
      step3Title: 'Listen and refine',
      step3Desc: 'Listen to the generated music and request changes until it's perfect',
      step4Title: 'Download and share',
      step4Desc: 'Download your custom spiritual music and use it for meditation, yoga, or sharing with others',
      ctaText: 'Ready to create your spiritual soundtrack?',
      ctaButton: 'Get Started Free',
    },
`;

// Music translations for Hindi
const musicTranslationsHI = `    music: {
      title: 'AI के साथ हीलिंग और आध्यात्मिक संगीत बनाएं',
      subtitle: 'भजन, मंत्र, ध्यान संगीत और हीलिंग फ्रीक्वेंसी तुरंत बनाएं',
      startButton: 'संगीत बनाना शुरू करें',
      freeTrial: 'निःशुल्क परीक्षण - कोई क्रेडिट कार्ड की आवश्यकता नहीं',
      featuresTitle: 'आप क्या बना सकते हैं',
      bhajansTitle: 'भक्ति भजन',
      bhajansDesc: 'कृष्ण, शिव, राम और अन्य देवताओं के लिए पारंपरिक भारतीय शास्त्रीय शैली में सुंदर भजन बनाएं',
      healingTitle: 'हीलिंग फ्रीक्वेंसी',
      healingDesc: 'चक्र उपचार और ऊर्जा संतुलन के लिए 432Hz, 528Hz और अन्य सोल्फेगियो फ्रीक्वेंसी',
      meditationTitle: 'ध्यान संगीत',
      meditationDesc: 'गहरे ध्यान के लिए प्राकृतिक ध्वनियों, सिंगिंग बाउल और बाइनॉरल बीट्स के साथ परिवेश संगीत',
      mantrasTitle: 'पवित्र मंत्र',
      mantrasDesc: 'प्रामाणिक उच्चारण के साथ ओम जाप, गायत्री मंत्र और अन्य वैदिक मंत्र',
      yogaTitle: 'योग संगीत',
      yogaDesc: 'योग अभ्यास, प्राणायाम और विश्राम के लिए कोमल वाद्य संगीत',
      customTitle: 'कस्टम रचनाएँ',
      customDesc: 'आपको किसी भी आध्यात्मिक या हीलिंग संगीत की आवश्यकता बताएं और AI इसे बनाने दें',
      howItWorksTitle: 'यह कैसे काम करता है',
      step1Title: 'AI को बताएं कि आपको क्या चाहिए',
      step1Desc: 'आवाज या टेक्स्ट का उपयोग करके वर्णन करें कि आप क्या संगीत चाहते हैं - भजन, मंत्र, ध्यान ट्रैक या हीलिंग फ्रीक्वेंसी',
      step2Title: 'AI आपका संगीत बनाता है',
      step2Desc: 'हमारा उन्नत AI सेकंडों में आपके अनुरोध के आधार पर मूल संगीत बनाता है',
      step3Title: 'सुनें और सुधारें',
      step3Desc: 'जनित संगीत सुनें और जब तक यह सही न हो, बदलाव का अनुरोध करें',
      step4Title: 'डाउनलोड करें और शेयर करें',
      step4Desc: 'अपने कस्टम आध्यात्मिक संगीत को डाउनलोड करें और इसे ध्यान, योग या दूसरों के साथ साझा करने के लिए उपयोग करें',
      ctaText: 'अपना आध्यात्मिक साउंडट्रैक बनाने के लिए तैयार हैं?',
      ctaButton: 'निःशुल्क शुरू करें',
    },
`;

// Find the last closing brace before hi section
const beforeHi = content.substring(0, hiSectionIndex);
const lastBraceIndex = beforeHi.lastIndexOf('\n  },\n');

if (lastBraceIndex === -1) {
    console.error('Could not find insertion point');
    process.exit(1);
}

// Insert English music translations
let newContent = content.substring(0, lastBraceIndex + 6) + musicTranslationsEN + content.substring(lastBraceIndex + 6);

// Now find Hindi section to insert Hindi translations
const hiSectionStart = newContent.indexOf('\n  hi: {');
const afterHiStart = newContent.substring(hiSectionStart + 9);
const hiLastBraceIndex = afterHiStart.lastIndexOf('\n  },\n');

if (hiLastBraceIndex === -1) {
    console.error('Could not find Hindi insertion point');
    process.exit(1);
}

const insertPoint = hiSectionStart + 9 + hiLastBraceIndex + 6;
newContent = newContent.substring(0, insertPoint) + musicTranslationsHI + newContent.substring(insertPoint);

// Write back
fs.writeFileSync(translationsPath, newContent, 'utf8');
console.log('✅ Music translations added successfully!');
