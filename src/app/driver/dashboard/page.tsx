'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSSE } from '@/hooks/useSSE';
import type { Trip } from '@/types';
import { Car, Users, Check, X, ArrowRight } from 'lucide-react';

export default function DriverDashboard() {
  const router = useRouter();
  const { user, token } = useAuth('DRIVER');
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDriverTrip = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/trips', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        // Find active/assigned trip for driver
        const active = data.data.find((t: Trip) =>
          ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(t.status)
        );
        setCurrentTrip(active || null);
      }
    } catch {
      setError('Failed to load trip assignment');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDriverTrip();
  }, [fetchDriverTrip]);

  // Subscribe to driver SSE events
  useSSE({
    url: '/api/events/driver-stream',
    token,
    onMessage: (event) => {
      if (event === 'trip_assigned' || event === 'trip_status') {
        fetchDriverTrip();
      }
    },
  });

  const handleAccept = async () => {
    if (!currentTrip || !token) return;
    setActionLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/trips/${currentTrip.id}/accept`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        router.push('/driver/trip');
      } else {
        setError(data.error || 'Failed to accept trip');
      }
    } catch {
      setError('Network error. Failed to accept trip');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!currentTrip || !token) return;
    setActionLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/trips/${currentTrip.id}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCurrentTrip(null);
      } else {
        setError(data.error || 'Failed to reject trip');
      }
    } catch {
      setError('Network error. Failed to reject trip');
    } finally {
      setActionLoading(false);
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
          Chauffeur Console
        </span>
        <h1 className="font-serif text-2xl text-charcoal-800">Duty Dashboard</h1>
        <p className="text-xs text-charcoal-400 font-sans">Welcome back, {user?.name}</p>
      </div>

      {error && (
        <div className="px-5 py-4 bg-blush-50 border border-blush-200/50 text-blush-500 text-xs rounded-2xl">
          {error}
        </div>
      )}

      {!currentTrip ? (
        <div className="card-editorial text-center py-12 space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200/50 flex items-center justify-center text-emerald-600 mx-auto">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-200/50">
              AVAILABLE FOR DISPATCH
            </span>
            <h3 className="font-serif text-xl text-charcoal-800 mt-3">No Active Assignment</h3>
            <p className="text-xs text-charcoal-400 font-sans leading-relaxed max-w-xs mx-auto mt-1">
              You are currently available in the dispatch pool. New transfers will be assigned automatically.
            </p>
          </div>
        </div>
      ) : (
        <div className="card-editorial space-y-6">
          <div className="flex items-center justify-between">
            <span className="px-3.5 py-1.5 rounded-full bg-gold-50 text-gold-600 text-xs font-semibold border border-gold-200/50">
              {currentTrip.status.replace(/_/g, ' ')}
            </span>
            <span className="font-serif text-xs text-gold-600 uppercase tracking-widest font-medium">
              {currentTrip.tripType}
            </span>
          </div>

          <div className="bg-ivory-100/80 p-5 rounded-2xl border border-black/[0.04] space-y-3 text-xs">
            <div className="space-y-1">
              <span className="label-editorial">Pickup Address</span>
              <p className="text-charcoal-700 font-medium text-sm">{currentTrip.pickupAddress}</p>
            </div>
            <div className="divider-editorial !my-2" />
            <div className="space-y-1">
              <span className="label-editorial">Dropoff Address</span>
              <p className="text-charcoal-700 font-medium text-sm">{currentTrip.dropoffAddress}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-serif text-base text-charcoal-800">Passenger Manifesto</h4>
            {currentTrip.passengers.map((p) => (
              <div key={p.id} className="p-4 bg-ivory-100/60 rounded-2xl border border-black/[0.04] flex items-center justify-between text-xs font-sans">
                <div>
                  <span className="font-semibold text-charcoal-800 block">
                    {p.guestProfile?.user?.name || 'Guest'}
                  </span>
                  <span className="text-charcoal-400">
                    {p.guestProfile?.groupSize || 1} Person(s) &middot; {p.guestProfile?.luggageCount || 1} Luggage
                  </span>
                </div>
              </div>
            ))}
          </div>

          {currentTrip.status === 'DRIVER_ASSIGNED' ? (
            <div className="space-y-3 pt-2">
              <button
                onClick={handleAccept}
                disabled={actionLoading}
                className="btn-emerald w-full text-xs !py-3.5"
              >
                <Check className="w-4 h-4" />
                <span>{actionLoading ? 'Accepting...' : 'Accept Transfer'}</span>
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="btn-danger w-full text-xs !py-3.5"
              >
                <X className="w-4 h-4" />
                <span>Decline Assignment</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push('/driver/trip')}
              className="btn-gold w-full text-xs !py-3.5 group"
            >
              <span>Open Navigation View</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
