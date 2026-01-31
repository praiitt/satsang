'use client';

import { Canvas } from '@react-three/fiber';
import { XR, VRButton, Controllers, Hands } from '@react-three/xr';
import { WorldManager } from './WorldManager';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
    return (
        <div role="alert" className="flex flex-col items-center justify-center h-full bg-black text-white p-8 text-center scroll-mt-20">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Connection to the Universe Lost</h2>
            <p className="text-gray-300 mb-6 max-w-md">{error.message}</p>
            <button
                onClick={resetErrorBoundary}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-500 rounded-full font-bold transition-colors"
            >
                Reconnect
            </button>
        </div>
    );
}

import { useContextBridge } from '@react-three/drei';
import { AuthContext } from '../auth/auth-provider';
import { LanguageContext } from '../../contexts/language-context';

export default function VRScene() {
    const ContextBridge = useContextBridge(AuthContext, LanguageContext);

    return (
        <>
            <VRButton className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white font-bold hover:bg-white/20 transition-all cursor-pointer" />
            <div className="w-full h-screen bg-black">
                <ErrorBoundary FallbackComponent={ErrorFallback}>
                    <Canvas>
                        <ContextBridge>
                            <XR>
                                <Controllers />
                                <Hands />
                                <Suspense fallback={null}>
                                    <WorldManager />
                                </Suspense>
                            </XR>
                        </ContextBridge>
                    </Canvas>
                </ErrorBoundary>
            </div>
        </>
    );
}
