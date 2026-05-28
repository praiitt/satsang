'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/livekit/button';
import { useAuth } from '@/components/auth/auth-provider';
import { useUserProfile } from '@/hooks/useUserProfile';
import { userService } from '@/lib/services/userService';

interface VedicAstrologyOnboardingViewProps {
    onComplete: () => void;
}

export function VedicAstrologyOnboardingView({ onComplete }: VedicAstrologyOnboardingViewProps) {
    const { user } = useAuth();
    const { profile } = useUserProfile();
    
    // Form state
    const [name, setName] = useState('');
    
    // Sync name when user loads
    useEffect(() => {
        const defaultName = profile?.name || user?.displayName;
        if (defaultName && !name) {
            setName(defaultName);
        }
    }, [user?.displayName, profile?.name]);
    const [birthDate, setBirthDate] = useState('');
    const [birthTime, setBirthTime] = useState('');
    const [gender, setGender] = useState('male');
    
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
    const [statusMessage, setStatusMessage] = useState('');
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
        setStatusMessage('Calculating your stars...');

        try {
            // 2. Generate Charts
            const payloadName = profile?.name || user?.displayName || name;
            
            if (!payloadName) {
                setError('Please provide your name.');
                setIsLoading(false);
                return;
            }

            const payload = {
                userId: user.uid,
                birthData: {
                    name: payloadName,
                    gender,
                    birthDate,
                    birthTime,
                    latitude: selectedLocation.lat,
                    longitude: selectedLocation.lon,
                    placeOfBirth: selectedLocation.name,
                    timezone: 5.5 // Default IST for now
                }
            };

            const chartRes = await fetch('/api/astrology/auth/generate-charts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!chartRes.ok) {
                const errData = await chartRes.json();
                throw new Error(errData.error || 'Failed to generate charts.');
            }

            setStatusMessage('Stars aligned! Opening your path...');
            
            // Save birthData to Firestore so it shows in the Profile page
            try {
                await userService.updateUserProfile(user.uid, {
                    birthData: {
                        name: payloadName,
                        gender,
                        birthDate,
                        birthTime,
                        latitude: selectedLocation.lat,
                        longitude: selectedLocation.lon,
                        placeOfBirth: selectedLocation.name,
                        timezone: 5.5
                    },
                    chartsGenerated: true
                } as any);
            } catch (updateErr) {
                console.error("Failed to update Firestore profile with birth data:", updateErr);
            }
            
            // 3. Mark complete
            setTimeout(() => {
                onComplete();
            }, 1000);
            
        } catch (err: any) {
            console.error('Onboarding Error:', err);
            setError(err.message || 'An error occurred. Please try again.');
        } finally {
            if (error) setIsLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-slate-950 dark:via-orange-950 dark:to-red-950 px-4 py-8">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.828-1.415 1.415L51.8 0h2.827zM5.373 0l-.83.828L5.96 2.243 8.2 0H5.374zM48.97 0l3.657 3.657-1.414 1.414L46.143 0h2.828zM11.03 0L7.372 3.657 8.787 5.07 13.857 0H11.03zm32.284 0L49.8 6.485 48.384 7.9l-7.9-7.9h2.83zM16.686 0L10.2 6.485 11.616 7.9l7.9-7.9h-2.83zm20.97 0l9.315 9.314-1.414 1.414L34.828 0h2.83zM22.344 0L13.03 9.314l1.414 1.414L25.172 0h-2.83zM32 0l12.142 12.142-1.414 1.414L30 .828 17.272 13.556l-1.414-1.414L28 0h4zM.284 0l28 28-1.414 1.414L0 2.544V0h.284zM0 5.373l25.456 25.455-1.414 1.415L0 7.788V5.374zm0 5.656L22.627 33.86l-1.414 1.413L0 13.03v-1.657zm0 5.657l19.799 19.798-1.414 1.414L0 18.686v-2.828zm0 5.657L16.97 38.97l-1.415 1.413L0 24.343v-2.828zm0 5.657L14.142 44.14l-1.414 1.414L0 30v-2.828zm0 5.657L11.314 49.86l-1.414 1.413L0 35.657v-2.828zM0 41.313L8.485 49.8l-1.414 1.415L0 44.142v-2.83zm0 5.657l5.657 5.657-1.414 1.414L0 49.97v-2.828zM54.627 60L30 35.373 5.373 60H8.2l21.8-21.8 21.8 21.8h2.827zm-5.657 0L30 41.03 11.03 60h2.828L30 43.858 46.142 60h2.828zM60 5.373L34.544 30.828l-1.414-1.414L60 2.544V5.373zm0 5.656L39.97 33.86l-1.414-1.413L60 11v-1.657zm0 5.657L37.743 38.97l-1.414-1.413L60 16.686v-2.828zm0 5.657L35.515 44.14l-1.414-1.414L60 22.343v-2.828zm0 5.657L33.284 49.8l-1.414-1.415L60 28v-2.828zm0 5.657L30.314 54.97l-1.414-1.413L60 33.657v-2.828zM60 41.313L27.485 49.8l-1.414-1.415L60 44.142v-2.83zm0 5.657L24.657 58.97l-1.414-1.413L60 49.97v-2.828z' fill='%23f97316' opacity='0.4'/%3E%3C/svg%3E")`,
                }} />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-xl rounded-3xl border border-orange-200/50 bg-white/70 p-8 shadow-2xl backdrop-blur-xl dark:border-orange-900/50 dark:bg-slate-900/70"
            >
                <div className="mb-8 text-center">
                    <div className="mb-4 text-6xl">✨</div>
                    <h1 className="text-3xl font-bold text-orange-900 dark:text-orange-200 mb-2">
                        Awaken Your Kundli
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        To connect you with your personal Vedic Astrologer, we need the exact coordinates of your birth.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {!(profile?.name || user?.displayName) && (
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-orange-800 dark:text-orange-300">Full Name</label>
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-xl border border-orange-200 bg-white/50 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:border-orange-900 dark:bg-black/20"
                                placeholder="Enter your name"
                            />
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-orange-800 dark:text-orange-300">Gender</label>
                        <select 
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            className="w-full rounded-xl border border-orange-200 bg-white/50 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:border-orange-900 dark:bg-black/20"
                        >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-orange-800 dark:text-orange-300">Date of Birth</label>
                            <input 
                                type="date" 
                                value={birthDate}
                                onChange={(e) => setBirthDate(e.target.value)}
                                className="w-full rounded-xl border border-orange-200 bg-white/50 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:border-orange-900 dark:bg-black/20"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-orange-800 dark:text-orange-300">Time of Birth</label>
                            <input 
                                type="time" 
                                value={birthTime}
                                onChange={(e) => setBirthTime(e.target.value)}
                                className="w-full rounded-xl border border-orange-200 bg-white/50 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:border-orange-900 dark:bg-black/20"
                            />
                        </div>
                    </div>

                    <div className="relative space-y-1">
                        <label className="text-sm font-semibold text-orange-800 dark:text-orange-300">Place of Birth</label>
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
                                    // Delay hiding dropdown so clicks register
                                    setTimeout(() => setShowDropdown(false), 200);
                                }}
                                className="w-full rounded-xl border border-orange-200 bg-white/50 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:border-orange-900 dark:bg-black/20"
                                placeholder="e.g. New Delhi, India"
                                autoComplete="off"
                            />
                            {isSearching && (
                                <div className="absolute right-3 top-3">
                                    <span className="block h-5 w-5 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />
                                </div>
                            )}
                        </div>
                        
                        {/* Dropdown */}
                        <AnimatePresence>
                            {showDropdown && searchResults.length > 0 && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-orange-200 bg-white shadow-xl dark:border-orange-900 dark:bg-slate-900"
                                >
                                    {searchResults.map((result: any, i: number) => (
                                        <div 
                                            key={i}
                                            className="cursor-pointer px-4 py-3 hover:bg-orange-50 dark:hover:bg-orange-900/30"
                                            onMouseDown={(e) => {
                                                e.preventDefault(); // Prevent input from losing focus immediately
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
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                {result.display_name}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                Lat: {parseFloat(result.lat).toFixed(4)}°, Lon: {parseFloat(result.lon).toFixed(4)}°
                                            </p>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="pt-4">
                        <Button 
                            type="submit" 
                            disabled={isLoading}
                            className="group relative w-full overflow-hidden bg-gradient-to-r from-orange-500 to-amber-600 py-6 text-lg font-bold text-white shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                                    {statusMessage}
                                </span>
                            ) : (
                                "Generate Birth Chart 🔮"
                            )}
                        </Button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
