'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { useUserData } from '@/components/providers/user-data-provider';
import { GURUS, type GuruDefinition } from '@/lib/gurus';
import { GuruCard } from './guru-card';
import { useRouter } from 'next/navigation';

export function MySpiritualCircle() {
    const { t } = useLanguage();
    const { favoriteGurus, followingGurus, loading } = useUserData();
    const router = useRouter();

    const handleGuruClick = (guru: GuruDefinition) => {
        router.push(guru.route);
    };

    const myGurus = useMemo(() => {
        const allIds = new Set([...favoriteGurus, ...followingGurus]);
        return GURUS.filter(guru => allIds.has(guru.id));
    }, [favoriteGurus, followingGurus]);

    if (loading || myGurus.length === 0) {
        return null;
    }

    return (
        <section className="mx-auto mt-12 max-w-7xl px-4 sm:mt-16">
            <div className="mb-8 text-center">
                <h2 className="text-foreground mb-3 text-3xl font-bold sm:text-4xl text-amber-500">
                    My Spiritual Circle
                </h2>
                <p className="text-muted-foreground mx-auto max-w-2xl text-base leading-7 sm:text-lg">
                    Your favorite and followed guides, always close to your heart.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {myGurus.map((guru) => (
                    <GuruCard
                        key={guru.id}
                        guru={guru}
                        onClick={() => handleGuruClick(guru)}
                    />
                ))}
            </div>
        </section>
    );
}
