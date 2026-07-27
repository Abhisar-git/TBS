'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Accommodation } from '@/types';
import { Building2, MapPin, Plus, X } from 'lucide-react';

export default function AdminAccommodationsPage() {
  const { token } = useAuth('ADMIN');
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('28.5910');
  const [lng, setLng] = useState('77.1725');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAccommodations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/accommodations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setAccommodations(data.data || []);
    } catch {
      // Ignore network error
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAccommodations();
  }, [fetchAccommodations]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/accommodations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          address,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setName('');
        setAddress('');
        fetchAccommodations();
      }
    } catch {
      // Handle error
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
    <div className="space-y-8 animate-fade-in">
      <div className="card-editorial space-y-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-sans font-semibold text-gold-500 uppercase tracking-[0.2em]">
            Lodging Partners
          </span>
          <h1 className="font-serif text-2xl md:text-3xl text-charcoal-800">Event Accommodations</h1>
          <p className="text-xs text-charcoal-400 font-sans leading-relaxed">
            Luxury hotels and guest lodging facilities configured for event dropoffs.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-gold text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Accommodation</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {accommodations.map((a) => (
          <div key={a.id} className="card-editorial space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-champagne-100 flex items-center justify-center text-gold-600">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-charcoal-800">{a.name}</h3>
                <p className="text-xs text-charcoal-400 font-sans flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{a.address}</span>
                </p>
              </div>
            </div>

            <div className="divider-editorial !my-0" />

            <div className="text-xs text-charcoal-400 font-sans flex justify-between items-center">
              <span>GPS Coordinates</span>
              <span className="font-mono text-gold-600 font-semibold">{a.lat.toFixed(4)}, {a.lng.toFixed(4)}</span>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content space-y-5">
            <div className="flex items-center justify-between border-b border-black/[0.04] pb-4">
              <h3 className="font-serif text-xl text-charcoal-800">Add New Accommodation</h3>
              <button onClick={() => setShowAddModal(false)} className="text-charcoal-400 hover:text-charcoal-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label-editorial">Hotel Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The Oberoi, New Delhi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-editorial"
                />
              </div>

              <div>
                <label className="label-editorial">Address</label>
                <input
                  type="text"
                  required
                  placeholder="Address details"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="input-editorial"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-editorial">Latitude</label>
                  <input
                    type="text"
                    required
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="input-editorial font-mono"
                  />
                </div>
                <div>
                  <label className="label-editorial">Longitude</label>
                  <input
                    type="text"
                    required
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="input-editorial font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-black/[0.04]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary text-xs !py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-gold text-xs !py-2.5"
                >
                  Save Hotel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
