'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/livekit/button';
import { useAuth } from '@/components/auth/auth-provider';
import { userService } from '@/lib/services/userService';

interface PartnerOnboardingModalProps {
    onComplete: (partnerData: any) => void;
    onCancel: () => void;
}

export function PartnerOnboardingModal({ onComplete, onCancel }: PartnerOnboardingModalProps) {
    const { user } = useAuth();
    
    // Form state
    const [name, setName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [birthTime, setBirthTime] = useState('');
    const [gender, setGender] = useState('female');
    
    // Location state
    const [citySearch, setCitySearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<{lat: number, lon: number, name: string} | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    // Debounced location search
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (citySearch.length > 2 && (!selectedLocation || citySearch !== selectedLocation.name)) {
                setIsSearching(true);
                try {
                    const geoRes = await fetch(`/api/astrology/geocoding/search?q=${encodeURIComponent(citySearch)}`);
                    if (!geoRes.ok) {
                        throw new Error(`HTTP Error: ${geoRes.status}`);
                    }
                    const geoData = await geoRes.json();
                    if (geoData.success && geoData.results) {
                        setSearchResults(geoData.results);
                        setShowDropdown(true);
                    }
                } catch (err) {
                    console.error('Geocoding search error:', err);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
                setShowDropdown(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [citySearch, selectedLocation]);
    
    // Status state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        if (!name || !birthDate || !birthTime || !citySearch) {
            setError('Please fill out all fields.');
            return;
        }

        if (!selectedLocation) {
            setError('Please select a specific city from the dropdown list.');
            return;
        }

        if (!user?.uid) {
            setError('User not authenticated.');
            return;
        }

        setIsLoading(true);

        try {
            const partnerData = {
                name,
                gender,
                birthDate,
                birthTime,
                latitude: selectedLocation.lat,
                longitude: selectedLocation.lon,
                placeOfBirth: selectedLocation.name,
                timezone: 5.5 // Default IST for now
            };

            // Save partnerData to Firestore
            await userService.updateUserProfile(user.uid, {
                partnerData
            } as any);
            
            onComplete(partnerData);
        } catch (err: any) {
            console.error('Partner Onboarding Error:', err);
            setError(err.message || 'An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
            onClick={onCancel}
        >
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-full max-w-md rounded-3xl border border-orange-200/50 bg-white p-6 shadow-2xl dark:border-orange-900/50 dark:bg-slate-900"
            >
                <button
                    onClick={onCancel}
                    className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                    ✕
                </button>

                <div className="mb-6 text-center">
                    <div className="mb-2 text-4xl">💑</div>
                    <h2 className="text-2xl font-bold text-orange-900 dark:text-orange-200 mb-1">
                        Partner Details
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Required for accurate matchmaking
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-orange-800 dark:text-orange-300">Partner's Name</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-xl border border-orange-200 bg-orange-50/30 px-3 py-2 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:border-orange-900 dark:bg-black/20"
                            placeholder="Enter partner's name"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-orange-800 dark:text-orange-300">Gender</label>
                        <select 
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            className="w-full rounded-xl border border-orange-200 bg-orange-50/30 px-3 py-2 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:border-orange-900 dark:bg-black/20"
                        >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-orange-800 dark:text-orange-300">Date of Birth</label>
                            <input 
                                type="date" 
                                value={birthDate}
                                onChange={(e) => setBirthDate(e.target.value)}
                                className="w-full rounded-xl border border-orange-200 bg-orange-50/30 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:border-orange-900 dark:bg-black/20"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-orange-800 dark:text-orange-300">Time of Birth</label>
                            <input 
                                type="time" 
                                value={birthTime}
                                onChange={(e) => setBirthTime(e.target.value)}
                                className="w-full rounded-xl border border-orange-200 bg-orange-50/30 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:border-orange-900 dark:bg-black/20"
                            />
                        </div>
                    </div>

                    <div className="relative space-y-1 pb-2">
                        <label className="text-xs font-semibold text-orange-800 dark:text-orange-300">Place of Birth</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={citySearch}
                                onChange={(e) => {
                                    setCitySearch(e.target.value);
                                    if (selectedLocation) setSelectedLocation(null);
                                }}
                                onFocus={() => {
                                    if (searchResults.length > 0) setShowDropdown(true);
                                }}
                                onBlur={() => {
                                    setTimeout(() => setShowDropdown(false), 200);
                                }}
                                className="w-full rounded-xl border border-orange-200 bg-orange-50/30 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:border-orange-900 dark:bg-black/20"
                                placeholder="e.g. New Delhi, India"
                                autoComplete="off"
                            />
                            {isSearching && (
                                <div className="absolute right-3 top-2.5">
                                    <span className="block h-4 w-4 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />
                                </div>
                            )}
                        </div>
                        
                        {/* Dropdown */}
                        <AnimatePresence>
                            {showDropdown && searchResults.length > 0 && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-orange-200 bg-white shadow-xl dark:border-orange-900 dark:bg-slate-800"
                                >
                                    {searchResults.map((result: any, i: number) => (
                                        <div 
                                            key={i}
                                            className="cursor-pointer px-4 py-2 hover:bg-orange-50 dark:hover:bg-orange-900/30 border-b border-slate-50 last:border-0 dark:border-slate-700/50"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setCitySearch(result.display_name);
                                                setSelectedLocation({
                                                    lat: parseFloat(result.lat),
                                                    lon: parseFloat(result.lon),
                                                    name: result.display_name
                                                });
                                                setShowDropdown(false);
                                                setSearchResults([]);
                                            }}
                                        >
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                                {result.display_name}
                                            </p>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-600 py-3 font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2 justify-center">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                                Saving...
                            </span>
                        ) : (
                            "Save Partner Details"
                        )}
                    </Button>
                </form>
            </motion.div>
        </motion.div>
    );
}
