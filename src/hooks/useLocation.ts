'use client';

import { useEffect, useRef, useState } from 'react';

interface LocationTrackerOptions {
  active: boolean;
  intervalMs?: number;
  onLocationUpdate?: (lat: number, lng: number) => void;
}

export function useLocationTracker({
  active,
  intervalMs = 10000,
  onLocationUpdate,
}: LocationTrackerOptions) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);
  const callbackRef = useRef(onLocationUpdate);

  useEffect(() => {
    callbackRef.current = onLocationUpdate;
  }, [onLocationUpdate]);

  useEffect(() => {
    if (!active) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    const sendLocation = async (lat: number, lng: number, heading = 0, speed = 0) => {
      const token = localStorage.getItem('tbs-token');
      if (!token) return;

      // Throttle server updates to once every intervalMs (default 10s)
      const now = Date.now();
      if (now - lastSentRef.current < intervalMs) return;
      lastSentRef.current = now;

      try {
        await fetch('/api/drivers/location', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ lat, lng, heading, speed }),
        });
      } catch {
        // Silently ignore network errors during background updates
      }
    };

    const handleSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, heading, speed } = pos.coords;
      setPosition({ lat: latitude, lng: longitude });
      setError(null);
      callbackRef.current?.(latitude, longitude);
      sendLocation(latitude, longitude, heading || 0, speed || 0);
    };

    const handleError = (err: GeolocationPositionError) => {
      setError(err.message);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000,
    });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [active, intervalMs]);

  return { position, error };
}
