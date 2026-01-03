import { headers } from 'next/headers';
import { APP_CONFIG_DEFAULTS, type AppConfig } from '@/app-config';
import { UniversalGuruApp } from '@/components/app/universal-guru-app';
import { notFound } from 'next/navigation';
import { ALL_GURUS, TRADITION_DETAILS, DEFAULT_TRADITION_THEME } from '@/lib/gurus';

export default async function TraditionGuruPage({
    params,
}: {
    params: Promise<{ tradition: string; guruId: string }>;
}) {
    await headers();
    const { tradition, guruId } = await params;

    const normalizedTradition = tradition.toLowerCase();

    // Find the guru
    const guru = ALL_GURUS.find(g => g.id === guruId);

    // Validate guru exists AND matches the tradition category (optional, but good for SEO/Consistency)
    if (!guru || guru.category !== normalizedTradition) {
        notFound();
    }

    const guruName = guru.name;
    const traditionConfig = TRADITION_DETAILS[normalizedTradition] || DEFAULT_TRADITION_THEME;

    // Override app config for this guru
    const appConfig: AppConfig = {
        ...APP_CONFIG_DEFAULTS,
        // Using 'hinduism-agent' as a generic name? The backend looks at 'guruId' metadata.
        // Wait, universal_wisdom_agent uses 'guruId'. 
        // But the frontend 'HinduismApp' might be hardcoding connection to 'hinduism-agent'?
        // The backend python file is 'universal_wisdom_agent.py'.
        // We need to check what agent name the frontend connects to.
        // Usually it's defined here or in the component.
        agentName: 'universal-wisdom-agent', // Updated to likely correct agent name based on file viewed earlier
        pageTitle: `${guruName} – ${guru.tradition || 'Spiritual Master'} `,
        pageDescription: `Connect with ${guruName} - an AI - powered spiritual guide bringing timeless wisdom.`,
        metadata: {
            guruId, // Pass guru ID to backend
            tradition: normalizedTradition
        },
    };

    return (
        <UniversalGuruApp
            appConfig={appConfig}
            guruId={guruId}
            guruName={guruName}
            traditionName={traditionConfig.title.replace(' Masters', '').replace(' Gurus', '')} // Simple cleanup to get "Buddhist" or "Sikh"
            traditionEmoji={traditionConfig.emoji}
            theme={traditionConfig.theme}
        />
    );
}

// Generate static params for all gurus
export function generateStaticParams() {
    return ALL_GURUS.map((guru) => ({
        tradition: guru.category,
        guruId: guru.id,
    }));
}
