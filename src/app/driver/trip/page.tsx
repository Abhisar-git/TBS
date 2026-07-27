'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLocationTracker } from '@/hooks/useLocation';
import type { Trip } from '@/types';
import { Navigation, Check, MapPin, User, ArrowRight } from 'lucide-react';

export default function DriverTripPage() {
  const router = useRouter();
  const { token } = useAuth('DRIVER');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const fetchActiveTrip = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/trips', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        const active = data.data.find((t: Trip) =>
          ['DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(t.status)
        );
        setTrip(active || null);
      }
    } catch {
      setError('Failed to fetch active trip');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchActiveTrip();
  }, [fetchActiveTrip]);

  // Activate continuous location tracking when on an active trip
  const isTripActive = Boolean(trip && ['DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(trip.status));
  useLocationTracker({
    active: isTripActive,
    intervalMs: 4000,
  });

  const updateTripStatus = async (nextStatus: string) => {
    if (!trip || !token) return;
    setUpdating(true);
    setError('');

    try {
      const res = await fetch(`/api/trips/${trip.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        if (nextStatus === 'COMPLETED') {
          router.push('/driver/dashboard');
        } else {
          setTrip(data.data);
        }
      } else {
        setError(data.error || 'Failed to update status');
      }
    } catch {
      setError('Network error. Failed to update trip status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="card-editorial text-center py-12 space-y-4">
        <div className="w-14 h-14 rounded-full bg-champagne-100 flex items-center justify-center text-gold-500 mx-auto">
          <Navigation className="w-6 h-6" />
        </div>
        <h2 className="font-serif text-xl text-charcoal-800">No Active Navigation Trip</h2>
        <p className="text-xs text-charcoal-400 font-sans leading-relaxed max-w-xs mx-auto">
          You have no transfer currently in progress.
        </p>
        <button onClick={() => router.push('/driver/dashboard')} className="btn-primary text-xs">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card-editorial !p-5 flex items-center justify-between">
        <div>
          <span className="label-editorial">Navigation Status</span>
          <p className="font-serif text-lg text-charcoal-800 uppercase tracking-tight">
            {trip.status.replace(/_/g, ' ')}
          </p>
        </div>
        <span className="px-3.5 py-1.5 rounded-full bg-gold-50 text-gold-600 text-xs font-semibold border border-gold-200/50 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gold-400 animate-gentle-pulse" />
          <span>Active GPS</span>
        </span>
      </div>

      {error && (
        <div className="px-5 py-4 bg-blush-50 border border-blush-200/50 text-blush-500 text-xs rounded-2xl">
          {error}
        </div>
      )}

      <div className="card-editorial space-y-5">
        <div className="space-y-4">
          <div className="bg-ivory-100/80 p-5 rounded-2xl border border-black/[0.04] space-y-3 text-xs">
            <div className="space-y-1">
              <span className="label-editorial">Pickup Location</span>
              <p className="text-charcoal-700 font-medium text-sm">{trip.pickupAddress}</p>
            </div>
            <div className="divider-editorial !my-2" />
            <div className="space-y-1">
              <span className="label-editorial">Dropoff Destination</span>
              <p className="text-charcoal-700 font-medium text-sm">{trip.dropoffAddress}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-serif text-base text-charcoal-800">Passenger Boarding</h4>
          {trip.passengers.map((p) => (
            <div key={p.id} className="p-4 bg-ivory-100/60 rounded-2xl border border-black/[0.04] flex items-center justify-between text-xs font-sans">
              <span className="font-semibold text-charcoal-800">{p.guestProfile?.user?.name || 'Guest'}</span>
              <span className="px-3 py-1 rounded-full bg-champagne-100 text-gold-700 font-semibold border border-champagne-200/50">
                {p.boardingStatus}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2">
        {trip.status === 'DRIVER_EN_ROUTE' && (
          <button
            onClick={() => updateTripStatus('DRIVER_ARRIVED')}
            disabled={updating}
            className="btn-gold w-full text-xs !py-4"
          >
            {updating ? 'Updating...' : 'Arrived at Pickup Location'}
          </button>
        )}

        {trip.status === 'DRIVER_ARRIVED' && (
          <button
            onClick={() => updateTripStatus('IN_PROGRESS')}
            disabled={updating}
            className="btn-emerald w-full text-xs !py-4"
          >
            {updating ? 'Updating...' : 'Guest Boarded — Begin Trip'}
          </button>
        )}

        {trip.status === 'IN_PROGRESS' && (
          <button
            onClick={() => updateTripStatus('COMPLETED')}
            disabled={updating}
            className="btn-emerald w-full text-xs !py-4"
          >
            {updating ? 'Completing...' : 'Arrived at Destination (Complete Transfer)'}
          </button>
        )}
      </div>
    </div>
  );
}
