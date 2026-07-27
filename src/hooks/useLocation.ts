'use client';

import { useEffect, useRef, useState } from 'react';

interface LocationTrackerOptions {
  active: boolean;
  intervalMs?: number;
  onLocationUpdate?: (lat: number, lng: number) => void;
}

export function useLocationTracker({
  active,
  intervalMs = 5000,
  onLocationUpdate,
}: LocationTrackerOptions) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!active) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
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
      const newPos = { lat: latitude, lng: longitude };
      setPosition(newPos);
      setError(null);
      onLocationUpdate?.(latitude, longitude);

      sendLocation(latitude, longitude, heading || 0, speed || 0);
    };

    const handleError = (err: GeolocationPositionError) => {
      setError(err.message);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 10000,
    });

    intervalRef.current = setInterval(() => {
      if (position) {
        sendLocation(position.lat, position.lng);
      }
    }, intervalMs);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [active, intervalMs, onLocationUpdate, position]);

  return { position, error };
}
