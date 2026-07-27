'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { GuestProfile, Accommodation } from '@/types';
import { CheckCircle, AlertCircle, Sparkles, Plane, Hotel } from 'lucide-react';

export default function GuestProfilePage() {
  const { user, token } = useAuth('GUEST');
  const [profile, setProfile] = useState<GuestProfile | null>(null);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form
  const [flightOrTrainNumber, setFlightOrTrainNumber] = useState('');
  const [groupSize, setGroupSize] = useState(1);
  const [luggageCount, setLuggageCount] = useState(1);

  const fetchProfile = useCallback(async () => {
    if (!token) return;
    try {
      const [pRes, aRes] = await Promise.all([
        fetch('/api/guests', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/accommodations', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [pData, aData] = await Promise.all([pRes.json(), aRes.json()]);

      if (pData.success && pData.data) {
        setProfile(pData.data);
        setFlightOrTrainNumber(pData.data.flightOrTrainNumber || '');
        setGroupSize(pData.data.groupSize || 1);
        setLuggageCount(pData.data.luggageCount || 1);
      }
      if (aData.success) setAccommodations(aData.data || []);
    } catch {
      // Ignore network error
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !token) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/guests/${profile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          flightOrTrainNumber,
          groupSize,
          luggageCount,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Travel details updated successfully.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update details' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error updating profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card-editorial space-y-2">
        <span className="text-[10px] font-sans font-semibold text-gold-500 uppercase tracking-[0.2em]">
          Guest Profile
        </span>
        <h1 className="font-serif text-2xl text-charcoal-800">{user?.name}</h1>
        <p className="text-xs text-charcoal-400 font-sans">{user?.email} &middot; {user?.phone}</p>
      </div>

      {message && (
        <div
          className={`px-5 py-4 rounded-2xl text-xs font-sans flex items-center gap-2.5 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/50'
              : 'bg-blush-50 text-blush-500 border border-blush-200/50'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="card-editorial space-y-5">
        <h3 className="font-serif text-lg text-charcoal-800 border-b border-black/[0.04] pb-4">
          Travel & Itinerary Details
        </h3>

        <div>
          <label className="label-editorial">Flight / Train Arrival Number</label>
          <input
            type="text"
            value={flightOrTrainNumber}
            onChange={(e) => setFlightOrTrainNumber(e.target.value)}
            className="input-editorial uppercase font-mono"
            placeholder="AI-801 or 12004 NDLS"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-editorial">Party Size</label>
            <input
              type="number"
              min={1}
              max={10}
              value={groupSize}
              onChange={(e) => setGroupSize(parseInt(e.target.value) || 1)}
              className="input-editorial"
            />
          </div>
          <div>
            <label className="label-editorial">Luggage Pieces</label>
            <input
              type="number"
              min={1}
              max={10}
              value={luggageCount}
              onChange={(e) => setLuggageCount(parseInt(e.target.value) || 1)}
              className="input-editorial"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-black/[0.04]">
          <span className="label-editorial">Assigned Hotel</span>
          <p className="font-serif text-base text-gold-600 font-medium mt-1">
            {profile?.accommodation?.name || 'Taj Palace, New Delhi'}
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-gold w-full disabled:opacity-60"
        >
          {saving ? 'Saving Details...' : 'Save Travel Details'}
        </button>
      </form>
    </div>
  );
}
