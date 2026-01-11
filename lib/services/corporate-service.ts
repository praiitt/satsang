import { db, getFirebaseAuth } from '@/lib/firebase-client';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    Timestamp,
    serverTimestamp,
    updateDoc
} from 'firebase/firestore';
import { Organization, OrganizationEmployee, EmployeeRole } from '@/lib/types/corporate';

const ORGS_COLLECTION = 'organizations';
const EMPLOYEES_COLLECTION = 'organization_employees'; // Kept for legacy/caching if needed, though mostly using users collection now?
// Actually, backend uses 'users' collection updates now. 
// So 'getEmployees' needs to query 'users' collection where organizationId == orgId.

const AUTH_SERVER_URL = process.env.NEXT_PUBLIC_AUTH_SERVER_URL || 'http://localhost:4000';

export class CorporateService {

    // --- API Calls (Mutations) ---

    static async createOrganization(name: string, workEmail: string): Promise<Organization> {
        const auth = getFirebaseAuth();
        const token = await auth.currentUser?.getIdToken();

        const res = await fetch(`${AUTH_SERVER_URL}/corporate/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, workEmail })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create organization');
        }
        return await res.json();
    }

    static async inviteEmployee(orgId: string, email: string, role: string): Promise<{ inviteLink: string, token: string }> {
        const auth = getFirebaseAuth();
        const token = await auth.currentUser?.getIdToken();

        const res = await fetch(`${AUTH_SERVER_URL}/corporate/${orgId}/invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ email, role })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to invite employee');
        }
        return await res.json();
    }

    static async joinOrganization(token?: string, domainJoin?: boolean): Promise<{ success: boolean, organizationId: string }> {
        const auth = getFirebaseAuth();
        const idToken = await auth.currentUser?.getIdToken();

        const res = await fetch(`${AUTH_SERVER_URL}/corporate/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ token, domainJoin })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to join organization');
        }
        return await res.json();
    }

    // --- Read Operations (Firestore Direct) ---

    static async getOrganization(orgId: string): Promise<Organization | null> {
        try {
            if (!db) return null;
            const ref = doc(db, ORGS_COLLECTION, orgId);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                return { id: snap.id, ...snap.data() } as Organization;
            }
            return null;
        } catch (error) {
            console.error("Error fetching organization:", error);
            return null;
        }
    }

    static async getOrganizationByAdmin(uid: string): Promise<Organization[]> {
        try {
            if (!db) return [];
            const q = query(
                collection(db, ORGS_COLLECTION),
                where('adminIds', 'array-contains', uid) // Updated to adminIds
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as Organization));
        } catch (error) {
            console.error("Error fetching admin orgs:", error);
            return [];
        }
    }

    // --- Employee List ---

    static async getEmployees(orgId: string): Promise<any[]> {
        try {
            if (!db) return [];
            // Query 'users' collection directly now
            const q = query(
                collection(db, 'users'),
                where('organizationId', '==', orgId)
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
        } catch (error) {
            console.error("Error fetching employees:", error);
            return [];
        }
    }

    // --- User Organization Lookup ---

    static async getUserOrganizations(uid: string): Promise<Organization[]> {
        try {
            if (!db) return [];

            // 1. Where user is Admin
            const adminOrgs = await this.getOrganizationByAdmin(uid);

            // 2. Where user is Employee (check user profile)
            const userDoc = await getDoc(doc(db, 'users', uid));
            const userData = userDoc.data();

            const employeeOrgs: Organization[] = [];
            if (userData?.organizationId) {
                const org = await this.getOrganization(userData.organizationId);
                if (org) employeeOrgs.push(org);
            }

            // Combine and deduplicate
            const allOrgs = [...adminOrgs, ...employeeOrgs];
            const uniqueOrgs = Array.from(
                new Map(allOrgs.map(org => [org.id, org])).values()
            );

            return uniqueOrgs;
        } catch (error) {
            console.error("Error getting user organizations:", error);
            return [];
        }
    }

    // --- Analytics (Mock/Real Mix) ---

    static async getOrganizationStats(orgId: string) {
        const org = await this.getOrganization(orgId);
        if (!org) return null;

        const employees = await this.getEmployees(orgId);

        return {
            totalEmployees: employees.length,
            activeEmployees: employees.length, // Placeholder logic
            credits: org.credits || 0,
            vibrationScore: 785,
            vibrationTrend: 12
        };
    }
}
