import { db } from '@/lib/firebase-client';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    addDoc,
    updateDoc,
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';
import { Organization, OrganizationEmployee, EmployeeRole } from '@/lib/types/corporate';

const ORGS_COLLECTION = 'organizations';
const EMPLOYEES_COLLECTION = 'organization_employees';

export class CorporateService {

    // --- Organization Operations ---

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
                where('adminUids', 'array-contains', uid)
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as Organization));
        } catch (error) {
            console.error("Error fetching admin orgs:", error);
            return [];
        }
    }

    // --- Employee Operations ---

    static async getEmployees(orgId: string): Promise<OrganizationEmployee[]> {
        try {
            if (!db) return [];
            const q = query(
                collection(db, EMPLOYEES_COLLECTION),
                where('orgId', '==', orgId)
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as OrganizationEmployee));
        } catch (error) {
            console.error("Error fetching employees:", error);
            return [];
        }
    }

    static async inviteEmployee(
        orgId: string,
        email: string,
        role: EmployeeRole = 'employee'
    ): Promise<string | null> {
        try {
            if (!db) return null;

            // Check if already exists
            const q = query(
                collection(db, EMPLOYEES_COLLECTION),
                where('orgId', '==', orgId),
                where('email', '==', email)
            );
            const existing = await getDocs(q);
            if (!existing.empty) {
                throw new Error('Employee already exists');
            }

            const newEmployee: Partial<OrganizationEmployee> = {
                orgId,
                email,
                role,
                status: 'invited',
                personalCredits: 0,
                invitedAt: Timestamp.now(),
            };

            const ref = await addDoc(collection(db, EMPLOYEES_COLLECTION), newEmployee);
            return ref.id;
        } catch (error) {
            console.error("Error inviting employee:", error);
            throw error;
        }
    }

    // --- Analytics ---

    static async getOrganizationStats(orgId: string) {
        const org = await this.getOrganization(orgId);
        if (!org) return null;

        // Get real employee count if not cached
        // In prod, this should be a distributed counter or cloud function trigger
        const employeesRef = collection(db, EMPLOYEES_COLLECTION);
        const q = query(employeesRef, where('orgId', '==', orgId));
        const snapshot = await getDocs(q);

        return {
            totalEmployees: snapshot.size,
            activeEmployees: snapshot.docs.filter(d => d.data().status === 'active').length,
            credits: org.credits,
            vibrationScore: 785, // Mock for now, would be an aggregation of sessions
            vibrationTrend: 5 // Mock %
        };
    }

    static async getVibrationHistory(orgId: string) {
        // Return mock data for visualization
        return [
            { date: '2024-01-01', score: 720 },
            { date: '2024-02-01', score: 745 },
            { date: '2024-03-01', score: 730 },
            { date: '2024-04-01', score: 780 },
            { date: '2024-05-01', score: 810 },
            { date: '2024-06-01', score: 842 },
        ];
    }
}
