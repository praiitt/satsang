'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/livekit/button';
import { toastAlert } from '@/components/livekit/alert-toast';
import { Logo } from '@/components/ui/logo';
import { Check, X, Mail, MessageCircle, RefreshCw, Loader2 } from 'lucide-react';

interface Log {
    id: string;
    timestamp: { _seconds: number; _nanoseconds: number } | string;
    userId: string;
    email?: string;
    phone?: string;
    serviceOfInterest: string;
    results: {
        email: boolean;
        whatsapp: boolean;
    };
    aiContent: {
        whatsapp: string;
        email: string;
    };
}

export default function MarketingAdminPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [logs, setLogs] = useState<Log[]>([]);
    const [formData, setFormData] = useState({
        phoneNumber: '',
        name: '',
        service: 'guru',
        email: '',
    });

    const services = ['guru', 'music', 'tarot', 'astrology', 'general'];

    const fetchLogs = async () => {
        setIsRefreshing(true);
        try {
            const res = await fetch('/backend/marketing/logs?limit=20');
            const data = await res.json();
            if (data.success) {
                setLogs(data.logs);
            }
        } catch (error) {
            console.error('Failed to fetch logs', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (!formData.phoneNumber && !formData.email) {
                throw new Error('Please provide at least a Phone Number or Email.');
            }

            const response = await fetch('/backend/marketing/welcome', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: 'manual_' + Date.now(),
                    phone: formData.phoneNumber || undefined,
                    email: formData.email || undefined,
                    serviceOfInterest: formData.service,
                    name: formData.name,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to send packet');
            }

            toastAlert({
                title: 'Packet Sent! 🚀',
                description: `Welcome message sent to ${formData.name || 'User'} for ${formData.service}.`,
            });

            setFormData(prev => ({ ...prev, name: '', phoneNumber: '', email: '' }));
            fetchLogs(); // Refresh logs

        } catch (error: any) {
            toastAlert({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to format timestamp
    const formatTime = (ts: any) => {
        if (!ts) return '-';
        const date = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
        return date.toLocaleString();
    };

    return (
        <div className="min-h-screen bg-neutral-50 p-8 dark:bg-neutral-900">
            <div className="mx-auto max-w-4xl">
                <div className="mb-12 text-center">
                    <Logo size="lg" className="justify-center mx-auto flex mb-4" />
                    <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Marketing Admin</h1>
                    <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                        Manually trigger "Eco-Culture" welcome packets.
                    </p>
                </div>

                <div className="grid gap-8 lg:grid-cols-2">
                    {/* TRIGGER FORM */}
                    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 h-fit">
                        <h2 className="mb-6 text-xl font-semibold">Send New Packet</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Service Selection */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
                                    Service Context
                                </label>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {services.map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, service: s })}
                                            className={`rounded-lg border px-2 py-2 text-xs font-medium transition-all ${formData.service === s
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-neutral-200 bg-transparent text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-400'
                                                }`}
                                        >
                                            {s.charAt(0).toUpperCase() + s.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* User Details */}
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Rahul"
                                        className="w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-800"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">Phone</label>
                                    <input
                                        type="text"
                                        value={formData.phoneNumber}
                                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        placeholder="+919999999999"
                                        className="w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-800"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="user@example.com"
                                        className="w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-800"
                                    />
                                </div>
                            </div>

                            <Button type="submit" disabled={isLoading} className="w-full py-4 text-base">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send Packet 🚀'}
                            </Button>
                        </form>
                    </div>

                    {/* RECENT ACTIVITY LOGS */}
                    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Recent Activity</h2>
                            <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={isRefreshing}>
                                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>

                        <div className="block max-h-[600px] overflow-y-auto pr-2">
                            {logs.length === 0 ? (
                                <p className="text-center text-sm text-neutral-500 py-8">No recent logs found.</p>
                            ) : (
                                <div className="space-y-3">
                                    {logs.map((log) => (
                                        <div key={log.id} className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900/50">
                                            <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
                                                <span>{formatTime(log.timestamp)}</span>
                                                <span className="font-mono text-primary">{log.serviceOfInterest}</span>
                                            </div>

                                            <div className="mb-2 font-medium">
                                                {log.email || log.phone || log.userId}
                                            </div>

                                            <div className="flex items-center gap-4 text-xs">
                                                <div className={`flex items-center gap-1 ${log.results?.whatsapp ? 'text-green-600' : 'text-neutral-400'}`}>
                                                    <MessageCircle className="h-3 w-3" />
                                                    {log.results?.whatsapp ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                                </div>
                                                <div className={`flex items-center gap-1 ${log.results?.email ? 'text-green-600' : 'text-neutral-400'}`}>
                                                    <Mail className="h-3 w-3" />
                                                    {log.results?.email ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                                </div>
                                            </div>

                                            {/* Preview */}
                                            <div className="mt-2 text-xs text-neutral-500 line-clamp-2 italic border-l-2 border-neutral-200 pl-2">
                                                {log.aiContent?.whatsapp || log.aiContent?.email}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
