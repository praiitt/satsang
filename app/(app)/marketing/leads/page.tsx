'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, PhoneCall, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';

type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  source: string;
  platform?: string;
  lastCallAnalysis?: string;
};

export default function LeadsDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [callingId, setCallingId] = useState<string | null>(null);
  
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      // Next.js rewrites /api/auth-marketing/* to the marketing server
      const res = await fetch('/api/auth-marketing/leads?limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      const data = await res.json();
      if (data.items) {
        setLeads(data.items);
      }
    } catch (e) {
      console.error('Failed to fetch leads:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/auth-marketing/leads/upload-csv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        alert(`Successfully imported ${data.count} leads.`);
        fetchLeads();
      } else {
        alert('Failed to upload: ' + data.error);
      }
    } catch (err) {
      console.error('Upload Error:', err);
      alert('Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const initiateAiCall = async (leadId: string) => {
    try {
      if (!confirm('Initiate AI Call via Twilio to this lead?')) return;
      setCallingId(leadId);
      
      const res = await fetch(`/api/auth-marketing/leads/${leadId}/ai-call`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      
      const data = await res.json();
      if (data.success) {
        alert('Call initiated successfully! Status: ' + data.status);
      } else {
        alert('Failed to initiate call: ' + data.error);
      }
    } catch (err) {
      console.error('Call Error:', err);
      alert('Call initiation failed.');
    } finally {
      setCallingId(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto text-white">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent">Lead Management</h1>
          <p className="text-gray-400 mt-2">Manage Meta Ads leads and initiate AI voice interactions.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={fetchLeads}
            disabled={loading}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl transition"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          
          <div>
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 px-4 py-2 rounded-xl text-white font-medium shadow-lg transition"
            >
              <Upload size={18} />
              {uploading ? 'Uploading...' : 'Import CSV'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex items-center justify-center p-20 text-gray-400">
            <RefreshCw size={24} className="animate-spin" />
            <span className="ml-3">Loading leads...</span>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-gray-400 text-center">
            <FileText size={48} className="mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-gray-200">No Leads Found</h3>
            <p className="mt-2 max-w-md">Import a CSV file to get started, or wait for the Meta Webhook to push new lead forms directly here.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-black/40 border-b border-white/10 uppercase text-xs font-semibold text-gray-400 tracking-wider">
              <tr>
                <th className="p-4 pl-6">Name</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Status</th>
                <th className="p-4">Source</th>
                <th className="p-4 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-white/5 transition group">
                  <td className="p-4 pl-6">
                    <div className="font-medium text-gray-200">{lead.name}</div>
                    {lead.lastCallAnalysis && (
                      <div className="text-xs text-orange-400 mt-1 flex items-center gap-1">
                        <CheckCircle2 size={12} /> {lead.lastCallAnalysis}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-400">
                    <div>{lead.phone || 'No Phone'}</div>
                    <div className="text-xs opacity-75">{lead.email}</div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      lead.status === 'contacted' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/20' :
                      lead.status === 'converted' ? 'bg-green-500/20 text-green-300 border border-green-500/20' :
                      'bg-gray-500/20 text-gray-300 border border-gray-500/20'
                    }`}>
                      {lead.status || 'New'}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-400">
                    {lead.source || lead.platform || 'Unknown'}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    {lead.phone && (
                      <button 
                        onClick={() => initiateAiCall(lead.id)}
                        disabled={callingId === lead.id}
                        className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition disabled:opacity-50"
                      >
                        <PhoneCall size={14} />
                        {callingId === lead.id ? 'Dialing...' : 'AI Call'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
