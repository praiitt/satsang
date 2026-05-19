'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  Loader2,
  MessageSquare,
  Users,
  Clock,
  AlertTriangle,
  CheckSquare,
  Square,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

const WA_SERVICE_URL = process.env.NEXT_PUBLIC_WA_SERVICE_URL || 'http://localhost:4002';

interface UserRecord {
  uid: string;
  displayName: string;
  phoneNumber: string;
  email: string;
}

interface SendLog {
  phone: string;
  message: string;
  mediaUrl?: string;
  status: 'sent' | 'failed';
  error?: string;
  timestamp: string;
}

interface WAStatus {
  connected: boolean;
  qrPending: boolean;
}

export default function WhatsAppDashboard() {
  const [status, setStatus] = useState<WAStatus>({ connected: false, qrPending: false });
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState<SendLog[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  // Combined fetch to reduce total requests and prevent 429 Errors
  const fetchAllInfo = useCallback(async () => {
    try {
      const res = await fetch(`${WA_SERVICE_URL}/all-info`);
      if (!res.ok) throw new Error('Service unreachable');
      const data = await res.json();
      setStatus({ connected: data.connected, qrPending: data.qrPending });
      setQrCode(data.qr);
      setLogs(data.logs || []);
    } catch {
      setStatus({ connected: false, qrPending: false });
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/next-admin/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchAllInfo();
    const interval = setInterval(fetchAllInfo, 5000);
    return () => clearInterval(interval);
  }, [fetchUsers, fetchAllInfo]);

  const toggleUser = (phone: string) => {
    setSelectedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const filtered = filteredUsers.map((u) => u.phoneNumber);
    const allSelected = filtered.every((p) => selectedPhones.has(p));
    setSelectedPhones((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((p) => next.delete(p));
      else filtered.forEach((p) => next.add(p));
      return next;
    });
  };

  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phoneNumber.includes(searchQuery) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Phone → display name lookup for logs (normalized for resilience)
  const phoneToName = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u) => {
      const normalized = u.phoneNumber.replace(/\D/g, '');
      if (normalized) map[normalized] = u.displayName;
    });
    return map;
  }, [users]);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    if (selectedPhones.size === 0) {
      toast.error('Please select at least one recipient');
      return;
    }
    if (!status.connected) {
      toast.error('WhatsApp is not connected. Please scan the QR code.');
      return;
    }

    setIsSending(true);
    const phones = Array.from(selectedPhones);

    try {
      if (phones.length === 1) {
        const res = await fetch(`${WA_SERVICE_URL}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phones[0], message: message.trim(), mediaUrl: mediaUrl.trim() || undefined }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Send failed');
        toast.success(`Message sent to ${phones[0]}`);
      } else {
        const res = await fetch(`${WA_SERVICE_URL}/broadcast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phones, message: message.trim(), mediaUrl: mediaUrl.trim() || undefined }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Broadcast failed');
        toast.success(`Broadcasting to ${phones.length} numbers...`);
      }
      setMessage('');
      setMediaUrl('');
      setSelectedPhones(new Set());
      setTimeout(fetchLogs, 3000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  const handleResend = async (log: SendLog) => {
    try {
      const res = await fetch(`${WA_SERVICE_URL}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: log.phone, 
          message: log.message, 
          mediaUrl: log.mediaUrl 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Resend failed');
      toast.success(`Resent to ${log.phone}`);
      setTimeout(fetchLogs, 1000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-serif text-white">WhatsApp Broadcast</h1>
          <p className="text-zinc-400 text-sm mt-1">Send messages to your Satsang community</p>
        </div>
        <button
          onClick={() => { fetchAllInfo(); fetchUsers(); }}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Connection + Compose */}
        <div className="xl:col-span-1 space-y-4">
          {/* Connection Card */}
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Connection Status</h2>
              {status.connected ? (
                <span className="flex items-center gap-1.5 text-green-400 text-sm font-medium bg-green-500/10 border border-green-500/30 px-3 py-1 rounded-full">
                  <CheckCircle className="w-4 h-4" /> Connected
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-red-400 text-sm font-medium bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-full">
                  <XCircle className="w-4 h-4" /> Disconnected
                </span>
              )}
            </div>

            {!status.connected && (
              <div className="flex flex-col items-center gap-3">
                {qrCode ? (
                  <>
                    <p className="text-sm text-zinc-400 text-center">
                      Scan this QR code with your <strong className="text-white">WhatsApp</strong> to connect
                    </p>
                    <div className="bg-white p-3 rounded-xl">
                      <Image src={qrCode} alt="WhatsApp QR Code" width={200} height={200} unoptimized />
                    </div>
                    <p className="text-xs text-zinc-500 text-center">WhatsApp → ⋮ → Linked Devices → Link a Device</p>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <Loader2 className="w-8 h-8 animate-spin text-green-400" />
                    <p className="text-sm text-zinc-400">
                      {status.qrPending ? 'Generating QR code...' : 'Connecting to WhatsApp...'}
                    </p>
                    <p className="text-xs text-zinc-600">Make sure whatsapp-service is running on port 4002</p>
                  </div>
                )}
              </div>
            )}

            {status.connected && (
              <div className="flex items-center gap-3 bg-green-500/5 border border-green-500/20 rounded-xl p-3">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-30" />
                  <div className="relative w-3 h-3 rounded-full bg-green-400" />
                </div>
                <p className="text-sm text-green-300">WhatsApp Web is active and ready to send messages.</p>
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200 leading-relaxed">
              Use a <strong>dedicated secondary number</strong> for broadcasting. Mass messaging via WhatsApp Web may result in a temporary or permanent ban of the connected number.
            </p>
          </div>

          {/* Compose */}
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 space-y-4">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-400" /> Compose Message
            </h2>
            <textarea
              className="w-full bg-zinc-800/60 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-green-500/50 transition-colors"
              rows={6}
              placeholder="Type your message here... (supports emojis 🙏)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-zinc-500 ml-1">Optional Media URL (Image/Video)</label>
              <input
                className="w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-green-500/50 transition-colors"
                placeholder="https://example.com/image.jpg"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>{message.length} characters</span>
              <span>{selectedPhones.size} recipient{selectedPhones.size !== 1 ? 's' : ''} selected</span>
            </div>
            <button
              onClick={handleSend}
              disabled={isSending || !status.connected || selectedPhones.size === 0 || !message.trim()}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-medium rounded-xl py-3 transition-colors"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isSending
                ? 'Sending...'
                : selectedPhones.size > 1
                ? `Broadcast to ${selectedPhones.size} users`
                : 'Send Message'}
            </button>
          </div>
        </div>

        {/* Right: Users + Logs */}
        <div className="xl:col-span-2 space-y-4">
          {/* User Selector */}
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Users ({users.length} with phone)
              </h2>
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors px-3 py-1.5 bg-white/5 rounded-lg"
              >
                {filteredUsers.length > 0 && filteredUsers.every((u) => selectedPhones.has(u.phoneNumber))
                  ? <><CheckSquare className="w-4 h-4" /> Deselect All</>
                  : <><Square className="w-4 h-4" /> Select All</>}
              </button>
            </div>

            {/* Search */}
            <input
              className="w-full bg-zinc-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 transition-colors mb-4"
              placeholder="Search by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-zinc-500 py-8 text-sm">No users with phone numbers found.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {filteredUsers.map((user) => {
                  const selected = selectedPhones.has(user.phoneNumber);
                  return (
                    <button
                      key={user.uid}
                      onClick={() => toggleUser(user.phoneNumber)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        selected
                          ? 'bg-green-500/10 border-green-500/40'
                          : 'bg-white/3 border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        selected ? 'border-green-400 bg-green-400' : 'border-zinc-600'
                      }`}>
                        {selected && <CheckCircle className="w-3.5 h-3.5 text-black" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{user.displayName}</div>
                        <div className="text-xs text-zinc-500 font-mono">{user.phoneNumber}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Send Logs */}
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5">
            <h2 className="text-lg font-medium flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-blue-400" />
              Send History
            </h2>

            {logs.length === 0 ? (
              <p className="text-center text-zinc-600 py-6 text-sm">No messages sent yet in this session.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {logs.map((log, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
                    log.status === 'sent'
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-red-500/5 border-red-500/20'
                  }`}>
                    {log.status === 'sent'
                      ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      : <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          {(() => {
                            const normalized = log.phone.replace(/\D/g, '');
                            const name = phoneToName[normalized];
                            return name ? (
                              <div className="text-sm font-medium text-white truncate">{name}</div>
                            ) : null;
                          })()}
                          <span className="font-mono text-xs text-zinc-400">{log.phone}</span>
                        </div>
                        <span className="text-xs text-zinc-600 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-zinc-300 text-xs mt-0.5 mt-1">{log.message}</p>
                      {log.mediaUrl && (
                        <p className="text-[10px] text-blue-400 mt-1 truncate">Media: {log.mediaUrl}</p>
                      )}
                      {log.error && <p className="text-red-400 text-[10px] mt-1 italic">{log.error}</p>}
                      
                      {log.status === 'failed' && (
                        <button
                          onClick={() => handleResend(log)}
                          className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 px-2 py-1 rounded transition-all"
                        >
                          <RefreshCw className="w-3 h-3" /> Resend Now
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
