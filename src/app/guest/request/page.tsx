'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DELHI_LOCATIONS } from '@/lib/maps/locations';
import type { RideRequest, GuestProfile } from '@/types';
import { Clock, AlertCircle, Users, Briefcase } from 'lucide-react';

export default function GuestRequestPage() {
  const { token } = useAuth('GUEST');
  const [pendingRequest, setPendingRequest] = useState<RideRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [pickupPoint, setPickupPoint] = useState(DELHI_LOCATIONS.airport.address);
  const [dropoffPoint, setDropoffPoint] = useState(DELHI_LOCATIONS.accommodations[0].address);
  const [groupSize, setGroupSize] = useState(1);
  const [luggageCount, setLuggageCount] = useState(1);

  const fetchExistingRequests = useCallback(async () => {
    if (!token) return;
    try {
      const [rRes, gRes] = await Promise.all([
        fetch('/api/ride-requests', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/guests', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [rData, gData] = await Promise.all([rRes.json(), gRes.json()]);

      if (rData.success && rData.data) {
        const pending = rData.data.find((r: RideRequest) => r.status === 'PENDING');
        setPendingRequest(pending || null);
      }
      if (gData.success && gData.data) {
        const profile: GuestProfile = gData.data;
        if (profile.groupSize) setGroupSize(profile.groupSize);
        if (profile.luggageCount) setLuggageCount(profile.luggageCount);
      }
    } catch {
      // Ignore network error
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchExistingRequests();
  }, [fetchExistingRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/ride-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pickupPoint,
          dropoffPoint,
          groupSize,
          luggageCount,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPendingRequest(data.data);
      } else {
        setError(data.error || 'Failed to submit request');
      }
    } catch {
      setError('Network error submitting ride request');
    } finally {
      setSubmitting(false);
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
          Concierge Service
        </span>
        <h1 className="font-serif text-2xl text-charcoal-800">Request On-Demand Ride</h1>
        <p className="text-xs text-charcoal-400 leading-relaxed font-sans">
          Need an unscheduled transfer? Enter your party details and location for instant dispatch review.
        </p>
      </div>

      {error && (
        <div className="px-5 py-4 bg-blush-50 border border-blush-200/50 text-blush-500 text-xs rounded-2xl flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {pendingRequest ? (
        <div className="card-editorial space-y-6 text-center border-gold-200/40">
          <div className="w-14 h-14 rounded-full bg-champagne-100 border border-gold-200/50 flex items-center justify-center text-gold-500 mx-auto">
            <Clock className="w-6 h-6 animate-gentle-pulse" />
          </div>

          <div className="space-y-2">
            <span className="px-3.5 py-1.5 rounded-full bg-gold-50 text-gold-600 text-xs font-semibold border border-gold-200/50">
              PENDING CONCIERGE APPROVAL
            </span>
            <h3 className="font-serif text-xl text-charcoal-800 pt-2">Ride Request Submitted</h3>
            <p className="text-xs text-charcoal-400 leading-relaxed max-w-xs mx-auto">
              Your request is currently being reviewed by event coordinators. A chauffeur will be dispatched shortly.
            </p>
          </div>

          <div className="bg-ivory-100/80 p-5 rounded-2xl border border-black/[0.04] text-left text-xs space-y-3">
            <div className="space-y-1">
              <span className="label-editorial">Pickup Point</span>
              <p className="text-charcoal-700 font-medium text-sm">{pendingRequest.pickupPoint}</p>
            </div>
            <div className="divider-editorial !my-2" />
            <div className="space-y-1">
              <span className="label-editorial">Dropoff Destination</span>
              <p className="text-charcoal-700 font-medium text-sm">{pendingRequest.dropoffPoint}</p>
            </div>
            <div className="divider-editorial !my-2" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="label-editorial">Party Size</span>
                <p className="text-charcoal-800 font-medium text-sm">
                  {pendingRequest.guestProfile?.groupSize || groupSize} { (pendingRequest.guestProfile?.groupSize || groupSize) === 1 ? 'Person' : 'People' }
                </p>
              </div>
              <div>
                <span className="label-editorial">Luggage</span>
                <p className="text-charcoal-800 font-medium text-sm">
                  {pendingRequest.guestProfile?.luggageCount || luggageCount} Bags
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card-editorial space-y-5">
          <div>
            <label className="label-editorial">Pickup Location</label>
            <select
              value={pickupPoint}
              onChange={(e) => setPickupPoint(e.target.value)}
              className="select-editorial"
            >
              <option value={DELHI_LOCATIONS.airport.address}>
                {DELHI_LOCATIONS.airport.name}
              </option>
              {DELHI_LOCATIONS.stations.map((s) => (
                <option key={s.id} value={s.address}>
                  {s.name}
                </option>
              ))}
              {DELHI_LOCATIONS.accommodations.map((a) => (
                <option key={a.id} value={a.address}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-editorial">Dropoff Destination</label>
            <select
              value={dropoffPoint}
              onChange={(e) => setDropoffPoint(e.target.value)}
              className="select-editorial"
            >
              {DELHI_LOCATIONS.accommodations.map((a) => (
                <option key={a.id} value={a.address}>
                  {a.name}
                </option>
              ))}
              <option value={DELHI_LOCATIONS.venue.address}>
                {DELHI_LOCATIONS.venue.name}
              </option>
            </select>
          </div>

          {/* Party Size & Luggage Entry */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-black/[0.04]">
            <div>
              <label className="label-editorial flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gold-500" />
                <span>Party Size</span>
              </label>
              <select
                value={groupSize}
                onChange={(e) => setGroupSize(parseInt(e.target.value) || 1)}
                className="select-editorial mt-1"
              >
                <option value={1}>1 Person (Solo)</option>
                <option value={2}>2 People (+1 Companion)</option>
                <option value={3}>3 People (+2 Companions)</option>
                <option value={4}>4 People (+3 Companions)</option>
                <option value={5}>5 People (+4 Companions)</option>
                <option value={6}>6 People (+5 Companions)</option>
                <option value={7}>7+ Group</option>
              </select>
              <span className="text-[10px] text-charcoal-400 font-sans mt-1 block">
                Total passengers requiring seats
              </span>
            </div>

            <div>
              <label className="label-editorial flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-gold-500" />
                <span>Luggage Count</span>
              </label>
              <select
                value={luggageCount}
                onChange={(e) => setLuggageCount(parseInt(e.target.value) || 0)}
                className="select-editorial mt-1"
              >
                <option value={0}>0 Bags (Hand-carry)</option>
                <option value={1}>1 Bag</option>
                <option value={2}>2 Bags</option>
                <option value={3}>3 Bags</option>
                <option value={4}>4 Bags</option>
                <option value={5}>5+ Bags</option>
              </select>
              <span className="text-[10px] text-charcoal-400 font-sans mt-1 block">
                Luggage / suitcases
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-gold w-full disabled:opacity-60"
          >
            {submitting ? 'Submitting Request...' : 'Submit Ride Request'}
          </button>
        </form>
      )}
    </div>
  );
}
