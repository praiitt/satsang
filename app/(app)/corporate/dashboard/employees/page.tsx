'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/livekit/button';
import {
    Plus,
    Upload,
    Search,
    MoreVertical,
    Mail,
    CheckCircle2,
    Clock
} from 'lucide-react';
import type { OrganizationEmployee } from '@/lib/types/corporate';
import { BulkUploadCsv } from '@/components/app/corporate/bulk-upload-csv';
import { useCorporateAuth } from '@/contexts/corporate-auth-context';

export default function EmployeesPage() {
    const { selectedOrg } = useCorporateAuth();
    const [employees, setEmployees] = useState<OrganizationEmployee[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    useEffect(() => {
        if (selectedOrg) {
            loadEmployees();
        }
    }, [selectedOrg]);

    const loadEmployees = async () => {
        if (!selectedOrg) return;

        try {
            setLoading(true);
            // Dynamic import to avoid SSR issues with Firestore
            const { CorporateService } = await import('@/lib/services/corporate-service');
            const data = await CorporateService.getEmployees(selectedOrg.id);
            setEmployees(data);
        } catch (err) {
            console.error("Failed to load employees", err);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkUpload = async (emails: string[]) => {
        if (!selectedOrg) return;

        try {
            const { CorporateService } = await import('@/lib/services/corporate-service');
            // Process invites in parallel
            await Promise.all(emails.map(email =>
                CorporateService.inviteEmployee(selectedOrg.id, email)
            ));

            // Refresh list
            loadEmployees();
            setIsUploadOpen(false);
        } catch (err) {
            console.error("Upload failed", err);
            alert("Failed to upload invitations. Please try again.");
        }
    };

    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');

    const handleInvite = async () => {
        if (!selectedOrg || !inviteEmail) return;

        try {
            setLoading(true);
            const { CorporateService } = await import('@/lib/services/corporate-service');
            await CorporateService.inviteEmployee(selectedOrg.id, inviteEmail);

            setInviteEmail('');
            setIsInviteOpen(false);
            loadEmployees();
            alert(`Invitation sent to ${inviteEmail}`);
        } catch (err: any) {
            console.error("Invite failed", err);
            alert(err.message || "Failed to send invitation.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage access and view wellness status for your team.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setIsUploadOpen(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Bulk Upload CSV
                    </Button>
                    <Button onClick={() => setIsInviteOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Employee
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search employees..."
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                        <tr>
                            <th className="px-6 py-4 font-medium">Name / Email</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium">Role</th>
                            <th className="px-6 py-4 font-medium">Joined</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {employees.map((emp) => (
                            <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-xs uppercase">
                                            {emp.firstName ? emp.firstName[0] + (emp.lastName?.[0] || '') : emp.email[0]}
                                        </div>
                                        <div>
                                            {emp.firstName && (
                                                <div className="font-medium text-foreground">
                                                    {emp.firstName} {emp.lastName}
                                                </div>
                                            )}
                                            <div className="text-muted-foreground">{emp.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${emp.status === 'active'
                                        ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                        : 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800'
                                        }`}>
                                        {emp.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                        <span className="capitalize">{emp.status}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="capitalize text-muted-foreground">{emp.role}</span>
                                </td>
                                <td className="px-6 py-4 text-muted-foreground">
                                    {emp.joinedAt ? new Date(emp.joinedAt.seconds * 1000).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted">
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* CSV Upload Overlay */}
            {isUploadOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <BulkUploadCsv
                        onCancel={() => setIsUploadOpen(false)}
                        onUpload={handleBulkUpload}
                    />
                </div>
            )}

            {/* Invite Employee Overlay */}
            {isInviteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-md p-6 rounded-xl border shadow-xl space-y-4">
                        <h2 className="text-xl font-bold">Invite Employee</h2>
                        <p className="text-sm text-muted-foreground">
                            Send an email invitation to a new team member.
                        </p>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email Address</label>
                            <input
                                type="email"
                                placeholder="colleague@company.com"
                                className="w-full px-3 py-2 rounded-md border bg-background"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleInvite} disabled={!inviteEmail || loading}>
                                {loading ? 'Sending...' : 'Send Invite'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
