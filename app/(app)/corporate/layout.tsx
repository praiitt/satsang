'use client';

import { CorporateAuthProvider } from '@/contexts/corporate-auth-context';

export default function CorporateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <CorporateAuthProvider>
            {children}
        </CorporateAuthProvider>
    );
}
