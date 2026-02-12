"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { usePathname } from "next/navigation";

// Define the BeforeInstallPromptEvent interface
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PWAInstallButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const handler = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Update UI notify the user they can install the PWA
            setIsVisible(true);
            console.log("Creating PWA install prompt event");
        };

        window.addEventListener("beforeinstallprompt", handler);

        // Check if already installed
        const isInstalled = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        if (isInstalled) {
            setIsVisible(false);
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const choiceResult = await deferredPrompt.userChoice;

        if (choiceResult.outcome === "accepted") {
            console.log("User accepted the install prompt");
        } else {
            console.log("User dismissed the install prompt");
        }

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setIsVisible(false);
    };

    if (!isVisible) return null;

    // Don't show on PWA standalone mode if detected (double check)
    if (typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches)) {
        return null;
    }

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-10 md:left-auto md:right-10 md:w-auto animate-in slide-in-from-bottom-5">
            <div className="bg-primary/10 backdrop-blur-md border border-primary/20 p-4 rounded-xl shadow-lg flex items-center justify-between gap-4 md:min-w-[300px]">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-lg">
                        {/* Use a simple app icon placeholder or the actual logo if we can access it via img tag */}
                        <img src="/mobile-app-icon.png" alt="RRAASI" className="w-10 h-10 rounded-md object-cover" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-foreground">Install RRAASI</span>
                        <span className="text-xs text-muted-foreground">Add to Home Screen</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        onClick={handleInstallClick}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm transition-all active:scale-95"
                    >
                        Install
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-full"
                        onClick={() => setIsVisible(false)}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Dismiss</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
