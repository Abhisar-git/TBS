'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { useSSE } from '@/hooks/useSSE';
import type { Trip } from '@/types';
import { Phone, Car, Sparkles, Navigation } from 'lucide-react';

const GuestTrackingMap = dynamic(() => import('@/components/maps/GuestTrackingMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 bg-white rounded-3xl border border-black/[0.04] shadow-soft flex flex-col items-center justify-center space-y-3">
      <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-charcoal-400 font-sans">Initializing Live Chauffeur Map...</span>
    </div>
  ),
});

export default function GuestTrackPage() {
  const { token } = useAuth('GUEST');
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveTrip = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/trips', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        const trip = data.data.find((t: Trip) =>
          ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(t.status)
        );
        setActiveTrip(trip || null);
        if (trip?.driver?.currentLat && trip?.driver?.currentLng) {
          setDriverLocation({ lat: trip.driver.currentLat, lng: trip.driver.currentLng });
        }
      }
    } catch {
      // Ignore network error
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchActiveTrip();
  }, [fetchActiveTrip]);

  // Subscribe to guest SSE stream for real-time location & status
  useSSE({
    url: '/api/events/stream',
    token,
    onMessage: (event, data: any) => {
      if (event === 'location_update' && data?.lat && data?.lng) {
        setDriverLocation({ lat: data.lat, lng: data.lng });
      } else if (event === 'trip_status') {
        fetchActiveTrip();
      }
    },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activeTrip) {
    return (
      <div className="card-editorial text-center space-y-4 py-12">
        <div className="w-14 h-14 rounded-full bg-champagne-100 flex items-center justify-center mx-auto text-gold-500">
          <Car className="w-6 h-6" />
        </div>
        <h3 className="font-serif text-xl text-charcoal-800">No Active Transfer to Track</h3>
        <p className="text-xs text-charcoal-400 max-w-xs mx-auto font-sans leading-relaxed">
          You currently have no chauffeur assigned or transfer in progress. Check back once your trip is dispatched.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Status Banner */}
      <div className="card-editorial !p-5 flex items-center justify-between">
        <div>
          <span className="label-editorial">Transfer Status</span>
          <p className="font-serif text-lg text-charcoal-800 uppercase tracking-tight">
            {activeTrip.status.replace(/_/g, ' ')}
          </p>
        </div>
        <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-200/50 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-gentle-pulse" />
          <span>Live Tracking</span>
        </span>
      </div>

      {/* Live Map */}
      <div className="rounded-3xl overflow-hidden shadow-soft border border-black/[0.04]">
        <GuestTrackingMap trip={activeTrip} liveLocation={driverLocation} />
      </div>

      {/* Driver & Vehicle Details Card */}
      {activeTrip.driver && (
        <div className="card-editorial space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-400 to-champagne-500 flex items-center justify-center text-white shadow-soft">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-charcoal-800">{activeTrip.driver.user?.name || 'Assigned Chauffeur'}</h3>
                <p className="text-xs text-charcoal-400 font-sans">{activeTrip.driver.vehicleModel}</p>
              </div>
            </div>

            <div className="text-right">
              <p className="font-mono text-sm font-semibold text-gold-600">{activeTrip.driver.vehicleNumber}</p>
              <span className="text-[10px] text-charcoal-400 font-sans uppercase tracking-wider">Fleet Vehicle</span>
            </div>
          </div>

          <div className="divider-editorial !my-0" />

          <div className="flex items-center justify-between text-xs">
            <span className="text-charcoal-400 font-sans">Chauffeur Contact</span>
            <a
              href={`tel:${activeTrip.driver.user?.phone}`}
              className="btn-emerald text-xs !px-5 !py-2.5"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Chauffeur</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
