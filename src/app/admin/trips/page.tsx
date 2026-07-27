'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Trip, DriverProfile } from '@/types';
import { X, ShieldAlert } from 'lucide-react';

export default function AdminTripsPage() {
  const { token } = useAuth('ADMIN');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [reassignTrip, setReassignTrip] = useState<Trip | null>(null);
  const [newDriverId, setNewDriverId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTripsAndDrivers = useCallback(async () => {
    if (!token) return;
    try {
      const [tRes, dRes] = await Promise.all([
        fetch('/api/trips', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/drivers', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [tData, dData] = await Promise.all([tRes.json(), dRes.json()]);

      if (tData.success) setTrips(tData.data || []);
      if (dData.success) setDrivers(dData.data || []);
    } catch {
      // Ignore network error
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTripsAndDrivers();
  }, [fetchTripsAndDrivers]);

  const handleManualReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignTrip || !newDriverId || !token) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/trips/${reassignTrip.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'DRIVER_ASSIGNED', driverId: newDriverId }),
      });
      const data = await res.json();
      if (data.success) {
        setReassignTrip(null);
        setNewDriverId('');
        fetchTripsAndDrivers();
      }
    } catch {
      // Handle error
    } finally {
      setActionLoading(false);
    }
  };

  const filteredTrips = trips.filter((t) => statusFilter === 'ALL' || t.status === statusFilter);

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
            Real-Time Monitor
          </span>
          <h1 className="font-serif text-2xl md:text-3xl text-charcoal-800">Trip Monitor & Reassignment</h1>
          <p className="text-xs text-charcoal-400 font-sans leading-relaxed">
            Real-time status monitoring for all event trips with admin manual override capability.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select-editorial !w-auto !py-2.5"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="DRIVER_ASSIGNED">Driver Assigned</option>
          <option value="DRIVER_EN_ROUTE">En Route</option>
          <option value="DRIVER_ARRIVED">Arrived at Pickup</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      <div className="card-editorial space-y-4">
        <div className="overflow-x-auto">
          <table className="table-editorial">
            <thead>
              <tr>
                <th>Trip Type</th>
                <th>Chauffeur</th>
                <th>Pickup Address</th>
                <th>Dropoff Address</th>
                <th>Status</th>
                <th className="text-right">Override</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.map((t) => (
                <tr key={t.id}>
                  <td className="font-serif text-gold-600 text-xs uppercase font-medium">
                    {t.tripType}
                  </td>
                  <td className="font-medium text-charcoal-800">
                    {t.driver ? (
                      <div>
                        <p className="font-sans font-semibold">{t.driver.user?.name}</p>
                        <p className="text-xs text-charcoal-400 font-mono">{t.driver.vehicleNumber}</p>
                      </div>
                    ) : (
                      <span className="text-charcoal-400 font-sans">Unassigned</span>
                    )}
                  </td>
                  <td className="text-xs text-charcoal-600 font-sans truncate max-w-xs">{t.pickupAddress}</td>
                  <td className="text-xs text-charcoal-600 font-sans truncate max-w-xs">{t.dropoffAddress}</td>
                  <td>
                    <span
                      className={`badge-status ${
                        t.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/50'
                          : t.status === 'IN_PROGRESS' || t.status === 'DRIVER_EN_ROUTE'
                          ? 'bg-champagne-100 text-gold-700 border border-champagne-200/50'
                          : t.status === 'DRIVER_ASSIGNED'
                          ? 'bg-gold-50 text-gold-600 border border-gold-200/50'
                          : 'bg-ivory-200 text-charcoal-400'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="text-right">
                    {t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && (
                      <button
                        onClick={() => setReassignTrip(t)}
                        className="btn-gold text-xs !py-1.5 !px-3.5"
                      >
                        Override Driver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Override Modal */}
      {reassignTrip && (
        <div className="modal-overlay">
          <div className="modal-content space-y-5">
            <div className="flex items-center justify-between border-b border-black/[0.04] pb-4">
              <h3 className="font-serif text-xl text-charcoal-800 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-gold-500" />
                <span>Manual Driver Override</span>
              </h3>
              <button onClick={() => setReassignTrip(null)} className="text-charcoal-400 hover:text-charcoal-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-charcoal-400 font-sans leading-relaxed">
              Manually select a chauffeur to override assignment for transfer ({reassignTrip.pickupAddress} $\rightarrow$ {reassignTrip.dropoffAddress}).
            </p>

            <form onSubmit={handleManualReassign} className="space-y-4">
              <div>
                <label className="label-editorial">Select New Chauffeur</label>
                <select
                  value={newDriverId}
                  onChange={(e) => setNewDriverId(e.target.value)}
                  className="select-editorial"
                  required
                >
                  <option value="">Choose Driver...</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.user?.name || 'Driver'} - {d.vehicleNumber} ({d.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-black/[0.04]">
                <button
                  type="button"
                  onClick={() => setReassignTrip(null)}
                  className="btn-secondary text-xs !py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !newDriverId}
                  className="btn-gold text-xs !py-2.5"
                >
                  Apply Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
