'use client';

import React from 'react';
import { Logo } from '@/components/ui/logo';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';

export default function DataDeletionPage() {
    return (
        <div className="bg-background min-h-screen">
            <header className="border-border/40 bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
                <div className="container flex h-14 max-w-screen-2xl items-center">
                    <Link href="/" className="mr-6 flex items-center space-x-2">
                        <Logo className="h-6 w-6" />
                        <span className="font-bold sm:inline-block">RRAASI</span>
                    </Link>
                </div>
            </header>

            <main className="container max-w-3xl py-12 md:py-24">
                <Link
                    href="/"
                    className="text-muted-foreground hover:text-foreground mb-8 flex items-center gap-2 text-sm transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                </Link>

                <h1 className="text-foreground mb-8 text-3xl font-bold tracking-tight lg:text-4xl">
                    User Data Deletion Instructions
                </h1>

                <div className="prose prose-gray dark:prose-invert max-w-none">
                    <p className="lead">
                        In compliance with Facebook Platform rules, we provide the following instructions for users who wish to delete their data from our applications and services.
                    </p>

                    <h3>How to Request Data Deletion</h3>
                    <p>
                        If you have signed up for RRAASI using Facebook Login and would like to request the deletion of your user data, please follow these steps:
                    </p>

                    <ol>
                        <li>
                            Send an email to our Data Protection Team at <a href="mailto:support@rraasi.com" className="text-primary hover:underline">support@rraasi.com</a>.
                        </li>
                        <li>
                            Subject Line: Please use <strong>"Data Deletion Request"</strong> as the subject status.
                        </li>
                        <li>
                            In the email body, please include:
                            <ul>
                                <li>Your full name</li>
                                <li>The email address associated with your account</li>
                                <li>A statement confirming your request to delete your account and associated data.</li>
                            </ul>
                        </li>
                    </ol>

                    <h3>Automated Deletion via Facebook Settings</h3>
                    <p>
                        Alternatively, you can remove the app authorization via your Facebook settings, which stops further data sharing. However, to delete previously collected data, you must contact us via the email above.
                    </p>
                    <ol>
                        <li>Go to your Facebook Account's "Settings & Privacy".</li>
                        <li>Click "Settings".</li>
                        <li>Scroll down to "Apps and Websites".</li>
                        <li>Find "RRAASI" in the list.</li>
                        <li>Click "Remove".</li>
                    </ol>

                    <h3>Data Retention Policy</h3>
                    <p>
                        Once we receive your validated deletion request, we will process the deletion of your personal data from our active databases within 30 days. Some data may remain in our backups for a limited period until they are overwritten.
                    </p>
                </div>
            </main>

            <footer className="border-border/40 py-6 md:px-8 md:py-0">
                <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
                    <p className="text-muted-foreground text-balanced text-center text-sm leading-loose md:text-left">
                        Built by RRAASI AI.
                    </p>
                </div>
            </footer>
        </div>
    );
}
