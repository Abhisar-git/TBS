'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { useSSE } from '@/hooks/useSSE';
import type { DriverProfile, Trip, RideRequest } from '@/types';
import {
  Users,
  Car,
  Clock,
  RefreshCw,
  Search,
  Activity,
  Sparkles,
} from 'lucide-react';

// Dynamically import Leaflet Map to avoid SSR window errors
const AdminFleetMap = dynamic(() => import('@/components/maps/AdminFleetMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 bg-white rounded-3xl flex items-center justify-center border border-black/[0.04] shadow-soft">
      <div className="flex items-center gap-3 text-charcoal-400 font-sans text-xs">
        <div className="w-5 h-5 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
        <span>Initializing Operations Fleet Map...</span>
      </div>
    </div>
  ),
});

export default function AdminDashboard() {
  const { token } = useAuth('ADMIN');
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [waitingGuestsCount, setWaitingGuestsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    try {
      const [driversRes, tripsRes, reqRes, guestsRes] = await Promise.all([
        fetch('/api/drivers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/trips', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/ride-requests?status=PENDING', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/guests', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [driversData, tripsData, reqData, guestsData] = await Promise.all([
        driversRes.json(),
        tripsRes.json(),
        reqRes.json(),
        guestsRes.json(),
      ]);

      if (driversData.success) setDrivers(driversData.data || []);
      if (tripsData.success) setTrips(tripsData.data || []);
      if (reqData.success) setRequests(reqData.data || []);
      if (guestsData.success) {
        const waiting = (guestsData.data || []).filter((g: { status: string }) => g.status === 'WAITING').length;
        setWaitingGuestsCount(waiting);
      }
    } catch {
      // Ignore network errors on auto-refresh
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Subscribe to real-time SSE updates for fleet location & requests
  useSSE({
    url: '/api/events/admin-stream',
    token,
    onMessage: (event) => {
      if (event === 'location_update' || event === 'trip_status' || event === 'new_request') {
        fetchDashboardData();
      }
    },
  });

  const activeTripsCount = trips.filter((t) =>
    ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(t.status)
  ).length;

  const idleDriversCount = drivers.filter((d) => d.status === 'AVAILABLE').length;

  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch =
      (d.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
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
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 card-editorial bg-white">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl md:text-3xl text-charcoal-800">Operations Dashboard</h1>
            <span className="text-[10px] font-sans font-semibold px-3.5 py-1 rounded-full bg-champagne-100 text-gold-600 border border-champagne-200/50 uppercase tracking-widest">
              Delhi Fleet Concierge
            </span>
          </div>
          <p className="text-xs text-charcoal-400 font-sans leading-relaxed mt-1">
            Real-time fleet tracking, guest dispatch queue, and operational health metrics
          </p>
        </div>
        <button
          onClick={() => fetchDashboardData()}
          className="btn-secondary text-xs"
        >
          <RefreshCw className="w-4 h-4 text-gold-500" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Operations Metrics Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="metric-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gold-50 border border-gold-200/50 flex items-center justify-center text-gold-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="label-editorial !mb-0">Waiting Guests</p>
            <p className="font-serif text-2xl text-charcoal-800 mt-1">{waitingGuestsCount}</p>
          </div>
        </div>

        <div className="metric-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-champagne-100 border border-champagne-200/50 flex items-center justify-center text-champagne-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="label-editorial !mb-0">Active Transfers</p>
            <p className="font-serif text-2xl text-charcoal-800 mt-1">{activeTripsCount}</p>
          </div>
        </div>

        <div className="metric-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/50 flex items-center justify-center text-emerald-600">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <p className="label-editorial !mb-0">Idle Fleet</p>
            <p className="font-serif text-2xl text-charcoal-800 mt-1">{idleDriversCount}</p>
          </div>
        </div>

        <div className="metric-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blush-50 border border-blush-200/50 flex items-center justify-center text-blush-500">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="label-editorial !mb-0">Pending Requests</p>
            <p className="font-serif text-2xl text-charcoal-800 mt-1">{requests.length}</p>
          </div>
        </div>
      </div>

      {/* Fleet Operations Map Component */}
      <div className="space-y-4">
        <h2 className="font-serif text-xl text-charcoal-800">Live Fleet Operations Map</h2>
        <div className="rounded-3xl overflow-hidden shadow-soft border border-black/[0.04]">
          <AdminFleetMap drivers={drivers} trips={trips} />
        </div>
      </div>

      {/* Fleet Management Table Section */}
      <div className="card-editorial space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="font-serif text-xl text-charcoal-800">Driver Fleet Status</h2>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-charcoal-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search driver or plate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-editorial !pl-10 !py-2.5"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select-editorial !w-auto !py-2.5"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="EN_ROUTE">En Route</option>
              <option value="ON_TRIP">On Trip</option>
              <option value="ON_BREAK">On Break</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </div>
        </div>

        {/* Fleet Table */}
        <div className="overflow-x-auto">
          <table className="table-editorial">
            <thead>
              <tr>
                <th>Chauffeur</th>
                <th>Vehicle</th>
                <th>Capacities</th>
                <th>Status</th>
                <th>Current Trip</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((d) => (
                <tr key={d.id}>
                  <td className="font-medium text-charcoal-800">
                    <p className="font-sans font-semibold">{d.user?.name || 'Driver'}</p>
                    <p className="text-xs text-charcoal-400 font-sans">{d.user?.phone}</p>
                  </td>
                  <td>
                    <p className="font-mono text-xs text-gold-600 font-semibold">{d.vehicleNumber}</p>
                    <p className="text-xs text-charcoal-400 font-sans">{d.vehicleModel}</p>
                  </td>
                  <td className="text-xs text-charcoal-600 font-sans">
                    {d.seatCapacity} Seats &middot; {d.luggageCapacity} Luggage
                  </td>
                  <td>
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
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {d.status}
                    </span>
                  </td>
                  <td className="text-xs text-charcoal-400 font-sans">
                    {d.trips && d.trips[0] ? (
                      <span className="text-charcoal-700 font-medium">{d.trips[0].pickupAddress}</span>
                    ) : (
                      <span>None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
