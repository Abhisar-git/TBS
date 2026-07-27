'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { DriverProfile } from '@/types';
import { Coffee, Clock } from 'lucide-react';

export default function DriverBreakPage() {
  const { user, token } = useAuth('DRIVER');
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const fetchDriverProfile = useCallback(async () => {
    if (!token || !user) return;
    try {
      const res = await fetch('/api/drivers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        const ownProfile = data.data.find((d: DriverProfile) => d.userId === user.id);
        setDriver(ownProfile || null);
      }
    } catch {
      setError('Failed to fetch driver status');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    fetchDriverProfile();
  }, [fetchDriverProfile]);

  const handleBreak = async (action: 'start' | 'end', minutes = 15) => {
    if (!driver || !token) return;
    setUpdating(true);
    setError('');

    try {
      const res = await fetch(`/api/drivers/${driver.id}/break`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, minutes }),
      });
      const data = await res.json();
      if (data.success) {
        setDriver(data.data);
      } else {
        setError(data.error || 'Failed to update break status');
      }
    } catch {
      setError('Network error. Failed to update break');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isOnBreak = driver?.status === 'ON_BREAK';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card-editorial space-y-2">
        <span className="text-[10px] font-sans font-semibold text-gold-500 uppercase tracking-[0.2em]">
          Duty Rest Management
        </span>
        <h1 className="font-serif text-2xl text-charcoal-800">Driver Break Timer</h1>
        <p className="text-xs text-charcoal-400 font-sans">Manage your scheduled rest breaks.</p>
      </div>

      {error && (
        <div className="px-5 py-4 bg-blush-50 border border-blush-200/50 text-blush-500 text-xs rounded-2xl">
          {error}
        </div>
      )}

      <div className="card-editorial !p-5 flex items-center justify-between">
        <span className="label-editorial !mb-0">Current Duty Status</span>
        <span
          className={`badge-status ${
            isOnBreak
              ? 'bg-gold-50 text-gold-600 border border-gold-200/50'
              : 'bg-emerald-50 text-emerald-600 border border-emerald-200/50'
          }`}
        >
          {driver?.status || 'AVAILABLE'}
        </span>
      </div>

      {isOnBreak ? (
        <div className="card-editorial space-y-6 text-center border-gold-200/40 py-10">
          <div className="w-16 h-16 rounded-full bg-champagne-100 flex items-center justify-center text-gold-500 mx-auto">
            <Coffee className="w-7 h-7 animate-gentle-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-xl text-charcoal-800">Rest Break in Progress</h3>
            <p className="text-xs text-charcoal-400 font-sans leading-relaxed max-w-xs mx-auto">
              You are currently on a scheduled break. The dispatch engine will hold new assignments until your break concludes.
            </p>
          </div>
          <button
            onClick={() => handleBreak('end')}
            disabled={updating}
            className="btn-emerald w-full text-xs !py-3.5"
          >
            {updating ? 'Ending Break...' : 'End Break & Resume Duty'}
          </button>
        </div>
      ) : (
        <div className="card-editorial space-y-6 py-8 text-center">
          <div className="w-14 h-14 rounded-full bg-ivory-200 flex items-center justify-center text-gold-500 mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-xl text-charcoal-800">Schedule a Rest Break</h3>
            <p className="text-xs text-charcoal-400 font-sans leading-relaxed max-w-xs mx-auto">
              Select break duration. You will not receive new trip dispatches during your break.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <button
              onClick={() => handleBreak('start', 15)}
              disabled={updating}
              className="btn-secondary text-xs !px-4 !py-3"
            >
              15 Mins
            </button>
            <button
              onClick={() => handleBreak('start', 30)}
              disabled={updating}
              className="btn-secondary text-xs !px-4 !py-3"
            >
              30 Mins
            </button>
            <button
              onClick={() => handleBreak('start', 45)}
              disabled={updating}
              className="btn-secondary text-xs !px-4 !py-3"
            >
              45 Mins
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
