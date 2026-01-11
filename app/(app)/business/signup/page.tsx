'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/livekit/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { CorporateService } from '@/lib/services/corporate-service';
import { useAuth } from '@/components/auth/auth-provider';

export default function CorporateSignupPage() {
    const router = useRouter();
    const { user, signUpWithEmail } = useAuth();
    const [companyName, setCompanyName] = useState('');
    const [workEmail, setWorkEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!user) {
                // If not logged in, create user first
                if (!password) {
                    throw new Error("Password is required");
                }
                await signUpWithEmail(workEmail, password);
                // User is now logged in via session cookie (handled in AuthProvider)
            }

            await CorporateService.createOrganization(companyName, workEmail);
            router.push('/corporate/dashboard');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to create organization');
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-background dark:to-background flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-card border rounded-2xl p-8 shadow-xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Building2 className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h1 className="text-2xl font-bold">Create Organization</h1>
                    <p className="text-muted-foreground mt-2">
                        Set up your dedicated spiritual wellness workspace.
                    </p>
                </div>

                <form onSubmit={handleSignup} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name</Label>
                        <Input
                            id="companyName"
                            placeholder="Acme Corp"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            required
                            className="h-12"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="workEmail">Work Email</Label>
                        <Input
                            id="workEmail"
                            type="email"
                            placeholder="you@acme.com"
                            value={workEmail}
                            onChange={(e) => setWorkEmail(e.target.value)}
                            required
                            className="h-12"
                        />
                        <p className="text-xs text-muted-foreground">
                            We use your email domain to auto-verify employees.
                        </p>
                    </div>

                    {!user && (
                        <div className="space-y-2">
                            <Label htmlFor="password">Create Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-12"
                                minLength={6}
                            />
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full h-12 text-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                        disabled={loading}
                    >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {user ? 'Create Workspace' : 'Sign Up & Create Workspace'} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>

                    {!user && (
                        <div className="text-center text-sm">
                            <p className="text-muted-foreground">
                                Already have an account?{' '}
                                <button type="button" onClick={() => router.push('/login')} className="text-amber-600 hover:underline">
                                    Log in
                                </button>
                            </p>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
