'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import type { Trip, GuestProfile } from '@/types';
import { Car, ArrowRight, PlusCircle, User, Users, Briefcase, CheckCircle, AlertCircle } from 'lucide-react';

export default function GuestDashboard() {
  const { user, token } = useAuth('GUEST');
  const [profile, setProfile] = useState<GuestProfile | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingParty, setUpdatingParty] = useState(false);
  const [partySizeInput, setPartySizeInput] = useState(1);
  const [luggageInput, setLuggageInput] = useState(1);
  const [updateMsg, setUpdateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchGuestData = useCallback(async () => {
    if (!token) return;
    try {
      const [gRes, tRes] = await Promise.all([
        fetch('/api/guests', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/trips', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [gData, tData] = await Promise.all([gRes.json(), tRes.json()]);

      if (gData.success && gData.data) {
        setProfile(gData.data);
        if (gData.data.groupSize) setPartySizeInput(gData.data.groupSize);
        if (gData.data.luggageCount) setLuggageInput(gData.data.luggageCount);
      }
      if (tData.success && tData.data) {
        const active = tData.data.find((t: Trip) =>
          ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(t.status)
        );
        setActiveTrip(active || null);
      }
    } catch {
      // Ignore network error
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchGuestData();
  }, [fetchGuestData]);

  const handleUpdateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !token) return;
    setUpdatingParty(true);
    setUpdateMsg(null);

    try {
      const res = await fetch(`/api/guests/${profile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          groupSize: partySizeInput,
          luggageCount: luggageInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
        setUpdateMsg({ type: 'success', text: 'Accompanying party updated successfully!' });
      } else {
        setUpdateMsg({ type: 'error', text: data.error || 'Failed to update party size' });
      }
    } catch {
      setUpdateMsg({ type: 'error', text: 'Network error updating party size' });
    } finally {
      setUpdatingParty(false);
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
      {/* Welcome Card */}
      <div className="card-editorial space-y-3 bg-gradient-to-br from-white to-ivory-100">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-sans font-semibold text-gold-500 uppercase tracking-[0.2em]">
            Celebration Transfer
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-sans font-semibold bg-champagne-100 text-gold-600 border border-champagne-200/50">
            {profile?.status || 'REGISTERED'}
          </span>
        </div>
        <h1 className="font-serif text-2xl md:text-3xl text-charcoal-800">
          Welcome, <span className="text-gold-500 italic">{user?.name}</span>
        </h1>
        <p className="text-xs text-charcoal-400 font-sans leading-relaxed">
          Delhi &middot; Bharat Mandapam Event Fleet Concierge
        </p>
      </div>

      {/* Active Trip Card */}
      <div className="card-editorial space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-champagne-100 flex items-center justify-center">
              <Car className="w-4.5 h-4.5 text-gold-500" />
            </div>
            <h2 className="font-serif text-lg text-charcoal-800">Transfer Status</h2>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-sans font-semibold tracking-wide ${
              activeTrip
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/50'
                : 'bg-ivory-200 text-charcoal-400 border border-black/[0.04]'
            }`}
          >
            {activeTrip ? activeTrip.status.replace(/_/g, ' ') : 'NO ACTIVE RIDE'}
          </span>
        </div>

        {activeTrip ? (
          <div className="space-y-4">
            <div className="bg-ivory-100/80 p-5 rounded-2xl border border-black/[0.04] space-y-3 text-xs">
              <div className="space-y-1">
                <span className="label-editorial">Pickup Location</span>
                <p className="text-charcoal-700 font-medium text-sm">{activeTrip.pickupAddress}</p>
              </div>
              <div className="divider-editorial !my-2" />
              <div className="space-y-1">
                <span className="label-editorial">Dropoff Destination</span>
                <p className="text-charcoal-700 font-medium text-sm">{activeTrip.dropoffAddress}</p>
              </div>
            </div>

            <Link href="/guest/track" className="btn-gold w-full group">
              <span>Track Live Driver & Route</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
            </Link>
          </div>
        ) : (
          <p className="text-xs text-charcoal-400 leading-relaxed font-sans">
            Your assigned chauffeur will appear here upon dispatch. You can also request an on-demand transfer below.
          </p>
        )}
      </div>

      {/* Arrival Party & Companions Quick Form */}
      <div className="card-editorial space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gold-50 flex items-center justify-center border border-gold-200/40">
              <Users className="w-4.5 h-4.5 text-gold-600" />
            </div>
            <div>
              <h2 className="font-serif text-lg text-charcoal-800">Accompanying Party</h2>
              <p className="text-[11px] text-charcoal-400 font-sans">Arriving with family or guests?</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-ivory-100 text-charcoal-700 border border-black/[0.04]">
            {profile?.groupSize || 1} {(profile?.groupSize || 1) === 1 ? 'Person' : 'People'}
          </span>
        </div>

        {updateMsg && (
          <div
            className={`px-4 py-3 rounded-xl text-xs flex items-center gap-2 ${
              updateMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/50'
                : 'bg-blush-50 text-blush-500 border border-blush-200/50'
            }`}
          >
            {updateMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{updateMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleUpdateParty} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-editorial text-[10px] block mb-1">Total People (Self + Party)</label>
              <select
                value={partySizeInput}
                onChange={(e) => setPartySizeInput(parseInt(e.target.value) || 1)}
                className="select-editorial text-xs py-2"
              >
                <option value={1}>1 Person (Solo)</option>
                <option value={2}>2 People (+1 Companion)</option>
                <option value={3}>3 People (+2 Companions)</option>
                <option value={4}>4 People (+3 Companions)</option>
                <option value={5}>5 People (+4 Companions)</option>
                <option value={6}>6 People (+5 Companions)</option>
                <option value={7}>7+ Group</option>
              </select>
            </div>

            <div>
              <label className="label-editorial text-[10px] block mb-1">Luggage Bags</label>
              <select
                value={luggageInput}
                onChange={(e) => setLuggageInput(parseInt(e.target.value) || 0)}
                className="select-editorial text-xs py-2"
              >
                <option value={0}>0 Bags</option>
                <option value={1}>1 Bag</option>
                <option value={2}>2 Bags</option>
                <option value={3}>3 Bags</option>
                <option value={4}>4 Bags</option>
                <option value={5}>5+ Bags</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={updatingParty}
            className="btn-secondary w-full text-xs py-2.5 flex items-center justify-center gap-2"
          >
            {updatingParty ? 'Updating Party Size...' : 'Update Accompanying Party'}
          </button>
        </form>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/guest/request" className="card-editorial !p-6 space-y-3 group">
          <div className="w-10 h-10 rounded-2xl bg-champagne-100 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
            <PlusCircle className="w-5 h-5 text-gold-500" />
          </div>
          <div>
            <h3 className="font-serif text-base text-charcoal-800">Request Ride</h3>
            <p className="text-xs text-charcoal-400 mt-0.5">On-demand transfer</p>
          </div>
        </Link>

        <Link href="/guest/profile" className="card-editorial !p-6 space-y-3 group">
          <div className="w-10 h-10 rounded-2xl bg-champagne-100 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
            <User className="w-5 h-5 text-gold-500" />
          </div>
          <div>
            <h3 className="font-serif text-base text-charcoal-800">Travel Details</h3>
            <p className="text-xs text-charcoal-400 mt-0.5">Flight & hotel info</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
