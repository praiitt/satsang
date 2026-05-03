'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import {
  RefreshCw, MessageCircle, PhoneCall, CheckCircle, 
  Trash2, QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface UserLead {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  createdAt: string;
  callInitiatedAt?: number;
  lastCallAnalysis?: string;
  callRecordingUrl?: string;
  callDuration?: string | number;
  waSent?: boolean;
  waFailed?: boolean;
}

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_SERVER_URL || 'http://localhost:4001';

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const fetchUsers = useCallback(async (currentPage: number) => {
    if (!user) return; // Don't fetch if not logged in
    setLoading(true);
    try {
      // Get the current user's ID token to authenticate with the API
      const token = await getAuth().currentUser?.getIdToken();
      const res = await fetch(`/api/admin/users?page=${currentPage}&limit=50`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.status === 401) {
         toast.error('Unauthorized access');
         router.push('/');
         return;
      }
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (e) {
      console.error('Failed to fetch users:', e);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }
    if (user) {
      fetchUsers(page);
    }
  }, [fetchUsers, page, user, authLoading, router]);

  // ── Single actions ─────────────────────────────────────────────────────────

  const makeCall = async (user: UserLead) => {
    if (!user.phoneNumber) { toast.warning('No phone number'); return; }
    setActionLoading(`call-${user.uid}`);
    try {
      const res = await fetch(`${MARKETING_URL}/users/${user.uid}/call`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Call initiated via Vobiz to ${user.phoneNumber}`);
      fetchUsers(page);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const sendWA = async (user: UserLead) => {
    if (!user.phoneNumber) { toast.warning('No phone number'); return; }
    setActionLoading(`wa-${user.uid}`);
    try {
      const res = await fetch(`${MARKETING_URL}/users/${user.uid}/send-whatsapp`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'twilio' }) // Using Twilio as default since Vobiz isn't ready
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`WhatsApp sent to ${user.phoneNumber}`);
      fetchUsers(page);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">👤 Registered Users ({total})</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage app users, call via AI, and send WhatsApp updates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="dotted" onClick={() => fetchUsers(page)} disabled={loading} className="text-amber-500 border-amber-500/30">
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} /> Refresh
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-gray-500 font-medium whitespace-nowrap">User Name</th>
              <th className="px-4 py-3 text-gray-500 font-medium whitespace-nowrap">Contact</th>
              <th className="px-4 py-3 text-gray-500 font-medium whitespace-nowrap">Status</th>
              <th className="px-4 py-3 text-gray-500 font-medium whitespace-nowrap text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {users.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">
                {loading ? 'Loading users...' : 'No users found.'}
              </td></tr>
            )}
            {users.map(user => (
              <tr key={user.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                
                {/* User details */}
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-900 dark:text-white">{user.displayName || 'Unknown'}</div>
                  <div className="text-xs text-gray-400 mt-0.5">ID: <span className="font-mono text-[10px]">{user.uid}</span></div>
                  <div className="text-xs text-gray-400 mt-0.5">Joined: {new Date(user.createdAt).toLocaleDateString()}</div>
                </td>

                {/* Contact */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    {user.phoneNumber ? (
                      <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded w-fit">
                        {user.phoneNumber}
                      </span>
                    ) : <span className="text-xs text-gray-400">No phone</span>}
                    {user.email && (
                      <span className="text-xs text-gray-500">{user.email}</span>
                    )}
                  </div>
                </td>

                {/* Status / Call Analysis */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1.5">
                    <span
                      title={user.waFailed ? 'WA Failed' : user.waSent ? 'WhatsApp sent' : 'WA not sent'}
                      className={cn('inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold w-fit',
                        user.waFailed
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30'
                          : user.waSent
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                      )}
                    >
                      <MessageCircle className="w-3 h-3" />
                      {user.waFailed ? 'WA Failed' : user.waSent ? 'WA Sent' : 'WA Pending'}
                    </span>

                    {/* Call Analysis Badge */}
                    {user.callInitiatedAt && (
                      <span
                        title={user.lastCallAnalysis || 'Call was made — analysis pending'}
                        className={cn('inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold w-fit max-w-[180px] truncate',
                          !user.lastCallAnalysis
                            ? 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                            : user.lastCallAnalysis.toLowerCase().includes('not interested')
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 ring-1 ring-red-300'
                              : user.lastCallAnalysis.toLowerCase().includes('follow')
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 ring-1 ring-yellow-300'
                                : 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 ring-1 ring-teal-300'
                        )}
                      >
                        <PhoneCall className="w-3 h-3 shrink-0" />
                        <span className="truncate">{user.lastCallAnalysis || 'Called'}</span>
                      </span>
                    )}
                    
                    {/* Call Recording Player */}
                    {user.callRecordingUrl && (
                      <div className="mt-1 flex items-center gap-2 max-w-[200px]">
                        <audio 
                          controls 
                          src={user.callRecordingUrl} 
                          className="h-8 w-full max-w-[200px] rounded-lg"
                          title="Call Recording"
                        />
                        {user.callDuration && (
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {user.callDuration}s
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right align-top">
                  <div className="flex flex-col items-end gap-1.5">
                    <button
                      onClick={() => sendWA(user)}
                      disabled={!!actionLoading || !user.phoneNumber || (user.waSent && !user.waFailed)}
                      className={cn(
                        'inline-flex justify-center items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all',
                        (user.waSent && !user.waFailed)
                          ? 'bg-emerald-100 text-emerald-500 dark:bg-emerald-900/10 cursor-default'
                          : user.waFailed
                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                            : !user.phoneNumber
                              ? 'bg-gray-100 text-gray-300 dark:bg-gray-800 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow'
                      )}
                    >
                      {actionLoading === `wa-${user.uid}`
                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                        : <MessageCircle className="w-3 h-3" />}
                      {user.waSent && !user.waFailed ? 'WA Sent' : user.waFailed ? 'Retry WA' : 'Send WhatsApp'}
                    </button>

                    <button
                      onClick={() => makeCall(user)}
                      disabled={!!actionLoading || !user.phoneNumber}
                      className="inline-flex justify-center items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white shadow-sm hover:shadow disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {actionLoading === `call-${user.uid}`
                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                        : <PhoneCall className="w-3 h-3" />}
                      Vobiz Call
                    </button>
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="text-sm border-gray-200 dark:border-gray-700"
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="text-sm border-gray-200 dark:border-gray-700"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
