import { Metadata } from 'next';
import { ArtShopView } from '@/components/gallery/art-shop-view';
import { AuthProvider } from '@/components/auth/auth-provider';

export const metadata: Metadata = {
    title: 'RRAASI Art Shop | Buy AI Images & Videos',
    description: 'Browse, preview, and purchase copyright rights to public AI-generated art created on the RRAASI platform.',
};

export default function GalleryPage() {
    return (
        <AuthProvider>
            <main className="min-h-screen bg-[#0A0A0A] text-white">
                {/* Header spacing to account for ServiceNav if it's sticky */}
                <div className="h-20" />
                <ArtShopView />
            </main>
        </AuthProvider>
    );
}
