'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/livekit/button';
import {
    Sparkles,
    Music,
    MessageCircle,
    TrendingUp,
    Calendar
} from 'lucide-react';
import { useCorporateAuth } from '@/contexts/corporate-auth-context';
import { useAuth } from '@/components/auth/auth-provider';

export default function EmployeePortalPage() {
    const { user } = useAuth();
    const { selectedOrg } = useCorporateAuth();
    const [personalCredits, setPersonalCredits] = useState(0);
    const [usageHistory, setUsageHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (selectedOrg && user) {
            loadEmployeeData();
        }
    }, [selectedOrg, user]);

    const loadEmployeeData = async () => {
        if (!selectedOrg || !user) return;

        try {
            setLoading(true);
            const { CorporateService } = await import('@/lib/services/corporate-service');
            const employees = await CorporateService.getEmployees(selectedOrg.id);
            const myRecord = employees.find(e => e.uid === user.uid);

            if (myRecord) {
                setPersonalCredits(myRecord.personalCredits);
            }

            // TODO: Load actual usage history from sessions collection
            setUsageHistory([
                { date: '2024-01-08', type: 'Music Session', credits: 10 },
                { date: '2024-01-07', type: 'Guru Chat', credits: 5 },
                { date: '2024-01-05', type: 'Music Session', credits: 10 },
            ]);
        } catch (error) {
            console.error('Error loading employee data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRedeemCredits = async (service: string, cost: number) => {
        if (!selectedOrg) return;

        try {
            const { CorporateService } = await import('@/lib/services/corporate-service');
            const success = await CorporateService.consumeCredits(selectedOrg.id, cost);

            if (success) {
                alert(`${cost} credits redeemed for ${service}`);
                loadEmployeeData();
            } else {
                alert('Insufficient credits');
            }
        } catch (error) {
            console.error('Error redeeming credits:', error);
            alert('Failed to redeem credits');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-gold-500/30 border-t-gold-500 rounded-full animate-spin mx-auto" />
                    <p className="text-muted-foreground">Loading your benefits...</p>
                </div>
            </div>
        );
    }

    if (!selectedOrg) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center space-y-4">
                    <p className="text-xl text-muted-foreground">No organization benefits available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto p-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Employee Wellness Portal</h1>
                <p className="text-muted-foreground mt-1">
                    Access your corporate wellness benefits from {selectedOrg.name}
                </p>
            </div>

            {/* Credits Display */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="p-6 space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground">Organization Credits</h3>
                        <Sparkles className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-3xl font-bold">{selectedOrg.credits}</div>
                    <p className="text-xs text-muted-foreground">Shared pool available</p>
                </Card>

                <Card className="p-6 space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground">Personal Credits</h3>
                        <Sparkles className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="text-3xl font-bold">{personalCredits}</div>
                    <p className="text-xs text-muted-foreground">Your allocated credits</p>
                </Card>

                <Card className="p-6 space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground">Vibration Score</h3>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="text-3xl font-bold">782</div>
                    <p className="text-xs text-green-500 font-medium">↑ 8% this month</p>
                </Card>
            </div>

            {/* Services */}
            <div>
                <h2 className="text-2xl font-bold mb-6">Redeem Credits</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                                <Music className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="text-sm font-semibold text-amber-600">10 Credits</div>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">RRAASI Music Session</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Generate personalized healing music for 30 minutes
                        </p>
                        <Button
                            className="w-full"
                            onClick={() => handleRedeemCredits('Music Session', 10)}
                        >
                            Start Session
                        </Button>
                    </Card>

                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                                <MessageCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="text-sm font-semibold text-amber-600">5 Credits</div>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Guru Chat Session</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Get guidance from AI spiritual teachers
                        </p>
                        <Button
                            className="w-full"
                            onClick={() => handleRedeemCredits('Guru Chat', 5)}
                        >
                            Start Chat
                        </Button>
                    </Card>

                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                                <Calendar className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="text-sm font-semibold text-amber-600">3 Credits</div>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Astrology Reading</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Get personalized astrological insights
                        </p>
                        <Button
                            className="w-full"
                            onClick={() => handleRedeemCredits('Astrology Reading', 3)}
                        >
                            Get Reading
                        </Button>
                    </Card>
                </div>
            </div>

            {/* Usage History */}
            <div>
                <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
                <Card className="p-6">
                    <div className="space-y-4">
                        {usageHistory.map((item, i) => (
                            <div key={i} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                                <div>
                                    <p className="font-medium">{item.type}</p>
                                    <p className="text-sm text-muted-foreground">{item.date}</p>
                                </div>
                                <div className="text-sm font-semibold text-amber-600">
                                    -{item.credits} credits
                                </div>
                            </div>
                        ))}
                        {usageHistory.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">
                                No activity yet. Start using your wellness benefits!
                            </p>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
