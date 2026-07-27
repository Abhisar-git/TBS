'use client';

import { useEffect, useState } from 'react';
import type { DriverProfile, Trip } from '@/types';
import 'leaflet/dist/leaflet.css';

interface AdminFleetMapProps {
  drivers: DriverProfile[];
  trips: Trip[];
}

export default function AdminFleetMap({ drivers, trips }: AdminFleetMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const { MapContainer, TileLayer, Marker, Popup, Polyline } = require('react-leaflet');
  const L = require('leaflet');

  // Delhi center coordinates
  const center = { lat: 28.6183, lng: 77.2426 };

  // Custom driver icon
  const driverIcon = L.divIcon({
    className: 'custom-driver-icon',
    html: `<div style="background-color:#C5A059;width:24px;height:24px;border-radius:50%;border:2px solid #FFFFFF;box-shadow:0 0 10px rgba(197,160,89,0.5);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  return (
    <div className="w-full h-[450px] rounded-2xl overflow-hidden border border-bride-border shadow-lg relative">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={11}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Driver Position Markers */}
        {drivers.map((d) => {
          if (!d.currentLat || !d.currentLng) return null;
          return (
            <Marker
              key={d.id}
              position={[d.currentLat, d.currentLng]}
              icon={driverIcon}
            >
              <Popup>
                <div className="p-1 text-xs">
                  <p className="font-bold text-gray-900">{d.user?.name || 'Driver'}</p>
                  <p className="text-gray-600">{d.vehicleNumber} ({d.vehicleModel})</p>
                  <p className="text-amber-600 font-semibold mt-1">Status: {d.status}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Active Trip Routes */}
        {trips.map((t) => {
          if (!t.pickupLat || !t.pickupLng || !t.dropoffLat || !t.dropoffLng) return null;
          const positions: [number, number][] = [
            [t.pickupLat, t.pickupLng],
            [t.dropoffLat, t.dropoffLng],
          ];
          return (
            <Polyline
              key={t.id}
              positions={positions}
              pathOptions={{ color: '#8C1D2F', weight: 4, opacity: 0.8, dashArray: '8, 8' }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
