import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/livekit/button';

function WelcomeImage() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-fg0 mb-4 size-16"
    >
      <path
        d="M15 24V40C15 40.7957 14.6839 41.5587 14.1213 42.1213C13.5587 42.6839 12.7956 43 12 43C11.2044 43 10.4413 42.6839 9.87868 42.1213C9.31607 41.5587 9 40.7957 9 40V24C9 23.2044 9.31607 22.4413 9.87868 21.8787C10.4413 21.3161 11.2044 21 12 21C12.7956 21 13.5587 21.3161 14.1213 21.8787C14.6839 22.4413 15 23.2044 15 24ZM22 5C21.2044 5 20.4413 5.31607 19.8787 5.87868C19.3161 6.44129 19 7.20435 19 8V56C19 56.7957 19.3161 57.5587 19.8787 58.1213C20.4413 58.6839 21.2044 59 22 59C22.7956 59 23.5587 58.6839 24.1213 58.1213C24.6839 57.5587 25 56.7957 25 56V8C25 7.20435 24.6839 6.44129 24.1213 5.87868C23.5587 5.31607 22.7956 5 22 5ZM32 13C31.2044 13 30.4413 13.3161 29.8787 13.8787C29.3161 14.4413 29 15.2044 29 16V48C29 48.7957 29.3161 49.5587 29.8787 50.1213C30.4413 50.6839 31.2044 51 32 51C32.7956 51 33.5587 50.6839 34.1213 50.1213C34.6839 49.5587 35 48.7957 35 48V16C35 15.2044 34.6839 14.4413 34.1213 13.8787C33.5587 13.3161 32.7956 13 32 13ZM42 21C41.2043 21 40.4413 21.3161 39.8787 21.8787C39.3161 22.4413 39 23.2044 39 24V40C39 40.7957 39.3161 41.5587 39.8787 42.1213C40.4413 42.6839 41.2043 43 42 43C42.7957 43 43.5587 42.6839 44.1213 42.1213C44.6839 41.5587 45 40.7957 45 40V24C45 23.2044 44.6839 22.4413 44.1213 21.8787C43.5587 21.3161 42.7957 21 42 21ZM52 17C51.2043 17 50.4413 17.3161 49.8787 17.8787C49.3161 18.4413 49 19.2044 49 20V44C49 44.7957 49.3161 45.5587 49.8787 46.1213C50.4413 46.6839 51.2043 47 52 47C52.7957 47 53.5587 46.6839 54.1213 46.1213C54.6839 45.5587 55 44.7957 55 44V20C55 19.2044 54.6839 18.4413 54.1213 17.8787C53.5587 17.3161 52.7957 17 52 17Z"
        fill="currentColor"
      />
    </svg>
  );
}

