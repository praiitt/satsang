import Link from 'next/link';
import { Button } from '@/components/livekit/button';
import { PushNotificationButton } from '@/components/push-notification-button';
import { HeygenVideoPlayer } from '@/components/heygen/heygen-video-player';

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

        <h1 className="text-foreground mt-4 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
          RRAASI सत्संग में आपका स्वागत है
        </h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-prose text-sm leading-6 sm:text-base md:text-lg">
          यह सत्संग सुविधा RRAASI द्वारा प्रस्तुत है—जहाँ आप हिन्दी में अपने आध्यात्मिक मार्गदर्शन
          के लिए जुड़ सकते हैं, प्रश्न पूछ सकते हैं और समूह के साथ आध्यात्मिक चर्चा कर सकते हैं।
        </p>

        {/* Action Buttons - Prominently displayed */}
        <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={onStartCall}
            className="h-12 w-full text-base font-semibold shadow-lg sm:w-auto sm:min-w-[200px]"
          >
            {startButtonText}
          </Button>
        </div>

        {/* Push Notification Button */}
        <div className="mt-4">
          <PushNotificationButton className="h-10 text-sm" />
        </div>
      </section>

      {/* Product Description Video - Full Width */}
      <section className="mt-8 w-full sm:mt-12">
        <div className="bg-background border-input w-full rounded-2xl border p-4 sm:p-6">
          <h2 className="text-foreground mb-4 text-center text-xl font-bold sm:text-2xl">
            सत्संग क्या है? (What is Satsang?)
          </h2>
          <HeygenVideoPlayer
            videoId="2d4bdf6e4d2c41dc9a4b8a8670f82911"
            title="सत्संग उत्पाद विवरण (Satsang Product Description)"
            className="w-full"
          />
        </div>
      </section>

      {/* Highlights */}
      <section className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-4 px-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-background border-input rounded-2xl border p-5 text-left">
          <h3 className="text-foreground mb-2 text-lg font-semibold">सरल जुड़ाव</h3>
          <p className="text-muted-foreground text-sm leading-6">
            सिर्फ एक क्लिक में सत्संग शुरू करें। कोई जटिल सेटअप नहीं—ब्राउज़र से सीधे जुड़ें।
          </p>
        </div>
        <div className="bg-background border-input rounded-2xl border p-5 text-left">
          <h3 className="text-foreground mb-2 text-lg font-semibold">लाइव संवाद</h3>
          <p className="text-muted-foreground text-sm leading-6">
            गुरुजी और समुदाय के साथ लाइव सत्संग, प्रश्नोत्तर और मार्गदर्शन—सब एक ही स्थान पर।
          </p>
        </div>
        <div className="bg-background border-input rounded-2xl border p-5 text-left">
          <h3 className="text-foreground mb-2 text-lg font-semibold">हिन्दी में मार्गदर्शन</h3>
          <p className="text-muted-foreground text-sm leading-6">
            सारे निर्देश और वार्तालाप हिन्दी में—ताकि समझना और जुड़ना आसान रहे।
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto mt-8 max-w-5xl px-4 sm:mt-10">
        <div className="bg-background border-input rounded-2xl border p-6 text-left">
          <h2 className="text-foreground mb-3 text-2xl font-bold">कैसे जुड़ें</h2>
          <ol className="text-muted-foreground list-decimal space-y-2 pl-6 text-sm leading-6">
            <li>अपने मोबाइल नंबर से लॉगिन/सत्यापन करें (तेज़ और सुरक्षित)।</li>
            <li>ब्राउज़र से माइक/स्पीकर की अनुमति दें—बेहतर ऑडियो के लिए।</li>
            <li>“सत्संग शुरू करें” पर क्लिक करें या “लाइव सत्संग जॉइन करें” से समूह में जुड़ें।</li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href="/livesatsang">समय सारिणी देखें</Link>
            </Button>
            <Button asChild variant="link">
              <Link href="#faq">अक्सर पूछे जाने वाले प्रश्न</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Brand note */}
      <section className="mx-auto mt-6 max-w-5xl px-4 sm:mt-8">
        <div className="bg-background border-input rounded-2xl border p-6 text-left">
          <h2 className="text-foreground mb-2 text-xl font-semibold">RRAASI द्वारा प्रस्तुत</h2>
          <p className="text-muted-foreground text-sm leading-6">
            RRAASI सत्संग का उद्देश्य तकनीक के माध्यम से आध्यात्मिक अनुभव को सहज बनाना है—ताकि हर
            साधक आसानी से जुड़ सके और लाभान्वित हो।
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto my-8 max-w-5xl px-4 pb-8 sm:my-10 sm:pb-10">
        <h2 className="text-foreground mb-4 text-2xl font-bold">अक्सर पूछे जाने वाले प्रश्न</h2>
        <div className="space-y-3">
          <details className="bg-background border-input rounded-xl border p-4">
            <summary className="text-foreground cursor-pointer text-left font-medium">
              यह सुविधा किसने विकसित की है?
            </summary>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              यह सुविधा RRAASI द्वारा विकसित और प्रस्तुत की गई है, ताकि साधकों को सहज और सुरक्षित
              अनुभव मिले।
            </p>
          </details>
          <details className="bg-background border-input rounded-xl border p-4">
            <summary className="text-foreground cursor-pointer text-left font-medium">
              लाइव सत्संग कैसे जॉइन करें?
            </summary>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              ऊपर दिए गए “लाइव सत्संग जॉइन करें” पर क्लिक करें। समय सारिणी के अनुसार सत्र उपलब्ध
              होने पर जुड़ सकते हैं।
            </p>
          </details>
          <details className="bg-background border-input rounded-xl border p-4">
            <summary className="text-foreground cursor-pointer text-left font-medium">
              माइक/स्पीकर काम नहीं कर रहा?
            </summary>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              ब्राउज़र सेटिंग्स में साइट को माइक/स्पीकर की अनुमति दें और पेज को रीफ़्रेश करें।
            </p>
          </details>
        </div>
      </section>
    </div>
  );
};
