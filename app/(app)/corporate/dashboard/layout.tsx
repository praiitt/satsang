'use client';

import { useState } from 'react';
import { Button } from '@/components/livekit/button';
import {
    LayoutDashboard,
    Users,
    Settings,
    BarChart3,
    LogOut,
    Building2,
    Menu,
    X
} from 'lucide-react';
import Link from 'next/link';

export default function CorporateDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const SidebarContent = () => (
        <>
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-2 font-bold text-xl text-amber-600">
                    <Building2 className="w-6 h-6" />
                    <span>Rraasi Corp</span>
                </div>
                {/* Close button for mobile only */}
                <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="md:hidden text-muted-foreground"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                <Link href="/corporate/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-base font-medium">
                        <LayoutDashboard className="w-5 h-5" />
                        Overview
                    </Button>
                </Link>
                <Link href="/corporate/dashboard/employees" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-base font-medium">
                        <Users className="w-5 h-5" />
                        Employees
                    </Button>
                </Link>
                <Link href="/corporate/dashboard/reports" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-base font-medium">
                        <BarChart3 className="w-5 h-5" />
                        Wellness Reports
                    </Button>
                </Link>
                <Link href="/corporate/dashboard/settings" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-base font-medium">
                        <Settings className="w-5 h-5" />
                        Settings
                    </Button>
                </Link>
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <Button variant="ghost" className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </Button>
            </div>
        </>
    );

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-neutral-900 relative">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-neutral-950 border-b border-border z-20 flex items-center px-4 justify-between">
                <div className="flex items-center gap-2 font-bold text-lg text-amber-600">
                    <Building2 className="w-5 h-5" />
                    <span>Rraasi Corp</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(true)}>
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* Desktop Sidebar */}
            <aside className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-neutral-950 hidden md:flex flex-col sticky top-0 h-screen">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                    <aside className="absolute top-0 left-0 bottom-0 w-64 bg-white dark:bg-neutral-950 border-r border-border flex flex-col animate-in slide-in-from-left">
                        <SidebarContent />
                    </aside>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-auto md:pt-0 pt-16">
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
