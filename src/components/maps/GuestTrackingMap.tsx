'use client';

import { useEffect, useState } from 'react';
import type { Trip } from '@/types';
import 'leaflet/dist/leaflet.css';

interface GuestTrackingMapProps {
  trip: Trip;
  liveLocation: { lat: number; lng: number } | null;
}

export default function GuestTrackingMap({ trip, liveLocation }: GuestTrackingMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const { MapContainer, TileLayer, Marker, Popup, Polyline } = require('react-leaflet');
  const L = require('leaflet');

  const pickupLat = trip.pickupLat ?? 28.5562;
  const pickupLng = trip.pickupLng ?? 77.1000;
  const dropoffLat = trip.dropoffLat ?? 28.5910;
  const dropoffLng = trip.dropoffLng ?? 77.1725;

  const driverPos = liveLocation || { lat: pickupLat, lng: pickupLng };

  const driverIcon = L.divIcon({
    className: 'custom-driver-pin',
    html: `<div style="background-color:#C5A059;width:28px;height:28px;border-radius:50%;border:3px solid #FFFFFF;box-shadow:0 0 12px rgba(197,160,89,0.8);"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  const routePositions: [number, number][] = [
    [driverPos.lat, driverPos.lng],
    [dropoffLat, dropoffLng],
  ];

  return (
    <div className="w-full h-80 rounded-2xl overflow-hidden border border-bride-border shadow-lg relative">
      <MapContainer
        center={[driverPos.lat, driverPos.lng]}
        zoom={13}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <Marker position={[driverPos.lat, driverPos.lng]} icon={driverIcon}>
          <Popup>
            <div className="p-1 text-xs">
              <p className="font-bold text-gray-900">{trip.driver?.user?.name || 'Driver'}</p>
              <p className="text-gray-600">{trip.driver?.vehicleNumber}</p>
            </div>
          </Popup>
        </Marker>

        <Polyline
          positions={routePositions}
          pathOptions={{ color: '#8C1D2F', weight: 5, opacity: 0.8 }}
        />
      </MapContainer>
    </div>
  );
}
