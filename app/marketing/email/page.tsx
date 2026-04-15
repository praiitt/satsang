'use client';

import { useState, useEffect, useMemo } from 'react';
import { Mail, Send, Users, CheckCircle, XCircle, RefreshCw, Loader2, Search, X, ChevronDown } from 'lucide-react';

const EMAIL_SERVICE_URL = process.env.NEXT_PUBLIC_EMAIL_SERVICE_URL || 'http://localhost:4003';

interface User { id: string; name: string; email: string; phone?: string; }
interface EmailLog { id?: string; to: string; subject: string; status: 'sent' | 'failed'; error?: string; timestamp: any; }
interface ServiceStatus { configured: boolean; from: string; fromName: string; }

export default function EmailDashboard() {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, l, u] = await Promise.all([
        fetch(`${EMAIL_SERVICE_URL}/status`).then(r => r.ok ? r.json() : null),
        fetch(`${EMAIL_SERVICE_URL}/logs`).then(r => r.ok ? r.json() : { logs: [] }),
        fetch(`${EMAIL_SERVICE_URL}/users`).then(r => r.ok ? r.json() : { users: [] }),
      ]);
      if (s) setStatus(s);
      setLogs(l?.logs || []);
      setUsers(u?.users || []);
    } catch { /* service offline */ }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filteredUsers = useMemo(() =>
    users.filter(u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    ), [users, search]);

  const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedEmails.has(u.email));

  const toggleUser = (email: string) => {
    setSelectedEmails(prev => {
      const n = new Set(prev);
      n.has(email) ? n.delete(email) : n.add(email);
      return n;
    });
  };

  const toggleAllFiltered = () => {
    setSelectedEmails(prev => {
      const n = new Set(prev);
      if (allFilteredSelected) {
        filteredUsers.forEach(u => n.delete(u.email));
      } else {
        filteredUsers.forEach(u => n.add(u.email));
      }
      return n;
    });
  };

  const selectAll = () => setSelectedEmails(new Set(users.map(u => u.email)));
  const clearAll = () => setSelectedEmails(new Set());

  const handleSend = async () => {
    if (!subject.trim() || !htmlBody.trim()) {
      setSendResult({ success: false, message: 'Subject and body are required' });
      return;
    }
    if (selectedEmails.size === 0) {
      setSendResult({ success: false, message: 'Select at least one recipient' });
      return;
    }
    if (!status?.configured) {
      setSendResult({ success: false, message: 'Email service not configured' });
      return;
    }
    setSending(true);
    setSendResult(null);
    try {
      const emails = Array.from(selectedEmails);
      const endpoint = emails.length === 1 ? '/send' : '/broadcast';
      const body = emails.length === 1
        ? { to: emails[0], subject, html: htmlBody }
        : { emails, subject, html: htmlBody };

      const res = await fetch(`${EMAIL_SERVICE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setSendResult({
        success: !!data.success,
        message: data.success
          ? `✅ ${emails.length === 1 ? `Email sent to ${emails[0]}` : `Broadcast started to ${emails.length} recipients`}`
          : data.error || 'Failed to send',
      });
      if (data.success) setTimeout(fetchAll, 2500);
    } catch (err: any) {
      setSendResult({ success: false, message: err.message });
    }
    setSending(false);
  };

  const sentCount = logs.filter(l => l.status === 'sent').length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top Bar */}
      <div className="border-b border-white/10 bg-gray-900/50 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Mail className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-none">Email Dashboard</h1>
            <p className="text-xs text-white/40 mt-0.5">
              {status?.configured ? `Sending from ${status.from}` : 'Service offline'}
            </p>
          </div>
          <div className={`ml-3 h-2 w-2 rounded-full ${status?.configured ? 'bg-green-400' : 'bg-red-400'}`} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">{sentCount} emails sent</span>
          <button
            onClick={() => setShowLogs(p => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs transition-colors"
          >
            History <ChevronDown className={`h-3 w-3 transition-transform ${showLogs ? 'rotate-180' : ''}`} />
          </button>
          <button onClick={fetchAll} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Log Drawer */}
      {showLogs && (
        <div className="border-b border-white/10 bg-gray-900/30 px-6 py-4">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Recent Emails</h3>
          {logs.length === 0 ? (
            <p className="text-sm text-white/30">No emails sent yet</p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={log.id || i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5">
                  {log.status === 'sent'
                    ? <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />
                    : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                  <span className="text-xs text-white/60 truncate flex-1">{log.to}</span>
                  <span className="text-xs font-medium truncate max-w-xs">{log.subject}</span>
                  <span className="text-xs text-white/30 shrink-0">
                    {typeof log.timestamp === 'string' ? new Date(log.timestamp).toLocaleTimeString() : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-65px)]">

        {/* LEFT: Recipient Picker */}
        <div className="w-80 shrink-0 border-r border-white/10 flex flex-col bg-gray-900/20">
          {/* Header */}
          <div className="p-4 border-b border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                Recipients
              </span>
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-semibold">
                {selectedEmails.size}/{users.length}
              </span>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
              <input
                className="w-full bg-white/10 rounded-lg pl-8 pr-3 py-2 text-xs placeholder:text-white/30 outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Search users..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X className="h-3 w-3 text-white/40" />
                </button>
              )}
            </div>
            {/* Bulk Actions */}
            <div className="flex gap-2">
              <button
                onClick={toggleAllFiltered}
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 transition-colors"
              >
                {allFilteredSelected ? 'Deselect All' : `Select All (${filteredUsers.length})`}
              </button>
              {selectedEmails.size > 0 && (
                <button
                  onClick={clearAll}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-white/60 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="flex justify-center pt-8">
                <Loader2 className="h-5 w-5 animate-spin text-white/30" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-xs text-white/30 text-center pt-8">No users found</p>
            ) : (
              filteredUsers.map(u => {
                const selected = selectedEmails.has(u.email);
                return (
                  <button
                    key={u.id}
                    onClick={() => toggleUser(u.email)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                      selected
                        ? 'bg-blue-600/20 border border-blue-500/30'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      selected ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/60'
                    }`}>
                      {selected ? '✓' : (u.name?.[0] || u.email[0]).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{u.name || 'User'}</p>
                      <p className="text-xs text-white/40 truncate">{u.email}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: Compose */}
        <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto">

          {/* Selected Recipients Chips */}
          {selectedEmails.size > 0 && (
            <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <span className="text-xs text-blue-400 font-semibold self-center">To:</span>
              {Array.from(selectedEmails).slice(0, 8).map(email => (
                <span key={email} className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/20 rounded-full text-xs text-blue-200 border border-blue-500/20">
                  {email}
                  <button onClick={() => toggleUser(email)}><X className="h-3 w-3 hover:text-white" /></button>
                </span>
              ))}
              {selectedEmails.size > 8 && (
                <span className="px-2.5 py-1 bg-white/10 rounded-full text-xs text-white/50">
                  +{selectedEmails.size - 8} more
                </span>
              )}
            </div>
          )}

          {selectedEmails.size === 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
              <Users className="h-4 w-4 text-white/30 shrink-0" />
              <p className="text-xs text-white/40">Select recipients from the left panel</p>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-2">Subject</label>
            <input
              className="w-full bg-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/30 outline-none focus:ring-2 focus:ring-blue-500 border border-white/10 focus:border-blue-500/50 transition-all"
              placeholder="Enter email subject..."
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-2">
              Message <span className="normal-case font-normal text-white/20">(HTML supported)</span>
            </label>
            <textarea
              className="flex-1 min-h-64 w-full bg-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/30 outline-none focus:ring-2 focus:ring-blue-500 border border-white/10 focus:border-blue-500/50 transition-all font-mono resize-none"
              placeholder={`<h1>Hello!</h1>\n<p>Your message here...</p>`}
              value={htmlBody}
              onChange={e => setHtmlBody(e.target.value)}
            />
          </div>

          {/* Send Result */}
          {sendResult && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-sm border ${
              sendResult.success
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {sendResult.success ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
              {sendResult.message}
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={sending || selectedEmails.size === 0 || !subject.trim() || !htmlBody.trim()}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50"
          >
            {sending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
              : <><Send className="h-4 w-4" />
                {selectedEmails.size === 0
                  ? 'Select recipients to send'
                  : selectedEmails.size === 1
                    ? 'Send Email'
                    : `Send to ${selectedEmails.size} recipients`}
              </>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
