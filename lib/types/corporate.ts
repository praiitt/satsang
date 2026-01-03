import { Timestamp } from 'firebase/firestore';

export type OrganizationSubscriptionStatus = 'active' | 'trial' | 'past_due' | 'canceled';

export interface Organization {
    id: string;
    name: string;
    slug?: string; // e.g. "acme-corp" for URLs
    domains: string[]; // e.g. ["acme.com"]
    adminUids: string[]; // List of firebase UIDs who are admins

    // Wellness / Credits
    credits: number; // Available pooled credits
    totalEmployees: number; // Cached counter

    // Subscription
    subscriptionStatus: OrganizationSubscriptionStatus;
    subscriptionPlan?: string; // 'starter', 'enterprise'

    // Metadata
    createdAt: Timestamp;
    updatedAt: Timestamp;
    logoUrl?: string; // Optional branding
}

export type EmployeeRole = 'employee' | 'admin';
export type EmployeeStatus = 'active' | 'invited' | 'disabled';

export interface OrganizationEmployee {
    id: string; // Auto-generated
    orgId: string;

    email: string;
    uid?: string; // Null if invited but not yet registered/linked

    role: EmployeeRole;
    status: EmployeeStatus;

    // Personal allocation (if not using shared pool)
    personalCredits: number;

    // Metadata
    firstName?: string;
    lastName?: string;
    department?: string;

    invitedAt: Timestamp;
    joinedAt?: Timestamp;
}

export interface VibrationScoreHistory {
    date: string; // ISO Date YYYY-MM-DD
    score: number; // 0-1000
    categoryScores?: {
        stress: number;
        focus: number;
        positivity: number;
    };
}
