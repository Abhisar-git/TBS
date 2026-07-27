'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { DriverProfile } from '@/types';
import { Car, UserPlus, X, MapPin } from 'lucide-react';

export default function AdminDriversPage() {
  const { token } = useAuth('ADMIN');
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('driver123');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [seatCapacity, setSeatCapacity] = useState(4);
  const [luggageCapacity, setLuggageCapacity] = useState(3);

  const fetchDrivers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/drivers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setDrivers(data.data || []);
      }
    } catch {
      // Ignore network errors
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setActionLoading(true);
    setError('');

    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          vehicleNumber,
          vehicleModel,
          seatCapacity,
          luggageCapacity,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        // Reset form
        setName('');
        setEmail('');
        setPhone('');
        setVehicleNumber('');
        setVehicleModel('');
        fetchDrivers();
      } else {
        setError(data.error || 'Failed to onboard driver');
      }
    } catch {
      setError('Network error onboarding driver');
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
            Chauffeur Fleet Spec
          </span>
          <h1 className="font-serif text-2xl md:text-3xl text-charcoal-800">Driver Fleet Management</h1>
          <p className="text-xs text-charcoal-400 font-sans leading-relaxed">
            Pre-registered driver accounts, vehicle capacity specs, and fleet status control.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-gold text-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>Onboard New Chauffeur</span>
        </button>
      </div>

      {/* Driver Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {drivers.map((d) => (
          <div key={d.id} className="card-editorial space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-champagne-100 flex items-center justify-center text-gold-600">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-serif text-base text-charcoal-800">{d.user?.name || 'Driver'}</p>
                  <p className="text-xs text-charcoal-400 font-sans">{d.user?.phone}</p>
                </div>
              </div>
              <span
                className={`badge-status ${
                  d.status === 'AVAILABLE'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/50'
                    : d.status === 'ON_BREAK'
                    ? 'bg-gold-50 text-gold-600 border border-gold-200/50'
                    : d.status === 'EN_ROUTE' || d.status === 'ON_TRIP'
                    ? 'bg-champagne-100 text-gold-700 border border-champagne-200/50'
                    : 'bg-ivory-200 text-charcoal-400'
                }`}
              >
                {d.status}
              </span>
            </div>

            <div className="bg-ivory-100/80 p-4 rounded-2xl border border-black/[0.04] space-y-2 text-xs font-sans">
              <div className="flex justify-between">
                <span className="text-charcoal-400">Plate Number</span>
                <span className="font-mono font-semibold text-gold-600">{d.vehicleNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-400">Vehicle Model</span>
                <span className="text-charcoal-700 font-medium">{d.vehicleModel || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-400">Capacities</span>
                <span className="text-charcoal-700">{d.seatCapacity} Seats &middot; {d.luggageCapacity} Bags</span>
              </div>
            </div>

            {d.currentLat && d.currentLng && (
              <div className="flex items-center gap-1.5 text-xs text-charcoal-400 font-sans pt-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">GPS: {d.currentLat.toFixed(4)}, {d.currentLng.toFixed(4)}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Onboard Driver Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content space-y-5">
            <div className="flex items-center justify-between border-b border-black/[0.04] pb-4">
              <h3 className="font-serif text-xl text-charcoal-800">Onboard New Chauffeur</h3>
              <button onClick={() => setShowAddModal(false)} className="text-charcoal-400 hover:text-charcoal-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="px-5 py-3.5 bg-blush-50 border border-blush-200/50 text-blush-500 text-xs rounded-2xl">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateDriver} className="space-y-4">
              <div>
                <label className="label-editorial">Driver Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Singh"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-editorial"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-editorial">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="driver@tbs.event"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-editorial"
                  />
                </div>
                <div>
                  <label className="label-editorial">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98100 00000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-editorial"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-editorial">Vehicle Number</label>
                  <input
                    type="text"
                    required
                    placeholder="DL 01 AB 1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="input-editorial uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="label-editorial">Vehicle Model</label>
                  <input
                    type="text"
                    placeholder="Toyota Innova"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="input-editorial"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-editorial">Seat Capacity</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={12}
                    value={seatCapacity}
                    onChange={(e) => setSeatCapacity(parseInt(e.target.value) || 4)}
                    className="input-editorial"
                  />
                </div>
                <div>
                  <label className="label-editorial">Luggage Capacity</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={12}
                    value={luggageCapacity}
                    onChange={(e) => setLuggageCapacity(parseInt(e.target.value) || 3)}
                    className="input-editorial"
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
                  Register Chauffeur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
