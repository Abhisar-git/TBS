'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Trip } from '@/types';
import { Clock, CheckCircle2, MapPin } from 'lucide-react';

export default function GuestHistoryPage() {
  const { token } = useAuth('GUEST');
  const [completedTrips, setCompletedTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/trips?status=COMPLETED', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCompletedTrips(data.data);
      }
    } catch {
      // Ignore network error
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card-editorial space-y-2">
        <span className="text-[10px] font-sans font-semibold text-gold-500 uppercase tracking-[0.2em]">
          Concierge Archive
        </span>
        <h1 className="font-serif text-2xl text-charcoal-800">Transfer History</h1>
        <p className="text-xs text-charcoal-400 font-sans">Summary of your completed luxury transfers.</p>
      </div>

      {completedTrips.length === 0 ? (
        <div className="card-editorial text-center py-12 text-charcoal-400 text-xs font-sans">
          No completed transfers recorded yet.
        </div>
      ) : (
        <div className="space-y-4">
          {completedTrips.map((trip) => (
            <div key={trip.id} className="card-editorial space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-200/50">
                  COMPLETED
                </span>
                <span className="text-xs text-charcoal-400 font-sans">
                  {new Date(trip.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="bg-ivory-100/80 p-4 rounded-2xl border border-black/[0.04] space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="label-editorial !mb-0">From</span>
                  <span className="text-charcoal-700 font-medium truncate max-w-[200px]">{trip.pickupAddress}</span>
                </div>
                <div className="divider-editorial !my-1.5" />
                <div className="flex justify-between items-center">
                  <span className="label-editorial !mb-0">To</span>
                  <span className="text-charcoal-700 font-medium truncate max-w-[200px]">{trip.dropoffAddress}</span>
                </div>
              </div>

              {trip.driver && (
                <div className="text-xs text-charcoal-400 font-sans flex justify-between items-center pt-1">
                  <span>Chauffeur: {trip.driver.user?.name}</span>
                  <span className="font-mono text-gold-600 font-semibold">{trip.driver.vehicleNumber}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
