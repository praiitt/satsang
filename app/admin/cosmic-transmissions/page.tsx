'use client';

import React, { useState, useEffect } from 'react';
import { getFirebaseApp } from '@/lib/firebase-client';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { Button } from '@/components/livekit/button';
import { Trash2, Send, Activity, Radio } from 'lucide-react';
import Link from 'next/link';

// Make sure we have the DB initialized
const db = getFirestore(getFirebaseApp());

export default function CosmicTransmissionsAdmin() {
  const [transmissions, setTransmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [civilization, setCivilization] = useState('PLEIADIAN HIGH COUNCIL');
  const [message, setMessage] = useState('');
  const [color, setColor] = useState('text-cyan-400');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [embedCode, setEmbedCode] = useState('');
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Transmissions
  useEffect(() => {
    const q = query(
      collection(db, 'cosmic_transmissions'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransmissions(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !embedCode.trim() && !url.trim()) || !civilization.trim()) {
      alert('Please provide either a message, an embed code, or a URL.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'cosmic_transmissions'), {
        civilization: civilization.toUpperCase(),
        message,
        embedCode,
        url,
        color,
        date,
        createdAt: serverTimestamp()
      });
      
      // Reset form
      setMessage('');
      setEmbedCode('');
      setUrl('');
      alert('Transmission successfully sent to the cosmos!');
    } catch (error) {
      console.error('Error adding document: ', error);
      alert('Error saving transmission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transmission?')) return;
    
    try {
      await deleteDoc(doc(db, 'cosmic_transmissions', id));
    } catch (error) {
      console.error('Error deleting document: ', error);
      alert('Error deleting transmission.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Activity className="text-cyan-500" /> 
              Cosmic Transmissions Admin
            </h1>
            <p className="text-slate-400 mt-2">Manage daily channeled messages for the ET Agent homepage.</p>
          </div>
          <Link href="/admin">
            <Button variant="outline" className="border-slate-700 text-slate-300">
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Add New Form */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-white mb-6">New Transmission</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Civilization</label>
                  <input 
                    type="text" 
                    value={civilization}
                    onChange={(e) => setCivilization(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. PLEIADIAN HIGH COUNCIL"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Date Log</label>
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Aesthetic Color</label>
                  <select 
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="text-cyan-400">Cyan (Pleiadian)</option>
                    <option value="text-fuchsia-400">Fuchsia (Arcturian)</option>
                    <option value="text-amber-400">Amber (Sirian)</option>
                    <option value="text-emerald-400">Emerald (Lyran)</option>
                    <option value="text-purple-400">Purple (Andromedan)</option>
                    <option value="text-red-400">Red (Orion)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Message Text (Optional if adding Embed)</label>
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 resize-none"
                    placeholder="Enter the channeled message here..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Rich Embed Code (Optional)</label>
                  <textarea 
                    value={embedCode}
                    onChange={(e) => setEmbedCode(e.target.value)}
                    className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-500 resize-none"
                    placeholder='e.g., <iframe src="..."></iframe>'
                  />
                  <p className="text-xs text-slate-500 mt-1">Paste Facebook Reels, YouTube, or Instagram embed codes here to play them directly on the page.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">External Link URL (Optional)</label>
                  <input 
                    type="url" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    placeholder="https://www.facebook.com/share/v/..."
                  />
                  <p className="text-xs text-slate-500 mt-1">If you provide a URL, a button will appear below the message for users to click.</p>
                </div>

                <Button  
                  type="submit"  
                  disabled={isSubmitting}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white border-none py-6 mt-4"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Transmitting...' : 'Broadcast Transmission'}
                </Button>
              </form>
            </div>
          </div>

          {/* Active Transmissions List */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-full">
              <h2 className="text-xl font-semibold text-white mb-6">Active Intercepts</h2>
              
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                </div>
              ) : transmissions.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                  <Radio className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500">No active transmissions.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transmissions.map((t) => (
                    <div key={t.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row gap-4 justify-between group">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-bold tracking-widest ${t.color}`}>[{t.civilization}]</span>
                          <span className="text-xs text-slate-600">{t.date}</span>
                        </div>
                        <p className="text-sm text-slate-300 font-mono leading-relaxed mt-2">
                          {t.message}
                        </p>
                        {t.embedCode && (
                          <div className="mt-4 p-2 bg-slate-900 rounded border border-slate-700 text-xs text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap">
                            [Contains Rich Embed Code]
                          </div>
                        )}
                        {t.url && (
                          <div className="mt-2 text-xs text-cyan-400 font-sans truncate max-w-xs">
                            🔗 {t.url}
                          </div>
                        )}
                      </div>
                      <div className="flex items-start">
                        <button 
                          onClick={() => handleDelete(t.id)}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="Delete Transmission"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
