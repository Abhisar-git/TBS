/* ============================================================
   TBS — Anti-Starvation Guard & Priority Escalator
   Ensures guests who have waited longer receive priority dispatch
   ============================================================ */

import type { GuestProfile } from '@/types';

export interface StarvationStatus {
  guestProfileId: string;
  guestName: string;
  waitTimeMinutes: number;
  isStarving: boolean;
  priorityScore: number;
}

const STARVATION_THRESHOLD_MINUTES = 15;
const CRITICAL_STARVATION_THRESHOLD_MINUTES = 25;

/**
 * Calculate the wait time and starvation priority score for a guest profile.
 */
export function evaluateGuestStarvation(guest: GuestProfile): StarvationStatus {
  const guestName = guest.user?.name || 'Guest';

  let waitTimeMs = 0;
  if (guest.arrivalEta) {
    const arrivalMs = new Date(guest.arrivalEta).getTime();
    const nowMs = Date.now();
    if (nowMs > arrivalMs) {
      waitTimeMs = nowMs - arrivalMs;
    }
  }

  const waitTimeMinutes = Math.floor(waitTimeMs / (1000 * 60));
  const isStarving = waitTimeMinutes >= STARVATION_THRESHOLD_MINUTES;

  // Escalating priority score
  let priorityScore = waitTimeMinutes;
  if (waitTimeMinutes >= CRITICAL_STARVATION_THRESHOLD_MINUTES) {
    priorityScore *= 3.0; // Critical multiplier
  } else if (isStarving) {
    priorityScore *= 1.8;
  }

  return {
    guestProfileId: guest.id,
    guestName,
    waitTimeMinutes,
    isStarving,
    priorityScore,
  };
}

/**
 * Sort a list of waiting guest profiles by anti-starvation priority (highest priority first).
 */
export function prioritizeWaitingGuests<T extends GuestProfile>(guests: T[]): T[] {
  return [...guests].sort((a, b) => {
    const evalA = evaluateGuestStarvation(a);
    const evalB = evaluateGuestStarvation(b);
    return evalB.priorityScore - evalA.priorityScore;
  });
}
