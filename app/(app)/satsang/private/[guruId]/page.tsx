import { PrivateSatsangApp } from '@/components/daily-satsang/private-satsang-app';
import { ALL_GURUS } from '@/lib/gurus';
import { notFound } from 'next/navigation';

export default async function PrivateSatsangPage({
    params,
}: {
    params: Promise<{ guruId: string }>;
}) {
    const { guruId } = await params;
    const guru = ALL_GURUS.find(g => g.id === guruId);
    const guruName = guru?.name;

    if (!guruName) {
        notFound();
    }

    return <PrivateSatsangApp guruId={guruId} guruName={guruName} />;
}
