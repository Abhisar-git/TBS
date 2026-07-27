'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { BatchAssignmentResult } from '@/types';
import { Zap, Users, Car, CheckCircle2 } from 'lucide-react';

export default function AdminBatchPage() {
  const { token } = useAuth('ADMIN');
  const [waitingCount, setWaitingCount] = useState(0);
  const [driverCount, setDriverCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [runningBatch, setRunningBatch] = useState(false);
  const [batchResult, setBatchResult] = useState<any>(null);
  const [error, setError] = useState('');

  const fetchQueueStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/dispatch/batch', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setWaitingCount(data.data.waitingGuests || 0);
        setDriverCount(data.data.availableDrivers || 0);
      }
    } catch {
      // Ignore network error
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchQueueStats();
  }, [fetchQueueStats]);

  const handleRunBatch = async () => {
    if (!token) return;
    setRunningBatch(true);
    setError('');
    setBatchResult(null);

    try {
      const res = await fetch('/api/dispatch/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setBatchResult(data.data);
        fetchQueueStats();
      } else {
        setError(data.error || 'Failed to execute batch dispatch');
      }
    } catch {
      setError('Network error running Hungarian batch optimization');
    } finally {
      setRunningBatch(false);
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
      <div className="card-editorial space-y-2">
        <span className="text-[10px] font-sans font-semibold text-gold-500 uppercase tracking-[0.2em]">
          Optimization Solver
        </span>
        <h1 className="font-serif text-2xl md:text-3xl text-charcoal-800 flex items-center gap-3">
          <Zap className="w-6 h-6 text-gold-500" />
          <span>Pre-Day Scheduled Batch Dispatch</span>
        </h1>
        <p className="text-xs text-charcoal-400 font-sans leading-relaxed">
          Executes the $O(N^3)$ Hungarian bipartite matching algorithm to find global minimum cost pairings for scheduled guest arrivals.
        </p>
      </div>

      {error && (
        <div className="px-5 py-4 bg-blush-50 border border-blush-200/50 text-blush-500 text-xs rounded-2xl">
          {error}
        </div>
      )}

      {/* Queue Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="metric-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gold-50 border border-gold-200/50 flex items-center justify-center text-gold-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="label-editorial !mb-0">Waiting Guests in Queue</p>
            <p className="font-serif text-2xl text-charcoal-800 mt-1">{waitingCount}</p>
          </div>
        </div>

        <div className="metric-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/50 flex items-center justify-center text-emerald-600">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <p className="label-editorial !mb-0">Available Idle Drivers</p>
            <p className="font-serif text-2xl text-charcoal-800 mt-1">{driverCount}</p>
          </div>
        </div>
      </div>

      {/* Action Trigger Card */}
      <div className="card-editorial space-y-5 text-center py-10">
        <h3 className="font-serif text-xl text-charcoal-800">Trigger Optimization Solver</h3>
        <p className="text-xs text-charcoal-400 font-sans max-w-md mx-auto leading-relaxed">
          The solver evaluates capacity constraints, travel distances, and guest wait times to generate optimal assignments.
        </p>
        <button
          onClick={handleRunBatch}
          disabled={runningBatch || waitingCount === 0 || driverCount === 0}
          className="btn-gold text-xs disabled:opacity-50"
        >
          {runningBatch ? 'Solving Bipartite Matrix...' : 'Run Hungarian Batch Solver'}
        </button>
      </div>

      {/* Solver Results View */}
      {batchResult && (
        <div className="card-editorial space-y-5">
          <h3 className="font-serif text-xl text-charcoal-800 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Batch Dispatch Results</span>
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs font-sans">
            <div className="p-5 bg-ivory-100/80 rounded-2xl border border-black/[0.04] space-y-1">
              <span className="label-editorial">Assigned Guests</span>
              <p className="font-serif text-2xl text-emerald-600">{batchResult.assignedCount}</p>
            </div>
            <div className="p-5 bg-ivory-100/80 rounded-2xl border border-black/[0.04] space-y-1">
              <span className="label-editorial">Remaining Unassigned</span>
              <p className="font-serif text-2xl text-gold-600">{batchResult.unassignedCount}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
