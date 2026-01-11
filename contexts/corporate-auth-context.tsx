'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { CorporateService } from '@/lib/services/corporate-service';
import { Organization } from '@/lib/types/corporate';

interface CorporateAuthContextType {
    organizations: Organization[];
    selectedOrg: Organization | null;
    isLoading: boolean;
    selectOrganization: (orgId: string) => void;
    refreshOrganizations: () => Promise<void>;
    isOrgAdmin: (orgId?: string) => boolean;
}

const CorporateAuthContext = createContext<CorporateAuthContextType | undefined>(undefined);

export function CorporateAuthProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadOrganizations = async () => {
        if (!user?.uid) {
            setOrganizations([]);
            setSelectedOrg(null);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const orgs = await CorporateService.getUserOrganizations(user.uid);
            setOrganizations(orgs);

            // Auto-select first org or restore from localStorage
            if (orgs.length > 0) {
                const savedOrgId = typeof window !== 'undefined'
                    ? localStorage.getItem('selectedOrgId')
                    : null;

                const orgToSelect = savedOrgId
                    ? orgs.find(o => o.id === savedOrgId) || orgs[0]
                    : orgs[0];

                setSelectedOrg(orgToSelect);
            }
        } catch (error) {
            console.error('Error loading organizations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadOrganizations();
    }, [user?.uid]);

    const selectOrganization = (orgId: string) => {
        const org = organizations.find(o => o.id === orgId);
        if (org) {
            setSelectedOrg(org);
            if (typeof window !== 'undefined') {
                localStorage.setItem('selectedOrgId', orgId);
            }
        }
    };

    const refreshOrganizations = async () => {
        await loadOrganizations();
    };

    const isOrgAdmin = (orgId?: string): boolean => {
        if (!user?.uid) return false;
        const targetOrgId = orgId || selectedOrg?.id;
        if (!targetOrgId) return false;

        const org = organizations.find(o => o.id === targetOrgId);
        return org ? (org.adminIds || []).includes(user.uid) : false;
    };

    return (
        <CorporateAuthContext.Provider
            value={{
                organizations,
                selectedOrg,
                isLoading,
                selectOrganization,
                refreshOrganizations,
                isOrgAdmin
            }}
        >
            {children}
        </CorporateAuthContext.Provider>
    );
}

export function useCorporateAuth() {
    const context = useContext(CorporateAuthContext);
    if (context === undefined) {
        throw new Error('useCorporateAuth must be used within a CorporateAuthProvider');
    }
    return context;
}
