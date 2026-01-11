'use client';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/livekit/button';
import {
    Users,
    Sparkles,
    TrendingUp,
    ArrowRight,
    Heart
} from 'lucide-react';
import Link from 'next/link';
import { useCorporateAuth } from '@/contexts/corporate-auth-context';

export default function DashboardOverviewPage() {
    const { selectedOrg, isLoading: orgLoading, isOrgAdmin } = useCorporateAuth();
    const [stats, setStats] = useState({
        totalEmployees: 0,
        activeEmployees: 0,
        credits: 0,
        vibrationScore: 0,
        vibrationTrend: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!selectedOrg) {
            setLoading(false);
            return;
        }

        import('@/lib/services/corporate-service').then(({ CorporateService }) => {
            CorporateService.getOrganizationStats(selectedOrg.id).then(data => {
                if (data) setStats(data);
                setLoading(false);
            });
        });
    }, [selectedOrg]);

    if (orgLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-gold-500/30 border-t-gold-500 rounded-full animate-spin mx-auto" />
                    <p className="text-muted-foreground">Loading organization data...</p>
                </div>
            </div>
        );
    }

    if (!selectedOrg) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center space-y-4">
                    <p className="text-xl text-muted-foreground">No organization selected</p>
                    <p className="text-sm text-muted-foreground">You don't belong to any organization yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{selectedOrg.name} Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Welcome back. Here's your company's wellness overview.
                    </p>
                </div>
                <div className="flex gap-4">
                    {selectedOrg && isOrgAdmin(selectedOrg.id) && (
                        <Link href="/corporate/dashboard/employees">
                            <Button>
                                <Users className="w-4 h-4 mr-2" />
                                Manage Employees
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="p-6 space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Employees</h3>
                        <Users className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                    <p className="text-xs text-green-500 font-medium">
                        {stats.activeEmployees} active now
                    </p>
                </Card>

                <Card className="p-6 space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground">Wellness Credits</h3>
                        <Sparkles className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-2xl font-bold">{stats.credits}</div>
                    <p className="text-xs text-muted-foreground">Available balance</p>
                </Card>

                <Card className="p-6 space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground">Avg Vibration Score</h3>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold">{stats.vibrationScore}</div>
                    <p className="text-xs text-green-500 font-medium">↑ {stats.vibrationTrend}% this week</p>
                </Card>
            </div>

            {/* Main Content Area (Placeholder for Charts) */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 p-6">
                    <h3 className="text-lg font-medium mb-4">Fuel & Flow Program</h3>
                    <div className="h-[300px] flex gap-4">
                        <div className="flex-1 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-800 p-4 flex flex-col justify-center items-center text-center">
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mb-3">
                                <Users className="w-6 h-6 text-green-600 dark:text-green-300" />
                            </div>
                            <h4 className="font-bold text-lg">Next Event</h4>
                            <p className="text-sm font-medium">Virtual Tai Chi Flow</p>
                            <p className="text-xs text-muted-foreground mt-1">Friday, 10:00 AM EST</p>
                            <Button variant="outline" size="sm" className="mt-3 h-8 text-xs">Manage Schedule</Button>
                        </div>
                        <div className="flex-1 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800 p-4 flex flex-col justify-center items-center text-center">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mb-3">
                                <Heart className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                            </div>
                            <h4 className="font-bold text-lg">Diet Plans</h4>
                            <p className="text-sm font-medium">12 Active Plans</p>
                            <div className="w-full bg-blue-200 dark:bg-blue-800 h-1.5 rounded-full mt-3 overflow-hidden">
                                <div className="bg-blue-500 h-full w-[65%]"></div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">65% Adoption Rate</p>
                        </div>
                    </div>
                </Card>

                <Card className="col-span-3 p-6">
                    <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
                                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 font-bold text-xs">
                                    JD
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">Employee Session</p>
                                    <p className="text-xs text-muted-foreground">Completed "Morning Focus" meditation</p>
                                </div>
                                <div className="text-xs text-muted-foreground">2h ago</div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
