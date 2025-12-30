import { PrivateSatsangApp } from '@/components/daily-satsang/private-satsang-app';
import { GURU_DISPLAY_NAMES } from '@/app/(app)/hinduism/[guruId]/page';
import { notFound } from 'next/navigation';

export default async function PrivateSatsangPage({
    params,
}: {
    params: Promise<{ guruId: string }>;
}) {
    const { guruId } = await params;
    const guruName = GURU_DISPLAY_NAMES[guruId];

    if (!guruName) {
        notFound();
    }

    return <PrivateSatsangApp guruId={guruId} guruName={guruName} />;
}
