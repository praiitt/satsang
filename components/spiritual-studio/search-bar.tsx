import React, { useState, useEffect } from 'react';

interface SearchBarProps {
    onSearch: (searchTerm: string) => void;
    placeholder?: string;
    initialValue?: string;
}

export function SearchBar({ onSearch, placeholder = "Search for tracks, lyrics, tags...", initialValue = "" }: SearchBarProps) {
    const [searchTerm, setSearchTerm] = useState(initialValue);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== initialValue) {
                onSearch(searchTerm);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [searchTerm, onSearch, initialValue]);

    return (
        <div className="relative w-full max-w-2xl mx-auto mb-8">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
            </div>
            <input
                type="text"
                className="block w-full pl-10 pr-3 py-3 border border-zinc-700 rounded-full leading-5 bg-zinc-900/50 text-white placeholder-zinc-400 focus:outline-none focus:bg-zinc-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 sm:text-sm transition duration-150 ease-in-out shadow-inner"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
                <button
                    onClick={() => {
                        setSearchTerm('');
                        onSearch('');
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-white"
                >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                </button>
            )}
        </div>
    );
}
