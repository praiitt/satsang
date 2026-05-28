'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Film, Image as ImageIcon, Sparkles, Loader2, Coins, Search } from 'lucide-react';
import { ArtItem, ArtPurchaseModal } from './art-purchase-modal';
import { SpiritualReelsStudio } from './spiritual-reels-studio';
import BuyCoinsModal from '@/components/spiritual-studio/buy-coins-modal';
import { useAuth } from '@/components/auth/auth-provider';
import { getFirebaseAuth } from '@/lib/firebase-client';
import { cn } from '@/lib/utils';

export function ArtShopView() {
    const [items, setItems] = useState<ArtItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    const [selectedItem, setSelectedItem] = useState<ArtItem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isReelsStudioOpen, setIsReelsStudioOpen] = useState(false);

    // Coins State
    const { user, isAuthenticated } = useAuth();
    const [coinBalance, setCoinBalance] = useState<number | null>(null);
    const [showBuyCoins, setShowBuyCoins] = useState(false);

    const fetchCoinBalance = async () => {
        if (!user) return;
        try {
            const auth = getFirebaseAuth();
            const token = await auth.currentUser?.getIdToken();
            if (!token) return;

            const response = await fetch(
                'https://us-central1-rraasi-8a619.cloudfunctions.net/rraasi-coin-service/coins/balance',
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!response.ok) throw new Error('Failed to fetch balance');
            const data = await response.json();
            if (data.success) setCoinBalance(data.balance?.totalCoins ?? 0);
        } catch (error) {
            console.error('Error fetching coin balance:', error);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchCoinBalance();
        } else {
            setCoinBalance(null);
        }
    }, [isAuthenticated, user]);

    const loadArt = async (pageNum: number, currentFilter: string, currentSearch: string, isNew = false) => {
        try {
            if (isNew) setLoading(true);
            else setLoadingMore(true);

            let url = `/api/gallery?page=${pageNum}&limit=50&type=${currentFilter}`;
            if (currentSearch) {
                url += `&search=${encodeURIComponent(currentSearch)}`;
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch art');
            
            const data = await res.json();
            
            if (isNew) {
                setItems(data.artItems || []);
            } else {
                setItems(prev => [...prev, ...(data.artItems || [])]);
            }
            
            setHasMore(data.hasMore);
        } catch (error) {
            console.error('Error fetching gallery:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Re-load when filter changes
    useEffect(() => {
        setPage(1);
        loadArt(1, filter, searchQuery, true);
    }, [filter]);

    // Re-load when search changes (with basic debouncing in UI)
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        loadArt(1, filter, searchQuery, true);
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadArt(nextPage, filter, searchQuery, false);
        }
    };

    const handleItemClick = (item: ArtItem) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    // Columns for Masonry Layout
    const getColumns = () => {
        if (typeof window === 'undefined') return 1;
        if (window.innerWidth >= 1280) return 4;
        if (window.innerWidth >= 1024) return 3;
        if (window.innerWidth >= 640) return 2;
        return 2; // Default to 2 columns on mobile
    };

    const [columns, setColumns] = useState(1);
    
    useEffect(() => {
        setColumns(getColumns());
        const handleResize = () => setColumns(getColumns());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const columnWrappers: ArtItem[][] = Array.from({ length: columns }, () => []);
    items.forEach((item, index) => {
        columnWrappers[index % columns].push(item);
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 mb-2 flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-indigo-400" />
                        AI Art Shop
                    </h1>
                    <p className="text-zinc-400 text-lg mb-4">Browse, preview, and purchase copyright rights to platform-generated art.</p>
                    
                    {/* Reels Studio Button */}
                    <button
                        onClick={() => setIsReelsStudioOpen(true)}
                        className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold py-2 px-6 rounded-full shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all transform hover:scale-105"
                    >
                        <Film className="w-5 h-5" />
                        Create Spiritual Reel
                    </button>
                </div>

                <div className="flex flex-col items-end gap-4">
                    {/* Coin Balance (If Authed) */}
                    {isAuthenticated && coinBalance !== null && (
                        <div className="flex items-center gap-4 bg-zinc-900/80 p-2 pl-4 rounded-2xl border border-zinc-800 backdrop-blur-md">
                            <div className="flex items-center gap-2">
                                <Coins className="w-5 h-5 text-amber-400" />
                                <span className="text-amber-400 font-bold text-lg">{coinBalance.toLocaleString()}</span>
                            </div>
                            <button
                                onClick={() => setShowBuyCoins(true)}
                                className="bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold px-4 py-1.5 rounded-xl transition-all shadow-md shadow-amber-500/20"
                            >
                                Buy Coins
                            </button>
                        </div>
                    )}

                    {/* Search and Filters */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-end">
                        <form 
                            onSubmit={handleSearch}
                            className="relative flex items-center bg-zinc-900/80 rounded-2xl border border-zinc-800 backdrop-blur-md overflow-hidden w-full sm:w-64"
                        >
                            <input
                                type="text"
                                placeholder="Search prompts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none text-white placeholder-zinc-500 w-full py-2.5 pl-10 pr-4 text-sm"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                <Search className="w-4 h-4 text-zinc-500" />
                            </div>
                        </form>

                        <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-800 backdrop-blur-md">
                            <button
                                onClick={() => setFilter('all')}
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300",
                                filter === 'all' 
                                    ? "bg-white text-black shadow-md scale-105" 
                                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            All Art
                        </button>
                        <button
                            onClick={() => setFilter('image')}
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2",
                                filter === 'image' 
                                    ? "bg-blue-500 text-white shadow-md shadow-blue-500/20 scale-105" 
                                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <ImageIcon className="w-4 h-4" />
                            Images
                        </button>
                        <button
                            onClick={() => setFilter('video')}
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2",
                                filter === 'video' 
                                    ? "bg-purple-500 text-white shadow-md shadow-purple-500/20 scale-105" 
                                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Film className="w-4 h-4" />
                            Videos
                        </button>
                    </div>
                </div>
            </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-32">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                </div>
            ) : items.length === 0 ? (
                <div className="flex flex-col justify-center items-center py-32 text-center bg-zinc-900/50 rounded-3xl border border-zinc-800">
                    <Sparkles className="w-16 h-16 text-zinc-700 mb-4" />
                    <h3 className="text-2xl font-bold text-zinc-300 mb-2">No art found</h3>
                    <p className="text-zinc-500">There doesn't seem to be any public AI art available right now.</p>
                </div>
            ) : (
                <>
                    {/* Masonry Grid */}
                    <div className="flex gap-4">
                        {columnWrappers.map((col, colIndex) => (
                            <div key={colIndex} className="flex-1 flex flex-col gap-4">
                                {col.map((item) => (
                                    <div 
                                        key={item.id} 
                                        className="relative group cursor-pointer rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/50 shadow-lg hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 hover:-translate-y-1"
                                        onClick={() => handleItemClick(item)}
                                    >
                                        <div className="relative w-full overflow-hidden bg-zinc-900 aspect-[4/5] md:aspect-auto">
                                            {item.type === 'video' ? (
                                                <video 
                                                    src={item.url} 
                                                    className="w-full h-full object-cover"
                                                    autoPlay
                                                    loop
                                                    muted
                                                    playsInline
                                                />
                                            ) : (
                                                <img 
                                                    src={item.url} 
                                                    alt={item.trackTitle} 
                                                    loading="lazy"
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                />
                                            )}
                                            
                                            {/* Type Badge */}
                                            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md rounded-full p-1.5 border border-white/10">
                                                {item.type === 'video' ? (
                                                    <Film className="w-4 h-4 text-purple-400" />
                                                ) : (
                                                    <ImageIcon className="w-4 h-4 text-blue-400" />
                                                )}
                                            </div>

                                            {/* Hover Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                                                <h4 className="text-white font-bold line-clamp-1 mb-1">{item.trackTitle}</h4>
                                                <p className="text-zinc-300 text-xs line-clamp-2 opacity-80 italic">"{item.prompt}"</p>
                                                
                                                <div className="mt-4 flex items-center justify-between">
                                                    <span className="bg-indigo-500/80 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                                        View & Buy
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Load More */}
                    {hasMore && (
                        <div className="mt-12 flex justify-center">
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 px-8 rounded-full transition-all duration-300 flex items-center gap-2 border border-zinc-700"
                            >
                                {loadingMore ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    'Load More Art'
                                )}
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Purchase Modal */}
            <ArtPurchaseModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                item={selectedItem}
                onShowBuyCoins={() => setShowBuyCoins(true)}
            />

            {/* Reels Studio Modal */}
            <SpiritualReelsStudio 
                isOpen={isReelsStudioOpen} 
                onClose={() => setIsReelsStudioOpen(false)} 
                onShowBuyCoins={() => {
                    setIsReelsStudioOpen(false);
                    setShowBuyCoins(true);
                }} 
            />

            {/* Buy Coins Modal */}
            <BuyCoinsModal
                isOpen={showBuyCoins}
                onClose={() => setShowBuyCoins(false)}
                currentBalance={coinBalance ?? 0}
                onCoinsAdded={(newBalance) => {
                    setCoinBalance(newBalance);
                    setShowBuyCoins(false);
                }}
            />
        </div>
    );
}
