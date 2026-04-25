'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Upload, RefreshCw, MessageCircle, Mail, UserPlus,
  CheckCircle, AlertCircle, Clock, Users, Zap, Pause,
  Play, Trash2, Download, ChevronRight, QrCode, XCircle, Loader2, PhoneCall, Music, BookOpen
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast, Toaster } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FbLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  category?: string | null;
  status: 'new' | 'registered' | 'contacted';
  registeredInAuth: boolean;
  waSent: boolean;
  waFailed?: boolean;
  waError?: string;
  emailSent: boolean;
  emailFailed?: boolean;
  emailError?: string;
  discoveredAt: number;
  firebaseUid?: string;
  callInitiatedAt?: number;
  lastCallAnalysis?: string;
}

interface ProgressEvent {
  type: string;
  leadId?: string;
  name?: string;
  email?: string;
  phone?: string;
  uid?: string;
  sent?: number;
  failed?: number;
  done?: number;
  total?: number;
  batch?: number;
  totalBatches?: number;
  seconds?: number;
  nextBatch?: number;
  error?: string;
  reason?: string;
  note?: string;
}

interface BulkProgress {
  running: boolean;
  paused: boolean;
  type: 'wa' | 'email' | 'register' | null;
  sent: number;
  failed: number;
  total: number;
  currentBatch: number;
  totalBatches: number;
  waitingSeconds: number;
  log: string[];
  completed: boolean;
}

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_SERVER_URL || 'http://localhost:4001';
const WA_SERVICE_URL = process.env.NEXT_PUBLIC_WA_SERVICE_URL || 'http://localhost:4002';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ lead }: { lead: FbLead }) {
  if (lead.status === 'registered') {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">✅ Registered</span>;
  }
  if (lead.status === 'contacted') {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">📨 Contacted</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">🆕 New</span>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FacebookLeadsPage() {
  const [leads, setLeads] = useState<FbLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({ name: '', email: '', phone: '', category: 'general' });
  const [addFormLoading, setAddFormLoading] = useState(false);
  const [addFormError, setAddFormError] = useState('');
  const [progress, setProgress] = useState<BulkProgress>({
    running: false, paused: false, type: null,
    sent: 0, failed: 0, total: 0, currentBatch: 0, totalBatches: 0,
    waitingSeconds: 0, log: [], completed: false,
  });
  const [waStatus, setWaStatus] = useState({ connected: false, qrPending: false });
  const [waQrCode, setWaQrCode] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  // ── Transcript Modal State ──────────────────────────────────────────────────
  const [transcriptLead, setTranscriptLead] = useState<FbLead | null>(null);
  const [transcriptData, setTranscriptData] = useState<any[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  // ── Category / Tabs ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'all' | 'satsang' | 'music' | 'general'>('all');
  const [uploadCategory, setUploadCategory] = useState<'general' | 'satsang' | 'music'>('general');
  // ── Pagination ─────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch leads ────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/facebook-leads');
      const data = await res.json();
      setLeads(data.items || []);
    } catch (e) {
      console.error('Failed to fetch facebook leads:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWaStatus = useCallback(async () => {
    try {
      const res = await fetch(`${WA_SERVICE_URL}/all-info`);
      if (!res.ok) throw new Error('Service unreachable');
      const data = await res.json();
      setWaStatus({ connected: data.connected, qrPending: data.qrPending });
      setWaQrCode(data.qr);
    } catch {
      setWaStatus({ connected: false, qrPending: false });
    }
  }, []);

  useEffect(() => { 
    fetchLeads();
    fetchWaStatus();
    const interval = setInterval(fetchWaStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchLeads, fetchWaStatus]);

  // ── CSV Import ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', uploadCategory);

    setActionLoading('import');
    try {
      const res = await fetch('/api/facebook-leads/import-csv', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      const updated = (data.skippedItems || []).filter((s: any) => s.reason?.includes('category updated')).length;
      const skippedCount = data.skipped - updated;
      const desc = [
        updated > 0 && `${updated} category tagged`,
        skippedCount > 0 && `${skippedCount} already existed`,
      ].filter(Boolean).join(' · ');
      toast.success(`Imported ${data.imported} leads!`, { description: desc || undefined });
      fetchLeads();
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setActionLoading(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Select All ─────────────────────────────────────────────────────────────
  const toggleSelectAll = () => {
    if (selected.size === filteredLeads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Single actions ─────────────────────────────────────────────────────────
  const registerLead = async (lead: FbLead) => {
    if (!lead.email) { toast.warning('No email for this lead'); return; }
    setActionLoading(`reg-${lead.id}`);
    try {
      const res = await fetch(`/api/facebook-leads/${lead.id}/register`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.alreadyExists) {
        toast.warning('User already exists in Firebase Auth');
      } else {
        toast.success(`Registered ${lead.email}`);
      }
      fetchLeads();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const sendWA = async (lead: FbLead) => {
    if (!lead.phone) { toast.warning('No phone number for this lead'); return; }
    setActionLoading(`wa-${lead.id}`);
    try {
      const res = await fetch(`/api/facebook-leads/${lead.id}/send-whatsapp`, { method: 'POST' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success(`WhatsApp sent to ${lead.name}!`);
      fetchLeads();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const initiateCall = async (lead: FbLead) => {
    if (!lead.phone) { toast.warning('No phone number for this lead'); return; }
    setActionLoading(`call-${lead.id}`);
    try {
      const res = await fetch(`/api/facebook-leads/${lead.id}/call`, { method: 'POST' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success(`📞 Call initiated to ${lead.name}!`, { description: 'They should be receiving a call right now.' });
      fetchLeads();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const viewTranscript = async (lead: FbLead) => {
    setTranscriptLead(lead);
    setTranscriptLoading(true);
    setTranscriptData([]);
    try {
      const res = await fetch(`/api/facebook-leads/${lead.id}/interactions`);
      const data = await res.json();
      setTranscriptData(data.interactions || []);
    } catch {
      setTranscriptData([]);
    } finally {
      setTranscriptLoading(false);
    }
  };

  const sendEmail = async (lead: FbLead) => {
    if (!lead.email) { toast.warning('No email for this lead'); return; }
    setActionLoading(`email-${lead.id}`);
    try {
      const res = await fetch(`/api/facebook-leads/${lead.id}/send-email`, { method: 'POST' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success(`Email sent to ${lead.email}!`);
      fetchLeads();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteLead = async (lead: FbLead) => {
    if (!confirm(`Delete ${lead.name}?`)) return;
    await fetch(`/api/facebook-leads/${lead.id}`, { method: 'DELETE' });
    fetchLeads();
  };

  // ── Add Lead Manually ─────────────────────────────────────────────────────
  const addLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError('');
    const { name, email, phone } = addFormData;
    if (!name.trim()) return setAddFormError('Name is required');
    if (!email.trim() && !phone.trim()) return setAddFormError('Enter at least email or phone');

    setAddFormLoading(true);
    try {
      const res = await fetch('/api/facebook-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim(), category: addFormData.category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add lead');
      setAddFormData({ name: '', email: '', phone: '', category: 'general' });
      setShowAddForm(false);
      fetchLeads();
    } catch (err: any) {
      setAddFormError(err.message);
    } finally {
      setAddFormLoading(false);
    }
  };

  // ── Bulk SSE Action ────────────────────────────────────────────────────────
  const runBulkAction = async (type: 'wa' | 'email' | 'register') => {
    const ids = Array.from(selected);
    if (ids.length === 0) { toast.warning('Select at least one lead'); return; }

    const endpoints: Record<string, string> = {
      wa: '/api/facebook-leads/bulk-send-whatsapp',
      email: '/api/facebook-leads/bulk-send-email',
      register: '/api/facebook-leads/bulk-register',
    };

    abortRef.current = new AbortController();

    setProgress({
      running: true, paused: false, type, completed: false,
      sent: 0, failed: 0, total: ids.length,
      currentBatch: 0, totalBatches: Math.ceil(ids.length / 10),
      waitingSeconds: 0, log: [],
    });

    try {
      const res = await fetch(endpoints[type], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: ids }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error('Stream failed to start');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const dataLine = line.replace(/^data: /, '').trim();
          if (!dataLine) continue;

          try {
            const evt: ProgressEvent = JSON.parse(dataLine);
            handleProgressEvent(evt);
          } catch { /* skip malformed */ }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setProgress(p => ({ ...p, log: [...p.log, `❌ Stream error: ${e.message}`] }));
      }
    } finally {
      setProgress(p => ({ ...p, running: false, completed: true }));
      if (timerRef.current) clearInterval(timerRef.current);
      fetchLeads();
    }
  };

  const handleProgressEvent = (evt: ProgressEvent) => {
    setProgress(p => {
      const newLog = [...p.log];

      if (evt.type === 'start') {
        newLog.push(`🚀 Starting ${evt.total} messages...`);
        return { ...p, total: evt.total || p.total, totalBatches: evt.batches || p.totalBatches, log: newLog };
      }
      if (evt.type === 'batch_start') {
        newLog.push(`📦 Batch ${evt.batch}/${evt.totalBatches} — ${evt.size} messages`);
        return { ...p, currentBatch: evt.batch || p.currentBatch, log: newLog };
      }
      if (evt.type === 'sent') {
        const key = evt.email || evt.phone || evt.uid || '';
        newLog.push(`✅ ${evt.name} ${key ? `(${key})` : ''} ${evt.note ? `— ${evt.note}` : ''}`);
        return { ...p, sent: evt.sent ?? p.sent, failed: evt.failed ?? p.failed, log: newLog };
      }
      if (evt.type === 'skip') {
        newLog.push(`⏭️ Skipped ${evt.name || evt.leadId} — ${evt.reason}`);
        return { ...p, log: newLog };
      }
      if (evt.type === 'error') {
        newLog.push(`❌ Failed ${evt.leadId}: ${evt.error}`);
        return { ...p, sent: evt.sent ?? p.sent, failed: evt.failed ?? p.failed, log: newLog };
      }
      if (evt.type === 'waiting') {
        newLog.push(`⏳ Waiting ${evt.seconds}s before Batch ${evt.nextBatch}...`);
        // Start countdown
        let remaining = evt.seconds || 45;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          remaining--;
          setProgress(pp => ({ ...pp, waitingSeconds: remaining }));
          if (remaining <= 0 && timerRef.current) clearInterval(timerRef.current);
        }, 1000);
        return { ...p, waitingSeconds: evt.seconds || 45, log: newLog };
      }
      if (evt.type === 'complete') {
        newLog.push(`🎉 Done! ${evt.sent} sent, ${evt.failed} failed.`);
        return { ...p, sent: evt.sent ?? p.sent, failed: evt.failed ?? p.failed, log: newLog, completed: true };
      }
      return p;
    });
  };

  const pauseBulk = () => {
    abortRef.current?.abort();
    setProgress(p => ({ ...p, running: false, paused: true }));
  };

  // ── Filtered Leads ─────────────────────────────────────────────────────────
  const filteredLeads = leads.filter(l => {
    // Category tab filter
    if (activeTab !== 'all') {
      const leadCat = (l.category || 'general').toLowerCase();
      if (leadCat !== activeTab) return false;
    }
    // Search filter
    return !searchQuery ||
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.phone || '').includes(searchQuery);
  });

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  // Reset to page 1 whenever search changes
  const safePage = Math.min(currentPage, totalPages);
  const paginatedLeads = filteredLeads.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    registered: leads.filter(l => l.registeredInAuth).length,
    wasSent: leads.filter(l => l.waSent).length,
    emailSent: leads.filter(l => l.emailSent).length,
    withPhone: leads.filter(l => l.phone).length,
    withEmail: leads.filter(l => l.email).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
      <Toaster position="top-right" richColors closeButton />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <a href="/admin/leads" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm flex items-center gap-1">
              Leads <ChevronRight className="w-3 h-3" />
            </a>
            <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">Facebook Leads</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">📘 Facebook Leads</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Early Access campaign — send welcome messages & register accounts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="dotted" onClick={fetchLeads} disabled={loading} className="text-amber-500 border-amber-500/30">
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} /> Refresh
          </Button>
          {/* Category picker + Import CSV */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-800 rounded-xl px-1 py-1">
            <select
              value={uploadCategory}
              onChange={e => setUploadCategory(e.target.value as any)}
              className="text-xs text-gray-600 dark:text-gray-300 bg-transparent border-none outline-none pl-2 pr-1 cursor-pointer"
            >
              <option value="general">📋 General</option>
              <option value="satsang">🧘 Satsang</option>
              <option value="music">🎵 Music</option>
            </select>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={actionLoading === 'import'}
              className="bg-indigo-600 hover:bg-indigo-700 text-white border-none text-sm px-3 py-1.5"
            >
              {actionLoading === 'import'
                ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                : <Upload className="w-4 h-4 mr-2" />}
              Import CSV
            </Button>
          </div>
          <Button
            onClick={() => { setShowAddForm(true); setAddFormError(''); }}
            className="bg-green-600 hover:bg-green-700 text-white border-none"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Add Lead
          </Button>

          <Button
            onClick={() => setShowQrModal(true)}
            variant="outline"
            className={cn(
              "border-2",
              waStatus.connected ? "border-green-500/50 text-green-600 bg-green-50 dark:bg-green-900/20" : "border-amber-500/50 text-amber-600 bg-amber-50 dark:bg-amber-900/20"
            )}
          >
            {waStatus.connected ? <CheckCircle className="w-4 h-4 mr-2" /> : <QrCode className="w-4 h-4 mr-2" />}
            {waStatus.connected ? 'WA Connected' : 'Connect WA'}
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Leads', value: stats.total, icon: <Users className="w-5 h-5 text-indigo-500" />, color: 'text-indigo-600' },
          { label: 'Registered', value: stats.registered, icon: <UserPlus className="w-5 h-5 text-purple-500" />, color: 'text-purple-600' },
          { label: 'WA Sent', value: stats.wasSent, icon: <MessageCircle className="w-5 h-5 text-green-500" />, color: 'text-green-600' },
          { label: 'Emails Sent', value: stats.emailSent, icon: <Mail className="w-5 h-5 text-blue-500" />, color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              {s.icon}
              <span className={cn('text-3xl font-bold', s.color)}>{s.value}</span>
            </div>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Bulk Progress ── */}
      {(progress.running || progress.completed) && (
        <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {progress.running
                ? <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                : <CheckCircle className="w-4 h-4 text-green-500" />}
              <span className="font-semibold text-gray-900 dark:text-white">
                {progress.type === 'wa' ? '📱 WhatsApp Campaign' : progress.type === 'email' ? '📧 Email Campaign' : '👤 Registration'}
              </span>
              <span className="text-sm text-gray-500">
                {progress.sent} sent · {progress.failed} failed · {progress.total} total
              </span>
              {progress.waitingSeconds > 0 && progress.running && (
                <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">
                  ⏳ Next batch in {progress.waitingSeconds}s
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {progress.running && (
                <Button onClick={pauseBulk} className="bg-red-50 text-red-600 hover:bg-red-100 border-none text-sm py-1">
                  <Pause className="w-3.5 h-3.5 mr-1" /> Pause
                </Button>
              )}
              {progress.completed && (
                <Button onClick={() => setProgress(p => ({ ...p, running: false, completed: false, log: [] }))}
                  className="text-gray-400 hover:text-gray-600 border-none bg-transparent text-sm py-1">
                  ✕ Close
                </Button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-100 dark:bg-gray-800">
            <div
              className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progress.total ? (progress.sent + progress.failed) / progress.total * 100 : 0}%` }}
            />
          </div>

          {/* Batch info */}
          {progress.running && progress.totalBatches > 0 && (
            <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/10 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 text-sm text-indigo-700 dark:text-indigo-300">
                <Zap className="w-4 h-4" />
                Batch {progress.currentBatch}/{progress.totalBatches} · Batches of 10 with 45s gaps
              </div>
            </div>
          )}

          {/* Log */}
          <div className="p-4 max-h-40 overflow-y-auto space-y-1 font-mono text-xs bg-gray-50 dark:bg-gray-900/50">
            {progress.log.slice(-30).map((line, i) => (
              <div key={i} className={cn('text-gray-600 dark:text-gray-400',
                line.startsWith('✅') && 'text-green-600 dark:text-green-400',
                line.startsWith('❌') && 'text-red-500',
                line.startsWith('📦') && 'text-indigo-600 dark:text-indigo-400 font-semibold',
                line.startsWith('⏳') && 'text-amber-600',
                line.startsWith('🎉') && 'text-purple-600 font-semibold text-sm',
              )}>
                {line}
              </div>
            ))}
            {progress.log.length === 0 && <p className="text-gray-400">Waiting to start...</p>}
          </div>
        </div>
      )}

      {/* ── Bulk Action Bar ── */}
      {selected.size > 0 && !progress.running && (
        <div className="mb-4 bg-indigo-600 text-white rounded-2xl px-5 py-3.5 flex flex-wrap items-center gap-3 shadow-lg">
          <span className="font-semibold">{selected.size} selected</span>
          <div className="flex-1" />
          <button
            onClick={() => runBulkAction('register')}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Register All
          </button>
          <button
            onClick={() => runBulkAction('wa')}
            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-400 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> Send WA to All
          </button>
          <button
            onClick={() => runBulkAction('email')}
            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors"
          >
            <Mail className="w-4 h-4" /> Email All
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-2 text-white/60 hover:text-white text-sm"
          >
            ✕ Clear
          </button>
        </div>
      )}

      {/* ── Category Tabs ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {([
          { key: 'all',     label: '🌐 All',      color: 'bg-indigo-600 text-white' },
          { key: 'satsang', label: '🧘 Satsang',   color: 'bg-purple-600 text-white' },
          { key: 'music',   label: '🎵 Music',     color: 'bg-pink-600 text-white' },
          { key: 'general', label: '📋 General',   color: 'bg-gray-600 text-white' },
        ] as const).map(({ key, label, color }) => {
          const count = key === 'all' ? leads.length : leads.filter(l => (l.category || 'general') === key).length;
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setCurrentPage(1); }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 shadow-sm',
                isActive ? color : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              {label}
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-semibold',
                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              )}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Search ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl px-4 py-3 mb-4 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <span className="text-gray-400">🔍</span>
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
        />
        <span className="text-xs text-gray-400">{filteredLeads.length} leads · {stats.withPhone} have phone · {stats.withEmail} have email</span>
      </div>

      {/* ── Leads Table ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={selected.size === filteredLeads.length && filteredLeads.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Contact</th>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Sent</th>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-16 text-gray-400">
                  {loading
                    ? 'Loading leads...'
                    : leads.length === 0
                      ? (
                        <div>
                          <Upload className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="font-medium mb-1">No Facebook leads yet</p>
                          <p className="text-sm">Click &quot;Import CSV&quot; to upload your Facebook leads file</p>
                        </div>
                      )
                      : 'No leads match your search'}
                </td>
              </tr>
            )}
            {paginatedLeads.map(lead => (
              <tr key={lead.id} className={cn('hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors', selected.has(lead.id) && 'bg-indigo-50/50 dark:bg-indigo-900/10')}>
                {/* Checkbox */}
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => toggleSelect(lead.id)}
                    className="rounded border-gray-300"
                  />
                </td>

                {/* Name */}
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 dark:text-white">{lead.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs text-gray-400">{new Date(lead.discoveredAt).toLocaleDateString()}</p>
                    {lead.category && lead.category !== 'general' && (
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded-full font-medium',
                        lead.category === 'satsang' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                        lead.category === 'music'   ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' :
                        'bg-gray-100 text-gray-600'
                      )}>
                        {lead.category === 'satsang' ? '🧘 Satsang' : lead.category === 'music' ? '🎵 Music' : lead.category}
                      </span>
                    )}
                  </div>
                </td>

                {/* Contact */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    {lead.email && (
                      <span className="text-xs text-blue-500 truncate max-w-52">✉️ {lead.email}</span>
                    )}
                    {lead.phone && (
                      <span className="text-xs text-green-600 dark:text-green-400">📱 {lead.phone}</span>
                    )}
                    {!lead.email && !lead.phone && (
                      <span className="text-xs text-gray-400 italic">No contact info</span>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <StatusBadge lead={lead} />
                </td>

                {/* Sent flags */}
                <td className="px-4 py-2">
                  <div className="flex flex-col gap-1.5">
                    <span
                      title={lead.waFailed ? `WA Failed: ${lead.waError}` : lead.waSent ? 'WhatsApp sent' : 'WA not sent'}
                      className={cn('inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold w-fit',
                        lead.waFailed
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-300'
                          : lead.waSent
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 ring-1 ring-green-300'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      )}
                    >
                      <MessageCircle className="w-3 h-3" />
                      {lead.waFailed ? 'WA Failed' : lead.waSent ? 'WA Sent' : 'WA Pending'}
                    </span>
                    <span
                      title={lead.emailFailed ? `Email Failed: ${lead.emailError}` : lead.emailSent ? 'Email sent' : 'Email not sent'}
                      className={cn('inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold w-fit',
                        lead.emailFailed
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-300'
                          : lead.emailSent
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 ring-1 ring-blue-300'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      )}
                    >
                      <Mail className="w-3 h-3" />
                      {lead.emailFailed ? 'Email Failed' : lead.emailSent ? 'Email Sent' : 'Email Pending'}
                    </span>
                    <span
                      title={lead.registeredInAuth ? 'Account created in Firebase' : 'Not registered yet'}
                      className={cn('inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold w-fit',
                        lead.registeredInAuth
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 ring-1 ring-purple-300'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      )}
                    >
                      <UserPlus className="w-3 h-3" />
                      {lead.registeredInAuth ? 'Registered' : 'Not Registered'}
                    </span>

                    {/* Call Analysis Badge */}
                    {lead.callInitiatedAt && (
                      <span
                        title={lead.lastCallAnalysis || 'Call was made — analysis pending'}
                        className={cn('inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold w-fit max-w-[180px] truncate',
                          !lead.lastCallAnalysis
                            ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                            : lead.lastCallAnalysis.toLowerCase().includes('not interested')
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-300'
                              : lead.lastCallAnalysis.toLowerCase().includes('follow')
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 ring-1 ring-yellow-300'
                                : 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 ring-1 ring-teal-300'
                        )}
                      >
                        <PhoneCall className="w-3 h-3 shrink-0" />
                        <span className="truncate">{lead.lastCallAnalysis || 'Called'}</span>
                      </span>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-2">
                  <div className="flex flex-col gap-1.5">
                    <button
                      title={lead.registeredInAuth ? 'Already registered' : !lead.email ? 'No email' : 'Create Firebase account'}
                      onClick={() => registerLead(lead)}
                      disabled={!!actionLoading || lead.registeredInAuth || !lead.email}
                      className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all',
                        lead.registeredInAuth
                          ? 'bg-purple-100 text-purple-400 dark:bg-purple-900/10 cursor-default'
                          : !lead.email
                            ? 'bg-gray-100 text-gray-300 dark:bg-gray-800 cursor-not-allowed'
                            : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm hover:shadow active:scale-95 disabled:opacity-50'
                      )}
                    >
                      {actionLoading === `reg-${lead.id}`
                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                        : <UserPlus className="w-3 h-3" />}
                      {lead.registeredInAuth ? 'Registered ✓' : 'Register'}
                    </button>

                    <button
                      title={
                        !lead.registeredInAuth ? 'Register the user first before sending WA'
                        : lead.waSent && !lead.waFailed ? 'Already sent'
                        : !lead.phone ? 'No phone number'
                        : 'Send WhatsApp welcome message'
                      }
                      onClick={() => sendWA(lead)}
                      disabled={!!actionLoading || !lead.registeredInAuth || !lead.phone || (lead.waSent && !lead.waFailed)}
                      className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all',
                        !lead.registeredInAuth
                          ? 'bg-gray-100 text-gray-300 dark:bg-gray-800 cursor-not-allowed'
                          : lead.waSent && !lead.waFailed
                            ? 'bg-green-100 text-green-500 dark:bg-green-900/10 cursor-default'
                            : lead.waFailed
                              ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm active:scale-95'
                              : !lead.phone
                                ? 'bg-gray-100 text-gray-300 dark:bg-gray-800 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow active:scale-95 disabled:opacity-40'
                      )}
                    >
                      {actionLoading === `wa-${lead.id}`
                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                        : <MessageCircle className="w-3 h-3" />}
                      {lead.waSent && !lead.waFailed ? 'WA Sent ✓' : lead.waFailed ? 'Retry WA' : 'Send WA'}
                    </button>

                    <button
                      title={!lead.phone ? 'No phone number' : 'Initiate AI Voice Call'}
                      onClick={() => initiateCall(lead)}
                      disabled={!!actionLoading || !lead.phone}
                      className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all',
                        !lead.phone
                          ? 'bg-gray-100 text-gray-300 dark:bg-gray-800 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow active:scale-95 disabled:opacity-40'
                      )}
                    >
                      {actionLoading === `call-${lead.id}`
                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                        : <PhoneCall className="w-3 h-3" />}
                      Call
                    </button>

                    {/* View Transcript button - only if call was made */}
                    {lead.callInitiatedAt && (
                      <button
                        title="View call transcript & AI analysis"
                        onClick={() => viewTranscript(lead)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all bg-violet-600 hover:bg-violet-700 text-white shadow-sm hover:shadow active:scale-95"
                      >
                        <ChevronRight className="w-3 h-3" />
                        Transcript
                      </button>
                    )}

                    <button
                      title={
                        !lead.registeredInAuth ? 'Register the user first before sending email'
                        : lead.emailSent && !lead.emailFailed ? 'Already sent'
                        : !lead.email ? 'No email address'
                        : 'Send welcome email with credentials'
                      }
                      onClick={() => sendEmail(lead)}
                      disabled={!!actionLoading || !lead.registeredInAuth || !lead.email || (lead.emailSent && !lead.emailFailed)}
                      className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all',
                        !lead.registeredInAuth
                          ? 'bg-gray-100 text-gray-300 dark:bg-gray-800 cursor-not-allowed'
                          : lead.emailSent && !lead.emailFailed
                            ? 'bg-blue-100 text-blue-500 dark:bg-blue-900/10 cursor-default'
                            : lead.emailFailed
                              ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm active:scale-95'
                              : !lead.email
                                ? 'bg-gray-100 text-gray-300 dark:bg-gray-800 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow active:scale-95 disabled:opacity-40'
                      )}
                    >
                      {actionLoading === `email-${lead.id}`
                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                        : <Mail className="w-3 h-3" />}
                      {lead.emailSent && !lead.emailFailed ? 'Email Sent ✓' : lead.emailFailed ? 'Retry Email' : 'Send Email'}
                    </button>

                    <button
                      title="Delete lead"
                      onClick={() => deleteLead(lead)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination Controls ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-b-xl">
          <span className="text-xs text-gray-500">
            Page {safePage} of {totalPages} &middot; {filteredLeads.length} leads total
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safePage === 1}
              className="px-2 py-1 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
            >«</button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-3 py-1 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
            >Prev</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
              const page = start + i;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                    page === safePage
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >{page}</button>
              );
            })}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-3 py-1 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
            >Next</button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage === totalPages}
              className="px-2 py-1 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
            >»</button>
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="mt-4 text-xs text-gray-400 flex flex-wrap gap-4 px-1">
        <span>🔑 Password for all users: <strong className="text-gray-600 dark:text-gray-300 font-mono">EarlyFreeAccess</strong></span>
        <span>📦 WA sends in batches of 10 with 45s gaps</span>
        <span>⏱️ ~4s delay between each message</span>
      </div>

      {/* ── Add Lead Modal ── */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowAddForm(false)}>
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">➕ Add Lead Manually</h2>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">✕</button>
            </div>

            <form onSubmit={addLead} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={addFormData.name}
                  onChange={e => setAddFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="e.g. rahul@gmail.com"
                  value={addFormData.email}
                  onChange={e => setAddFormData(p => ({ ...p, email: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone / WhatsApp</label>
                <input
                  type="tel"
                  placeholder="e.g. +919876543210"
                  value={addFormData.phone}
                  onChange={e => setAddFormData(p => ({ ...p, phone: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">Include country code for international numbers (e.g. +1, +44)</p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                <div className="flex gap-2">
                  {([{ v: 'general', label: '📋 General' }, { v: 'satsang', label: '🧘 Satsang' }, { v: 'music', label: '🎵 Music' }] as const).map(({ v, label }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAddFormData(p => ({ ...p, category: v }))}
                      className={cn(
                        'flex-1 py-2 rounded-xl text-sm font-medium border transition-colors',
                        addFormData.category === v
                          ? v === 'music' ? 'bg-pink-600 text-white border-pink-600'
                          : v === 'satsang' ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-gray-600 text-white border-gray-600'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {addFormError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 text-sm text-red-600 dark:text-red-400">
                  ❌ {addFormError}
                </div>
              )}

              {/* Footer */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addFormLoading}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
                >
                  {addFormLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {addFormLoading ? 'Adding...' : 'Add Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── WhatsApp QR Modal ── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={() => setShowQrModal(false)}>
          <div
            className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 text-center border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <MessageCircle className="w-6 h-6 text-green-500" /> WhatsApp Connection
                 </h2>
                 <button onClick={() => setShowQrModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <XCircle className="w-6 h-6" />
                 </button>
              </div>

              {waStatus.connected ? (
                <div className="py-8 space-y-4">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto ring-8 ring-green-500/5">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-green-600">Successfully Connected</h3>
                    <p className="text-sm text-gray-500 mt-1">Your WhatsApp is ready to send messages.</p>
                  </div>
                  <Button onClick={() => setShowQrModal(false)} className="w-full bg-green-600 hover:bg-green-700 mt-4">
                    Got it
                  </Button>
                </div>
              ) : (
                <div className="py-4 space-y-6">
                  {waQrCode ? (
                    <>
                      <div className="bg-white p-4 rounded-3xl shadow-inner inline-block ring-1 ring-gray-100">
                        <Image src={waQrCode} alt="WhatsApp QR Code" width={220} height={220} className="rounded-xl" unoptimized />
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Scan this QR code with your phone</p>
                        <div className="flex flex-col gap-2 text-[11px] text-gray-500 bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-gray-100 dark:border-zinc-800">
                          <p>1. Open WhatsApp on your phone</p>
                          <p>2. Tap Menu (⋮) or Settings (⚙️)</p>
                          <p>3. Tap Linked Devices → Link a Device</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-12 flex flex-col items-center gap-4">
                      <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {waStatus.qrPending ? 'Generating QR Code...' : 'Initializing WhatsApp Service...'}
                        </p>
                        <p className="text-xs text-gray-500">This may take a few seconds.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ── Transcript Modal ──────────────────────────────────────────── */}
      {transcriptLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-violet-600" />
                  Call Transcript — {transcriptLead.name}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {transcriptLead.phone} · Called {transcriptLead.callInitiatedAt ? new Date(transcriptLead.callInitiatedAt).toLocaleString() : ''}
                </p>
              </div>
              <button
                onClick={() => setTranscriptLead(null)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {transcriptLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                  <p className="text-sm text-gray-500">Loading transcript...</p>
                </div>
              ) : transcriptData.length === 0 ? (
                <div className="text-center py-16">
                  <PhoneCall className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No transcript available yet</p>
                  <p className="text-xs text-gray-400 mt-1">Transcript is saved after the call ends. If the call just finished, wait a few seconds and try again.</p>
                </div>
              ) : (
                transcriptData.map((interaction, i) => (
                  <div key={interaction.id || i} className="space-y-4">
                    {/* Analysis banner */}
                    {interaction.analysis && (
                      <div className={cn(
                        'flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium border',
                        interaction.analysis.toLowerCase().includes('not interested')
                          ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
                          : interaction.analysis.toLowerCase().includes('follow')
                            ? 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300'
                      )}>
                        <Zap className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold">AI Analysis: </span>
                          {interaction.analysis}
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="text-xs text-center text-gray-400">
                      {interaction.timestamp ? new Date(interaction.timestamp).toLocaleString() : ''}
                    </div>

                    {/* Chat bubbles */}
                    <div className="space-y-3">
                      {interaction.transcript?.split('\n').filter(Boolean).map((line: string, j: number) => {
                        const isAI = line.startsWith('AI:');
                        const isUser = line.startsWith('User:');
                        const text = line.replace(/^(AI:|User:)\s*/, '');
                        if (!isAI && !isUser) return null;
                        return (
                          <div key={j} className={cn('flex', isAI ? 'justify-start' : 'justify-end')}>
                            <div className={cn(
                              'max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                              isAI
                                ? 'bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-100 rounded-tl-sm'
                                : 'bg-indigo-600 text-white rounded-tr-sm'
                            )}>
                              {isAI && <span className="text-xs font-bold text-violet-500 dark:text-violet-300 block mb-1">🤖 Rashi</span>}
                              {isUser && <span className="text-xs font-bold text-indigo-200 block mb-1">👤 {transcriptLead.name}</span>}
                              {text}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
              <button
                onClick={() => setTranscriptLead(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
