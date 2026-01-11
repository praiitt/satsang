'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/livekit/button';
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { CorporateService } from '@/lib/services/corporate-service';
import { useAuth } from '@/components/auth/auth-provider';

function JoinPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const { user, signInWithGoogle } = useAuth();

    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!user) return; // Wait for login
        if (status !== 'idle') return; // Don't run twice

        if (token) {
            handleJoin(token);
        }
    }, [user, token, status]);

    const handleJoin = async (token: string) => {
        try {
            setStatus('processing');
            await CorporateService.joinOrganization(token);
            setStatus('success');
            setTimeout(() => {
                router.push('/corporate/dashboard');
            }, 2000);
        } catch (err: any) {
            console.error('Join error:', err);
            setStatus('error');
            setErrorMessage(err.message || 'Failed to join organization');
        }
    };

    const [email, setEmail] = useState('');

    const handleDomainJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setStatus('processing');
            // We need to ensure the user is logged in with this email, 
            // but for now we assume they are logged in and we trust the auth token's email.
            // OR we pass the email to check if it matches the domain logic.
            // The backend uses req.user.email to verify the domain.

            await CorporateService.joinOrganization(undefined, true);
            setStatus('success');
            setTimeout(() => {
                router.push('/corporate/dashboard');
            }, 2000);
        } catch (err: any) {
            console.error('Domain join error:', err);
            setStatus('error');
            setErrorMessage(err.message || 'Failed to join organization. Please ensure you are signed in with your work email.');
        }
    };

    if (!token) {
        // Domain Join View
        if (!user) {
            return (
                <div className="max-w-md w-full bg-card border rounded-2xl p-8 shadow-xl text-center space-y-6 mx-auto">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
                        <Building2 className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Join Your Team</h1>
                        <p className="text-muted-foreground mt-2">Sign in with your work email to find your corporate sanctuary.</p>
                    </div>
                    <Button onClick={() => signInWithGoogle()} className="w-full h-12 text-lg">
                        Sign In with Work Email
                    </Button>
                </div>
            )
        }

        return (
            <div className="max-w-md w-full bg-card border rounded-2xl p-8 shadow-xl text-center mx-auto space-y-6">
                {status === 'idle' && (
                    <>
                        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
                            <Building2 className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Find Your Organization</h1>
                            <p className="text-muted-foreground mt-2">
                                We'll check if <strong>{user.email}</strong> matches a registered company.
                            </p>
                        </div>
                        <Button onClick={handleDomainJoin} className="w-full h-12 text-lg">
                            Search & Join
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            Not seeing your company? <a href="/business/signup" className="underline">Create a new organization</a>.
                        </p>
                    </>
                )}

                {status === 'processing' && (
                    <div className="space-y-4">
                        <Loader2 className="w-12 h-12 text-amber-600 animate-spin mx-auto" />
                        <h2 className="text-xl font-medium">Checking Domain...</h2>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-4">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                        <h2 className="text-xl font-medium">Organization Found!</h2>
                        <p className="text-muted-foreground">Welcome to the team. Redirecting...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-4">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                        <h2 className="text-xl font-medium">Unable to Join</h2>
                        <p className="text-red-500/80 text-sm">{errorMessage}</p>
                        <Button onClick={() => setStatus('idle')} variant="outline">
                            Try Again
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    if (!user) {
        return (
            <div className="max-w-md w-full bg-card border rounded-2xl p-8 shadow-xl text-center space-y-6 mx-auto">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">You've been invited!</h1>
                    <p className="text-muted-foreground mt-2">Sign in to accept your invitation to the corporate sanctuary.</p>
                </div>
                <Button onClick={() => signInWithGoogle()} className="w-full h-12 text-lg">
                    Sign In to Accept
                </Button>
            </div>
        )
    }

    return (
        <div className="max-w-md w-full bg-card border rounded-2xl p-8 shadow-xl text-center mx-auto">
            {status === 'processing' && (
                <div className="space-y-4">
                    <Loader2 className="w-12 h-12 text-amber-600 animate-spin mx-auto" />
                    <h2 className="text-xl font-medium">Joining Organization...</h2>
                </div>
            )}

            {status === 'success' && (
                <div className="space-y-4">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                    <h2 className="text-xl font-medium">Welcome to the Team!</h2>
                    <p className="text-muted-foreground">Redirecting to your dashboard...</p>
                </div>
            )}

            {status === 'error' && (
                <div className="space-y-4">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                    <h2 className="text-xl font-medium">Something went wrong</h2>
                    <p className="text-red-500/80 text-sm">{errorMessage}</p>
                    <Button onClick={() => handleJoin(token)} variant="outline">
                        Try Again
                    </Button>
                </div>
            )}
        </div>
    );
}

export default function JoinPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-background dark:to-background flex items-center justify-center p-4">
            <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin" />}>
                <JoinPageContent />
            </Suspense>
        </div>
    )
}
