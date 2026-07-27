'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { DELHI_LOCATIONS } from '@/lib/maps/locations';
import type { RideRequest } from '@/types';
import { Clock, AlertCircle, Sparkles } from 'lucide-react';

export default function GuestRequestPage() {
  const router = useRouter();
  const { token } = useAuth('GUEST');
  const [pendingRequest, setPendingRequest] = useState<RideRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [pickupPoint, setPickupPoint] = useState(DELHI_LOCATIONS.airport.address);
  const [dropoffPoint, setDropoffPoint] = useState(DELHI_LOCATIONS.accommodations[0].address);

  const fetchExistingRequests = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/ride-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        const pending = data.data.find((r: RideRequest) => r.status === 'PENDING');
        setPendingRequest(pending || null);
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
          Need an unscheduled transfer? Submit your request for instant dispatch review.
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
