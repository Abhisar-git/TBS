'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { RideRequest } from '@/types';
import { Clock, Check, X, User, MapPin, CheckCircle, XCircle } from 'lucide-react';

export default function AdminRideRequestsPage() {
  const { token } = useAuth('ADMIN');
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/ride-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRequests(data.data || []);
      }
    } catch {
      // Ignore network errors
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (reqId: string, guestProfileId: string) => {
    if (!token) return;
    setActionLoading(reqId);
    setMessage(null);

    try {
      // 1. Approve ride request
      const approveRes = await fetch(`/api/ride-requests/${reqId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const approveData = await approveRes.json();

      if (!approveData.success) {
        setMessage({ type: 'error', text: approveData.error || 'Failed to approve request' });
        setActionLoading(null);
        return;
      }

      // 2. Trigger automatic single guest dispatch
      const dispatchRes = await fetch('/api/dispatch/realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ guestProfileId }),
      });
      const dispatchData = await dispatchRes.json();

      if (dispatchData.success) {
        setMessage({
          type: 'success',
          text: 'Request approved and chauffeur automatically assigned by matching engine!',
        });
      } else {
        setMessage({
          type: 'success',
          text: 'Request approved. Guest queued for next available driver.',
        });
      }

      fetchRequests();
    } catch {
      setMessage({ type: 'error', text: 'Network error processing request' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (reqId: string) => {
    if (!token) return;
    setActionLoading(reqId);
    setMessage(null);

    try {
      const res = await fetch(`/api/ride-requests/${reqId}/decline`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Declined by Ops Coordinator' }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Ride request declined.' });
        fetchRequests();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to decline request' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error processing request' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const resolvedRequests = requests.filter((r) => r.status !== 'PENDING');

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="card-editorial space-y-2">
        <span className="text-[10px] font-sans font-semibold text-gold-500 uppercase tracking-[0.2em]">
          Concierge Queue
        </span>
        <h1 className="font-serif text-2xl md:text-3xl text-charcoal-800">Ride Requests Queue</h1>
        <p className="text-xs text-charcoal-400 font-sans leading-relaxed">
          Review and approve on-demand ride requests raised by guests. Approval triggers automatic driver dispatch.
        </p>
      </div>

      {message && (
        <div
          className={`px-5 py-4 rounded-2xl text-xs font-sans flex items-center gap-2.5 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/50'
              : 'bg-blush-50 text-blush-500 border border-blush-200/50'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-4.5 h-4.5 shrink-0" /> : <XCircle className="w-4.5 h-4.5 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Pending Requests Section */}
      <div className="space-y-4">
        <h2 className="font-serif text-xl text-charcoal-800 flex items-center gap-2">
          <span>Pending Approvals ({pendingRequests.length})</span>
        </h2>

        {pendingRequests.length === 0 ? (
          <div className="card-editorial text-center py-12 text-charcoal-400 text-xs font-sans">
            <Clock className="w-8 h-8 mx-auto text-gold-400 mb-3 opacity-60" />
            <p>No pending ride requests at this moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="card-editorial space-y-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-champagne-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-gold-500" />
                    </div>
                    <span className="font-serif text-base text-charcoal-800">
                      {req.guestProfile?.user?.name || 'Guest'}
                    </span>
                  </div>
                  <span className="text-xs text-charcoal-400 font-sans">
                    {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="space-y-3 text-xs bg-ivory-100/80 p-4 rounded-2xl border border-black/[0.04]">
                  <div className="space-y-1">
                    <span className="label-editorial">Pickup</span>
                    <p className="text-charcoal-700 font-medium text-sm">{req.pickupPoint}</p>
                  </div>
                  <div className="divider-editorial !my-1.5" />
                  <div className="space-y-1">
                    <span className="label-editorial">Dropoff</span>
                    <p className="text-charcoal-700 font-medium text-sm">{req.dropoffPoint}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => handleApprove(req.id, req.guestProfileId)}
                    disabled={actionLoading === req.id}
                    className="btn-emerald flex-1 text-xs !py-3"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve & Dispatch</span>
                  </button>
                  <button
                    onClick={() => handleDecline(req.id)}
                    disabled={actionLoading === req.id}
                    className="btn-danger text-xs !py-3"
                  >
                    <X className="w-4 h-4" />
                    <span>Decline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolved Requests Section */}
      {resolvedRequests.length > 0 && (
        <div className="card-editorial space-y-4">
          <h2 className="font-serif text-xl text-charcoal-800">Resolved Requests History</h2>
          <div className="overflow-x-auto">
            <table className="table-editorial">
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Approved By</th>
                </tr>
              </thead>
              <tbody>
                {resolvedRequests.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium text-charcoal-800 font-sans">
                      {r.guestProfile?.user?.name || 'Guest'}
                    </td>
                    <td className="text-xs text-charcoal-400 font-sans">
                      {r.pickupPoint} → {r.dropoffPoint}
                    </td>
                    <td>
                      <span
                        className={`badge-status ${
                          r.status === 'APPROVED' || r.status === 'MATCHED'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/50'
                            : 'bg-blush-50 text-blush-500 border border-blush-200/50'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="text-xs text-charcoal-400 font-sans">
                      {r.approvedBy?.name || 'Ops Admin'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
