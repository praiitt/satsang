'use client';

import React, { useState, useEffect } from 'react';
import { X, Lock, Download, Film, Image as ImageIcon, Coins, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/auth-provider';
import { getFirebaseAuth } from '@/lib/firebase-client';

export interface ArtItem {
    id: string;
    type: 'image' | 'video';
    url: string;
    trackId: string;
    trackTitle: string;
    prompt: string;
    ownerId: string;
    createdAt: string;
}

interface ArtPurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: ArtItem | null;
    onShowBuyCoins?: () => void;
}

export function ArtPurchaseModal({ isOpen, onClose, item, onShowBuyCoins }: ArtPurchaseModalProps) {
    const { user } = useAuth();
    
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Reset state when item changes
    useEffect(() => {
        if (isOpen) {
            setError(null);
            setSuccess(false);
            setDownloading(false);
            setIsPurchasing(false);
        }
    }, [isOpen, item]);

    if (!isOpen || !item) return null;

    const isOwner = user?.uid === item.ownerId;
    const isVideo = item.type === 'video';
    const cost = isVideo ? 25 : 5;

    const handlePurchaseAndDownload = async () => {
        if (!user) {
            setError('Please login to purchase art.');
            return;
        }

        try {
            setError(null);
            setIsPurchasing(true);

            const auth = getFirebaseAuth();
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
                setError('Please sign in to download');
                return;
            }

            // Step 1: Call secure proxy (it handles coin deduction atomically)
            setDownloading(true);

            const res = await fetch('/api/rraasi-music/download-art', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ 
                    contentUrl: item.url, 
                    trackId: item.trackId, 
                    type: item.type 
                }),
            });

            if (res.status === 402) {
                setError('Not enough coins!');
                onShowBuyCoins?.();
                return;
            }

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to download file');
            }

            setSuccess(true); // Show success immediately after download starts

            // Create blob and download
            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            
            // Clean up filename
            const ext = isVideo ? 'mp4' : 'jpg';
            const cleanTitle = item.trackTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
            a.download = `RRAASI_Art_${cleanTitle}_${Date.now()}.${ext}`;
            
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);

        } catch (err: any) {
            console.error('Download error:', err);
            setError(err.message || 'An unexpected error occurred.');
            setSuccess(false);
        } finally {
            setIsPurchasing(false);
            setDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Left Side: Media Preview */}
                <div className="relative flex-1 bg-black/50 min-h-[300px] md:min-h-full flex items-center justify-center p-4">
                    {isVideo ? (
                        <video 
                            src={item.url} 
                            controls 
                            autoPlay 
                            loop 
                            muted
                            className="max-w-full max-h-[50vh] md:max-h-[80vh] rounded-lg object-contain"
                        />
                    ) : (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <img 
                                src={item.url} 
                                alt={item.trackTitle} 
                                className="max-w-full max-h-[50vh] md:max-h-[80vh] rounded-lg object-contain"
                            />
                            {/* Watermark Overlay for Images */}
                            {!isOwner && !success && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                                    <div className="text-white text-5xl md:text-8xl font-black tracking-widest rotate-[-30deg] uppercase drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                                        RRAASI
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Badge */}
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-1.5 text-xs font-semibold text-white/90 border border-white/10">
                        {isVideo ? <Film className="w-3.5 h-3.5 text-purple-400" /> : <ImageIcon className="w-3.5 h-3.5 text-blue-400" />}
                        {isVideo ? 'AI Video' : 'AI Image'}
                    </div>
                </div>

                {/* Right Side: Details & Purchase */}
                <div className="w-full md:w-80 lg:w-96 p-6 flex flex-col bg-zinc-900 border-l border-zinc-800 overflow-y-auto">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-xl font-bold text-white pr-4">{item.trackTitle}</h2>
                        <button 
                            onClick={onClose}
                            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-4 mb-8 flex-1">
                        <div>
                            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Original Prompt</h3>
                            <p className="text-sm text-zinc-300 bg-zinc-800/50 p-3 rounded-xl border border-zinc-700/50 italic leading-relaxed">
                                "{item.prompt}"
                            </p>
                        </div>
                        
                        <div className="bg-purple-900/10 border border-purple-500/20 rounded-xl p-4">
                            <h3 className="text-sm font-semibold text-purple-400 flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4" />
                                Commercial Rights
                            </h3>
                            <p className="text-xs text-purple-200/70 leading-relaxed">
                                Purchasing this artwork grants you full commercial usage rights. The watermark will be removed upon download.
                            </p>
                        </div>
                    </div>

                    {/* Action Area */}
                    <div className="mt-auto pt-6 border-t border-zinc-800">
                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {success ? (
                            <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
                                <div>
                                    <h4 className="text-emerald-400 font-semibold text-sm">Purchase Successful!</h4>
                                    <p className="text-emerald-500/70 text-xs mt-0.5">
                                        {downloading ? 'Downloading your high-res file...' : 'Your file has been downloaded.'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <Button 
                                variant={isOwner ? "secondary" : "primary"}
                                size="lg" 
                                className="w-full relative overflow-hidden group h-14"
                                onClick={handlePurchaseAndDownload}
                                disabled={isPurchasing || downloading}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative flex items-center justify-center gap-2 font-bold text-[15px]">
                                    {isPurchasing || downloading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : isOwner ? (
                                        <>
                                            <Download className="w-5 h-5" />
                                            Download (You own this)
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="w-5 h-5" />
                                            Buy & Download
                                            <div className="ml-2 flex items-center gap-1 bg-black/20 px-2 py-1 rounded-full text-sm">
                                                <Coins className="w-3.5 h-3.5 text-amber-400" />
                                                {cost}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </Button>
                        )}

                        {!isOwner && !success && (
                            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                                <span>Note: Coins will be deducted securely.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