function VideoSection() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Ensure autoplay works by reloading iframe if needed
    const iframe = iframeRef.current;
    if (iframe) {
      // Try to trigger autoplay after a short delay
      const timer = setTimeout(() => {
        try {
          // Some browsers require user interaction first, but we can try
          if (iframe.contentWindow) {
            // The iframe src already has autoplay=1&muted=1
            // If it still doesn't work, it might be a browser policy issue
          }
        } catch (e) {
          // Cross-origin restrictions might prevent this
          console.log('Cannot access iframe content:', e);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <section id="product-video" className="mt-6 w-full max-w-5xl sm:mt-8">
      <div className="w-full py-4">
        <h2 className="text-foreground mx-auto mb-3 px-4 text-center text-lg font-bold sm:px-6 sm:text-xl">
          RRAASI सत्संग
        </h2>
        <div
          className="relative w-full overflow-hidden rounded-lg"
          style={{
            paddingBottom: '56.25%',
            backgroundColor: 'var(--background)',
          }}
        >
          <iframe
            ref={iframeRef}
            width="560"
            height="315"
            src="https://app.heygen.com/embedded-player/2d4bdf6e4d2c41dc9a4b8a8670f82911?autoplay=1&muted=1&loop=1&playsinline=1"
            title="HeyGen वीडियो प्लेयर"
            frameBorder="0"
            allow="encrypted-media; fullscreen; autoplay; picture-in-picture;"
            allowFullScreen
            className="absolute top-0 left-0 h-full w-full"
            style={{
              border: 'none',
              backgroundColor: 'transparent',
            }}
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
}

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
}

export const WelcomeView = ({
  startButtonText,
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  return (
    <div ref={ref} className="w-full pb-24 md:pb-32">
      {/* Hero Section - Always visible at top */}
      <section className="bg-background flex min-h-[70vh] flex-col items-center justify-center px-4 py-8 text-center sm:min-h-[80vh] md:min-h-screen md:py-12">
        <WelcomeImage />

        <h1 className="text-foreground mt-4 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
          आपका आध्यात्मिक गुरु अब आपके साथ है
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base leading-7 sm:text-lg md:text-xl">
          RRAASI सत्संग - एक AI-संचालित आध्यात्मिक सहायक जो हिन्दी में आपसे बात करता है, प्रश्नों के
          उत्तर देता है, भजन चलाता है, और गुरुओं के प्रवचन सुनाता है। बस बोलिए और आनंद लीजिए!
        </p>

        {/* Product Description Video - Full Width */}
        <VideoSection />

        {/* Action Buttons - Prominently displayed */}
        <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={onStartCall}
            className="h-14 w-full text-lg font-semibold shadow-lg sm:w-auto sm:min-w-[240px]"
          >
            {startButtonText}
          </Button>
        </div>
        <p className="text-muted-foreground mt-3 text-sm">
          🎁 15 मिनट का निःशुल्क परीक्षण - कोई क्रेडिट कार्ड की आवश्यकता नहीं
        </p>
      </section>

      {/* Key Features Section */}
      <section className="mx-auto mt-12 max-w-6xl px-4 sm:mt-16">
        <h2 className="text-foreground mb-8 text-center text-3xl font-bold sm:text-4xl">
          मुख्य विशेषताएं
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Feature 1: Voice AI Assistant */}
          <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 text-3xl">🎤</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">आवाज़-आधारित AI सहायक</h3>
            <p className="text-muted-foreground text-sm leading-6">
              हिन्दी में बोलकर अपने आध्यात्मिक गुरु से बातचीत करें। वास्तविक समय में प्रश्न पूछें, 
              मार्गदर्शन प्राप्त करें, और गहन आध्यात्मिक चर्चा करें।
            </p>
          </div>

          {/* Feature 2: Hindi Language Support */}
          <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 text-3xl">🇮🇳</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">पूर्ण हिन्दी समर्थन</h3>
            <p className="text-muted-foreground text-sm leading-6">
              भाषण-से-पाठ, AI प्रसंस्करण, और पाठ-से-भाषण - सभी हिन्दी में। 
              बोलिए हिन्दी में, सुनिए हिन्दी में, समझिए हिन्दी में।
            </p>
          </div>

          {/* Feature 3: Bhajan Playback */}
          <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 text-3xl">🎵</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">भजन चलाएं</h3>
            <p className="text-muted-foreground text-sm leading-6">
              बस कहिए “कृष्ण का भजन सुनाओ” या “हरे कृष्ण सुनाओ” - AI तुरंत YouTube से 
              भजन खोजकर चला देगा। हजारों भजन आपकी आवाज़ के एक आदेश पर।
            </p>
          </div>

          {/* Feature 4: Vani/Pravachan Playback */}
          <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 text-3xl">📿</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">प्रवचन और वाणी</h3>
            <p className="text-muted-foreground text-sm leading-6">
              किसी विषय पर प्रवचन सुनना चाहते हैं? बस कहिए “भक्ति पर प्रवचन सुनाओ” या 
              “सद्गुरु का प्रवचन सुनाओ” - AI तुरंत उपयुक्त प्रवचन खोजकर चला देगा।
            </p>
          </div>

          {/* Feature 5: Spiritual Guidance */}
          <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 text-3xl">🕉️</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">आध्यात्मिक मार्गदर्शन</h3>
            <p className="text-muted-foreground text-sm leading-6">
              धर्म, योग, ध्यान, कर्म, भक्ति, वेदांत - किसी भी आध्यात्मिक विषय पर प्रश्न पूछें। 
              गीता, वेद, उपनिषद, रामायण, महाभारत से उत्तर प्राप्त करें।
            </p>
          </div>

          {/* Feature 6: Easy Setup */}
          <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 text-3xl">✨</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">सरल और तेज़</h3>
            <p className="text-muted-foreground text-sm leading-6">
              कोई ऐप इंस्टॉल करने की आवश्यकता नहीं। बस ब्राउज़र खोलिए, माइक की अनुमति दीजिए, 
              और शुरू करें। सेकंडों में अपने आध्यात्मिक गुरु से जुड़ें।
            </p>
          </div>
        </div>
      </section>

      {/* CTA: After Features */}
      <section className="mx-auto mt-6 max-w-4xl px-4">
        <div className="bg-background border-input flex flex-col items-center gap-3 rounded-2xl border p-6 text-center shadow-sm sm:flex-row sm:justify-between">
          <p className="text-foreground text-base font-medium sm:text-left">
            तैयार हैं? अभी अपने AI गुरु से बातचीत शुरू करें।
          </p>
          <div className="flex gap-3">
            <Button onClick={onStartCall} variant="primary" size="lg" className="h-12">
              सत्संग शुरू करें
            </Button>
            <Button asChild variant="secondary" className="h-12">
              <a href="#product-video">डेमो देखें</a>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="mx-auto mt-12 max-w-4xl px-4 sm:mt-16">
        <h2 className="text-foreground mb-8 text-center text-3xl font-bold sm:text-4xl">
          यह कैसे काम करता है?
        </h2>
        <div className="bg-background border-input rounded-2xl border p-8 shadow-sm">
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold">
                1
              </div>
              <div>
                <h3 className="text-foreground mb-2 text-lg font-semibold">लॉगिन करें</h3>
                <p className="text-muted-foreground text-sm leading-6">
                  अपने मोबाइल नंबर से त्वरित और सुरक्षित लॉगिन/सत्यापन करें। कोई जटिल प्रक्रिया नहीं।
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold">
                2
              </div>
              <div>
                <h3 className="text-foreground mb-2 text-lg font-semibold">माइक की अनुमति दें</h3>
                <p className="text-muted-foreground text-sm leading-6">
                  ब्राउज़र से माइक और स्पीकर की अनुमति दें। यह केवल एक बार करना होता है।
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold">
                3
              </div>
              <div>
                <h3 className="text-foreground mb-2 text-lg font-semibold">बातचीत शुरू करें</h3>
                <p className="text-muted-foreground text-sm leading-6">
                  “गुरुजी से बातचीत” बटन पर क्लिक करें और हिन्दी में बोलना शुरू करें। 
                  प्रश्न पूछें, भजन सुनने को कहें, या प्रवचन सुनने को कहें।
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold">
                4
              </div>
              <div>
                <h3 className="text-foreground mb-2 text-lg font-semibold">आनंद लें</h3>
                <p className="text-muted-foreground text-sm leading-6">
                  AI गुरु आपकी बात सुनता है, समझता है, और उचित उत्तर देता है। 
                  भजन और प्रवचन का आनंद लें, और अपनी आध्यात्मिक यात्रा में आगे बढ़ें।
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="link">
              <Link href="#faq">अक्सर पूछे जाने वाले प्रश्न</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="mx-auto mt-12 max-w-6xl px-4 sm:mt-16">
        <h2 className="text-foreground mb-8 text-center text-3xl font-bold sm:text-4xl">
          आप क्या कर सकते हैं?
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-background border-input rounded-xl border p-5 text-center">
            <div className="mb-2 text-2xl">💬</div>
            <p className="text-muted-foreground text-sm">
              आध्यात्मिक प्रश्नों के उत्तर प्राप्त करें
            </p>
          </div>
          <div className="bg-background border-input rounded-xl border p-5 text-center">
            <div className="mb-2 text-2xl">🎵</div>
            <p className="text-muted-foreground text-sm">
              अपने पसंदीदा भजन सुनें
            </p>
          </div>
          <div className="bg-background border-input rounded-xl border p-5 text-center">
            <div className="mb-2 text-2xl">📚</div>
            <p className="text-muted-foreground text-sm">
              गुरुओं के प्रवचन सुनें
            </p>
          </div>
          <div className="bg-background border-input rounded-xl border p-5 text-center">
            <div className="mb-2 text-2xl">🧘</div>
            <p className="text-muted-foreground text-sm">
              ध्यान और योग के बारे में जानें
            </p>
          </div>
        </div>
      </section>

      {/* CTA: After Use Cases */}
      <section className="mx-auto mt-8 max-w-4xl px-4">
        <div className="bg-primary text-primary-foreground flex flex-col items-center gap-3 rounded-2xl p-6 text-center shadow-sm sm:flex-row sm:justify-between">
          <p className="text-base font-semibold sm:text-left">
            बस एक क्लिक दूर — गुरुजी से बातचीत शुरू करें।
          </p>
          <div className="flex gap-3">
            <Button
              onClick={onStartCall}
              variant="ghost"
              className="h-12 bg-white/10 hover:bg-white/20"
            >
              अभी शुरू करें
            </Button>
            <Button asChild variant="ghost" className="h-12 bg-white/10 hover:bg-white/20">
              <a href="#faq">FAQ देखें</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="mx-auto mt-12 max-w-4xl px-4 sm:mt-16">
        <div className="bg-background border-input rounded-2xl border p-8 text-center shadow-sm">
          <h2 className="text-foreground mb-4 text-2xl font-bold sm:text-3xl">
            आधुनिक तकनीक, पारंपरिक ज्ञान
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-sm leading-7 sm:text-base">
            RRAASI सत्संग AI और आधुनिक तकनीक का उपयोग करता है ताकि हर साधक को आध्यात्मिक ज्ञान 
            तक आसान पहुंच मिल सके। हमारा उद्देश्य है कि तकनीक के माध्यम से आध्यात्मिक अनुभव को 
            सहज, सुलभ और सार्थक बनाया जाए।
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
            <div className="bg-muted text-muted-foreground rounded-lg px-4 py-2">🤖 AI-संचालित</div>
            <div className="bg-muted text-muted-foreground rounded-lg px-4 py-2">🎯 वास्तविक समय</div>
            <div className="bg-muted text-muted-foreground rounded-lg px-4 py-2">🔒 सुरक्षित</div>
            <div className="bg-muted text-muted-foreground rounded-lg px-4 py-2">🌐 ब्राउज़र-आधारित</div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto my-12 max-w-4xl px-4 pb-8 sm:my-16 sm:pb-10">
        <h2 className="text-foreground mb-8 text-center text-3xl font-bold sm:text-4xl">
          अक्सर पूछे जाने वाले प्रश्न
        </h2>
        <div className="space-y-4">
          <details className="bg-background border-input rounded-xl border p-5 shadow-sm">
            <summary className="hover:text-primary cursor-pointer text-left font-semibold">यह सुविधा क्या है और यह कैसे काम करती है?</summary>
            <p className="text-muted-foreground mt-3 text-sm leading-7">RRAASI सत्संग एक AI-संचालित आध्यात्मिक सहायक है जो आपसे हिन्दी में बात करता है। आप आवाज़ के माध्यम से प्रश्न पूछ सकते हैं, भजन सुनने को कह सकते हैं, या प्रवचन सुनने को कह सकते हैं। AI आपकी बात समझता है और उचित उत्तर देता है या मांगी गई सामग्री चलाता है।</p>
          </details>
          <details className="bg-background border-input rounded-xl border p-5 shadow-sm">
            <summary className="hover:text-primary cursor-pointer text-left font-semibold">क्या मुझे कोई ऐप डाउनलोड करना होगा?</summary>
            <p className="text-muted-foreground mt-3 text-sm leading-7">नहीं! RRAASI सत्संग पूर्णतः ब्राउज़र-आधारित है। आपको केवल अपने ब्राउज़र में वेबसाइट खोलनी है, माइक की अनुमति देनी है, और शुरू करना है। कोई ऐप इंस्टॉल करने की आवश्यकता नहीं है।</p>
          </details>
          <details className="bg-background border-input rounded-xl border p-5 shadow-sm">
            <summary className="hover:text-primary cursor-pointer text-left font-semibold">मैं कौन से भजन सुन सकता हूं?</summary>
            <p className="text-muted-foreground mt-3 text-sm leading-7">आप किसी भजन का नाम बोलकर सुन सकते हैं। उदाहरण के लिए, ‘कृष्ण का भजन सुनाओ’, ‘हरे कृष्ण सुनाओ’, ‘ओम नमः शिवाय सुनाओ’, आदि। AI YouTube से उपयुक्त भजन खोजकर तुरंत चला देगा।</p>
          </details>
          <details className="bg-background border-input rounded-xl border p-5 shadow-sm">
            <summary className="hover:text-primary cursor-pointer text-left font-semibold">क्या मैं प्रवचन या वाणी सुन सकता हूं?</summary>
            <p className="text-muted-foreground mt-3 text-sm leading-7">हाँ! आप किसी विषय पर प्रवचन सुनने के लिए कह सकते हैं। उदाहरण के लिए, ‘भक्ति पर प्रवचन सुनाओ’, ‘सद्गुरु का प्रवचन सुनाओ’, ‘ओशो की वाणी सुनाओ’, आदि। AI उपयुक्त प्रवचन खोजकर चला देगा।</p>
          </details>
          <details className="bg-background border-input rounded-xl border p-5 shadow-sm">
            <summary className="hover:text-primary cursor-pointer text-left font-semibold">माइक/स्पीकर काम नहीं कर रहा है - क्या करूं?</summary>
            <p className="text-muted-foreground mt-3 text-sm leading-7">सुनिश्चित करें कि आपने ब्राउज़र को माइक और स्पीकर की अनुमति दी है। ब्राउज़र सेटिंग्स में जाकर इस साइट के लिए माइक/स्पीकर की अनुमति चेक करें। यदि समस्या बनी रहे, तो पेज को रीफ़्रेश करें और फिर से अनुमति दें।</p>
          </details>
          <details className="bg-background border-input rounded-xl border p-5 shadow-sm">
            <summary className="hover:text-primary cursor-pointer text-left font-semibold">क्या यह सेवा निःशुल्क है?</summary>
            <p className="text-muted-foreground mt-3 text-sm leading-7">हाँ, हम 15 मिनट का निःशुल्क परीक्षण प्रदान करते हैं जिसमें कोई क्रेडिट कार्ड की आवश्यकता नहीं है। इसके बाद, सेवा का उपयोग जारी रखने के लिए सदस्यता लेने की आवश्यकता हो सकती है।</p>
          </details>
          <details className="bg-background border-input rounded-xl border p-5 shadow-sm">
            <summary className="hover:text-primary cursor-pointer text-left font-semibold">क्या मैं अंग्रेजी में बात कर सकता हूं?</summary>
            <p className="text-muted-foreground mt-3 text-sm leading-7">RRAASI सत्संग मुख्य रूप से हिन्दी भाषा के लिए डिज़ाइन किया गया है, लेकिन AI कई भाषाओं को समझ सकता है। हालाँकि, सर्वोत्तम अनुभव के लिए हिन्दी में बात करने की सलाह दी जाती है।</p>
          </details>
          <details className="bg-background border-input rounded-xl border p-5 shadow-sm">
            <summary className="hover:text-primary cursor-pointer text-left font-semibold">यह सुविधा किसने विकसित की है?</summary>
            <p className="text-muted-foreground mt-3 text-sm leading-7">यह सुविधा RRAASI द्वारा विकसित और प्रस्तुत की गई है। हमारा उद्देश्य तकनीक के माध्यम से आध्यात्मिक अनुभव को सहज, सुलभ और सार्थक बनाना है, ताकि हर साधक आसानी से जुड़ सके और लाभान्वित हो।</p>
          </details>
        </div>
      </section>
    </div>
  );
};
