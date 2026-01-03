'use client';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/livekit/button';
import {
    Users,
    Sparkles,
    TrendingUp,
    ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardOverviewPage() {
    const [stats, setStats] = useState({
        totalEmployees: 0,
        activeEmployees: 0,
        credits: 0,
        vibrationScore: 0,
        vibrationTrend: 0
    });

    useEffect(() => {
        // TODO: Get real Org ID
        const orgId = 'org_demo';

        import('@/lib/services/corporate-service').then(({ CorporateService }) => {
            CorporateService.getOrganizationStats(orgId).then(data => {
                if (data) setStats(data);
            });
        });
    }, []);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Welcome back, admin. Here's your company's wellness overview.
                    </p>
                </div>
                <div className="flex gap-4">
                    <Link href="/corporate/dashboard/employees">
                        <Button>
                            <Users className="w-4 h-4 mr-2" />
                            Manage Employees
                        </Button>
                    </Link>
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
                    <h3 className="text-lg font-medium mb-4">Vibration Trends</h3>
                    <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-lg border border-dashed">
                        <p className="text-muted-foreground">Chart Visualization Placeholder</p>
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
