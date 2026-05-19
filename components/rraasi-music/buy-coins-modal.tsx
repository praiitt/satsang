'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Coins, Zap, Trophy, Leaf, CheckCircle, Loader2 } from 'lucide-react';
import { getFirebaseAuth } from '@/lib/firebase-client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoinPack {
  id: string;
  name: string;
  coins: number;
  price: number;
  priceDisplay: string;
  description: string;
  badge: string | null;
  icon: string;
}

interface BuyCoinsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance?: number;
  onCoinsAdded?: (newBalance: number) => void;
}

// ─── Razorpay window declaration ──────────────────────────────────────────────
declare global {
  interface Window {
    Razorpay: any;
  }
}

const COIN_SERVICE_URL = 'https://us-central1-rraasi-8a619.cloudfunctions.net/rraasi-coin-service';

// ─── Component ────────────────────────────────────────────────────────────────

export default function BuyCoinsModal({
  isOpen,
  onClose,
  currentBalance = 0,
  onCoinsAdded
}: BuyCoinsModalProps) {
  const [packs, setPacks] = useState<CoinPack[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ coins: number; packName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Load Razorpay SDK
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (document.getElementById('razorpay-sdk')) return;
    const script = document.createElement('script');
    script.id = 'razorpay-sdk';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Fetch packs
  const fetchPacks = useCallback(async () => {
    try {
      setLoadingPacks(true);
      const auth = getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${COIN_SERVICE_URL}/subscriptions/coin-packs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setPacks(data.packs);
    } catch (e) {
      console.error('Failed to load packs:', e);
    } finally {
      setLoadingPacks(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchPacks();
      setSuccess(null);
      setError(null);
    }
  }, [isOpen, fetchPacks]);

  // ─── Purchase flow ──────────────────────────────────────────────────────────
  const handleBuy = async (pack: CoinPack) => {
    setError(null);
    setPurchasing(pack.id);
    try {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Please log in first');
      const token = await user.getIdToken();

      // 1. Create order
      const orderRes = await fetch(`${COIN_SERVICE_URL}/subscriptions/coin-packs/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ packId: pack.id })
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.error || 'Failed to create order');

      const { order } = orderData;

      // 2. Open Razorpay checkout
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'RRAASI',
          description: `${pack.name} — ${pack.coins} coins`,
          order_id: order.id,
          prefill: {
            email: user.email || '',
            name: user.displayName || ''
          },
          theme: { color: '#f59e0b' },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled'))
          },
          handler: async (response: any) => {
            try {
              // 3. Verify and credit
              const verifyRes = await fetch(`${COIN_SERVICE_URL}/subscriptions/coin-packs/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  packId: pack.id
                })
              });
              const verifyData = await verifyRes.json();
              if (!verifyData.success) throw new Error(verifyData.error || 'Verification failed');

              setSuccess({ coins: pack.coins, packName: pack.name });
              onCoinsAdded?.(verifyData.newBalance ?? currentBalance + pack.coins);
              resolve();
            } catch (e: any) {
              reject(e);
            }
          }
        });
        rzp.open();
      });
    } catch (e: any) {
      if (e.message !== 'Payment cancelled') {
        setError(e.message || 'Payment failed. Please try again.');
      }
    } finally {
      setPurchasing(null);
    }
  };

  if (!isOpen || !mounted) return null;

  // ─── Pack icon component ──────────────────────────────────────────────────────
  const PackIcon = ({ pack }: { pack: CoinPack }) => {
    if (pack.icon === '🌱') return <Leaf className="w-6 h-6 text-emerald-400" />;
    if (pack.icon === '🎬') return <Zap className="w-6 h-6 text-amber-400" />;
    return <Trophy className="w-6 h-6 text-purple-400" />;
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-white/8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center">
                <Coins className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Buy Coins</h2>
                <p className="text-white/40 text-xs">One-time purchase · No expiry</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>

          {/* Current balance */}
          <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/8">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-white/60 text-sm">Current balance:</span>
            <span className="text-amber-400 font-bold text-sm">{currentBalance.toLocaleString()} coins</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Success state */}
          {success && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                <CheckCircle className="w-9 h-9 text-emerald-400" />
              </div>
              <p className="text-white font-bold text-xl">
                +{success.coins.toLocaleString()} coins added!
              </p>
              <p className="text-white/50 text-sm">{success.packName} purchased successfully</p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-colors"
              >
                Start Creating ✨
              </button>
            </div>
          )}

          {/* Error */}
          {error && !success && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Packs */}
          {!success && (
            <>
              <p className="text-white/40 text-xs uppercase tracking-widest mb-4 font-semibold">
                Choose a pack
              </p>

              {loadingPacks ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {packs.map(pack => {
                    const isLoading = purchasing === pack.id;
                    const isPopular = pack.badge === 'Most Popular';
                    const isBest = pack.badge === 'Best Value';

                    return (
                      <button
                        key={pack.id}
                        onClick={() => handleBuy(pack)}
                        disabled={!!purchasing}
                        className={`
                          relative w-full flex items-center gap-4 px-4 py-4 rounded-xl border
                          transition-all text-left group
                          ${isPopular
                            ? 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/15 hover:border-amber-500/60'
                            : isBest
                            ? 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/15 hover:border-purple-500/50'
                            : 'bg-white/4 border-white/10 hover:bg-white/8 hover:border-white/20'
                          }
                          ${purchasing && !isLoading ? 'opacity-50' : ''}
                          disabled:cursor-not-allowed
                        `}
                      >
                        {/* Badge */}
                        {pack.badge && (
                          <div className={`
                            absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                            ${isPopular ? 'bg-amber-500 text-black' : 'bg-purple-500 text-white'}
                          `}>
                            {pack.badge}
                          </div>
                        )}

                        {/* Icon */}
                        <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                          ${isPopular ? 'bg-amber-500/20' : isBest ? 'bg-purple-500/20' : 'bg-white/8'}
                        `}>
                          <PackIcon pack={pack} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-white font-bold text-sm">{pack.name}</span>
                            <span className={`text-xs font-bold ${isPopular ? 'text-amber-400' : isBest ? 'text-purple-400' : 'text-white/50'}`}>
                              {pack.coins.toLocaleString()} coins
                            </span>
                          </div>
                          <p className="text-white/40 text-xs mt-0.5">{pack.description}</p>
                        </div>

                        {/* Price */}
                        <div className="text-right flex-shrink-0">
                          {isLoading ? (
                            <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                          ) : (
                            <span className={`font-bold text-base ${isPopular ? 'text-amber-400' : isBest ? 'text-purple-400' : 'text-white'}`}>
                              {pack.priceDisplay}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Cost reminder */}
              <p className="mt-5 text-center text-white/25 text-[11px]">
                🎬 Video creation = 300 coins · 🎵 Music = 50 coins
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
