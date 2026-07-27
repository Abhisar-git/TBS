'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { GuestProfile, Accommodation, DriverProfile } from '@/types';
import { Search, Edit3, UserCheck, X } from 'lucide-react';

export default function AdminGuestsPage() {
  const { token } = useAuth('ADMIN');
  const [guests, setGuests] = useState<GuestProfile[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal States
  const [editingGuest, setEditingGuest] = useState<GuestProfile | null>(null);
  const [assigningGuest, setAssigningGuest] = useState<GuestProfile | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [gRes, aRes, dRes] = await Promise.all([
        fetch('/api/guests', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/accommodations', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/drivers', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [gData, aData, dData] = await Promise.all([
        gRes.json(),
        aRes.json(),
        dRes.json(),
      ]);

      if (gData.success) setGuests(gData.data || []);
      if (aData.success) setAccommodations(aData.data || []);
      if (dData.success) setDrivers(dData.data || []);
    } catch {
      // Ignore network error
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuest || !token) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/guests/${editingGuest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          flightOrTrainNumber: editingGuest.flightOrTrainNumber,
          groupSize: editingGuest.groupSize,
          luggageCount: editingGuest.luggageCount,
          pickupPoint: editingGuest.pickupPoint,
          accommodationId: editingGuest.accommodationId,
          status: editingGuest.status,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingGuest(null);
        fetchData();
      }
    } catch {
      // Handle error
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningGuest || !selectedDriverId || !token) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tripType: 'ARRIVAL',
          driverId: selectedDriverId,
          pickupAddress: assigningGuest.pickupPoint || 'Delhi Airport (T3)',
          pickupLat: 28.5562,
          pickupLng: 77.1000,
          dropoffAddress: assigningGuest.accommodation?.address || 'Taj Palace, New Delhi',
          dropoffLat: 28.5910,
          dropoffLng: 77.1725,
          guestProfileIds: [assigningGuest.id],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAssigningGuest(null);
        setSelectedDriverId('');
        fetchData();
      }
    } catch {
      // Handle error
    } finally {
      setActionLoading(false);
    }
  };

  const filteredGuests = guests.filter((g) => {
    const matchesSearch =
      (g.user?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (g.user?.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (g.flightOrTrainNumber || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="card-editorial space-y-2">
        <span className="text-[10px] font-sans font-semibold text-gold-500 uppercase tracking-[0.2em]">
          Guest Concierge Directory
        </span>
        <h1 className="font-serif text-2xl md:text-3xl text-charcoal-800">Guest Directory</h1>
        <p className="text-xs text-charcoal-400 font-sans leading-relaxed">
          Manage event guests, update arrival details, and manually assign drivers.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-editorial !p-5 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-charcoal-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or flight/train..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-editorial !pl-10 !py-2.5"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select-editorial !w-auto !py-2.5"
        >
          <option value="ALL">All Statuses</option>
          <option value="REGISTERED">Registered</option>
          <option value="WAITING">Waiting Pickup</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="ARRIVED">Arrived</option>
        </select>
      </div>

      {/* Guest Directory Table */}
      <div className="card-editorial space-y-4">
        <div className="overflow-x-auto">
          <table className="table-editorial">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Travel / Flight</th>
                <th>Accommodation</th>
                <th>Group Size</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((g) => (
                <tr key={g.id}>
                  <td className="font-medium text-charcoal-800">
                    <p className="font-sans font-semibold">{g.user?.name || 'Guest'}</p>
                    <p className="text-xs text-charcoal-400 font-sans">{g.user?.email}</p>
                  </td>
                  <td className="text-xs text-charcoal-600 font-sans">
                    <p className="font-mono text-gold-600 font-semibold">{g.flightOrTrainNumber || 'N/A'}</p>
                    <p className="text-charcoal-400 truncate max-w-xs">{g.pickupPoint}</p>
                  </td>
                  <td className="text-xs text-charcoal-600 font-sans">
                    {g.accommodation?.name || 'Unassigned'}
                  </td>
                  <td className="text-xs text-charcoal-600 font-sans">
                    {g.groupSize} Person(s) &middot; {g.luggageCount} Luggage
                  </td>
                  <td>
                    <span
                      className={`badge-status ${
                        g.status === 'ARRIVED'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/50'
                          : g.status === 'ASSIGNED'
                          ? 'bg-champagne-100 text-gold-700 border border-champagne-200/50'
                          : g.status === 'WAITING'
                          ? 'bg-gold-50 text-gold-600 border border-gold-200/50'
                          : 'bg-ivory-200 text-charcoal-400'
                      }`}
                    >
                      {g.status}
                    </span>
                  </td>
                  <td className="text-right space-x-2">
                    <button
                      onClick={() => setEditingGuest(g)}
                      className="p-2 rounded-xl bg-ivory-100 hover:bg-champagne-100 text-charcoal-600 border border-black/[0.04] transition-colors duration-400"
                      title="Edit Details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setAssigningGuest(g)}
                      className="p-2 rounded-xl bg-champagne-100 hover:bg-gold-400 text-gold-600 hover:text-white border border-champagne-200/50 transition-colors duration-400"
                      title="Manual Assign Driver"
                    >
                      <UserCheck className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Guest Modal */}
      {editingGuest && (
        <div className="modal-overlay">
          <div className="modal-content space-y-5">
            <div className="flex items-center justify-between border-b border-black/[0.04] pb-4">
              <h3 className="font-serif text-xl text-charcoal-800">Edit Guest Record</h3>
              <button onClick={() => setEditingGuest(null)} className="text-charcoal-400 hover:text-charcoal-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateGuest} className="space-y-4">
              <div>
                <label className="label-editorial">Flight / Train Number</label>
                <input
                  type="text"
                  value={editingGuest.flightOrTrainNumber || ''}
                  onChange={(e) => setEditingGuest({ ...editingGuest, flightOrTrainNumber: e.target.value })}
                  className="input-editorial uppercase font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-editorial">Group Size</label>
                  <input
                    type="number"
                    value={editingGuest.groupSize}
                    onChange={(e) => setEditingGuest({ ...editingGuest, groupSize: parseInt(e.target.value) || 1 })}
                    className="input-editorial"
                  />
                </div>
                <div>
                  <label className="label-editorial">Luggage Count</label>
                  <input
                    type="number"
                    value={editingGuest.luggageCount}
                    onChange={(e) => setEditingGuest({ ...editingGuest, luggageCount: parseInt(e.target.value) || 1 })}
                    className="input-editorial"
                  />
                </div>
              </div>

              <div>
                <label className="label-editorial">Accommodation</label>
                <select
                  value={editingGuest.accommodationId || ''}
                  onChange={(e) => setEditingGuest({ ...editingGuest, accommodationId: e.target.value })}
                  className="select-editorial"
                >
                  <option value="">Select Accommodation</option>
                  {accommodations.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-editorial">Status</label>
                <select
                  value={editingGuest.status}
                  onChange={(e) => setEditingGuest({ ...editingGuest, status: e.target.value as GuestProfile['status'] })}
                  className="select-editorial"
                >
                  <option value="REGISTERED">REGISTERED</option>
                  <option value="WAITING">WAITING</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_TRANSIT">IN_TRANSIT</option>
                  <option value="ARRIVED">ARRIVED</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-black/[0.04]">
                <button
                  type="button"
                  onClick={() => setEditingGuest(null)}
                  className="btn-secondary text-xs !py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-gold text-xs !py-2.5"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Assign Driver Modal */}
      {assigningGuest && (
        <div className="modal-overlay">
          <div className="modal-content space-y-5">
            <div className="flex items-center justify-between border-b border-black/[0.04] pb-4">
              <h3 className="font-serif text-xl text-charcoal-800">Manual Override Assignment</h3>
              <button onClick={() => setAssigningGuest(null)} className="text-charcoal-400 hover:text-charcoal-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-charcoal-400 font-sans leading-relaxed">
              Assign driver manually for guest <strong className="text-charcoal-800 font-semibold">{assigningGuest.user?.name}</strong>.
            </p>

            <form onSubmit={handleManualAssign} className="space-y-4">
              <div>
                <label className="label-editorial">Select Driver</label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="select-editorial"
                  required
                >
                  <option value="">Choose Driver...</option>
                  {drivers
                    .filter((d) => d.status === 'AVAILABLE')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.user?.name || 'Driver'} - {d.vehicleNumber} ({d.seatCapacity} seats)
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-black/[0.04]">
                <button
                  type="button"
                  onClick={() => setAssigningGuest(null)}
                  className="btn-secondary text-xs !py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !selectedDriverId}
                  className="btn-gold text-xs !py-2.5"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
