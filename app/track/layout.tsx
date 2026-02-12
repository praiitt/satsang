import { FloatingPlayer } from '@/components/rraasi-music/floating-player';

export default function SunoLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {children}
            <FloatingPlayer />
        </>
    );
}
