/* ============================================================
   TBS — Real-Time Greedy Matcher
   Sub-second real-time driver matching for on-demand guest requests
   ============================================================ */

import type { DriverProfile, GuestProfile, GeoPoint } from '@/types';
import { evaluatePairing, type PairingEvaluation } from './costFunction';
import { evaluateDetourInsertion } from './detourEvaluator';

export interface RealtimeMatchResult {
  driver: DriverProfile | null;
  evaluation: PairingEvaluation | null;
  isDetour: boolean;
  matchedAt: string;
}

/**
 * Match a single guest profile to the best available driver in real time.
 */
export async function matchRealtimeGuest(
  guest: GuestProfile,
  pickupLocation: GeoPoint,
  dropoffLocation: GeoPoint,
  availableDrivers: DriverProfile[],
  enRouteDrivers: DriverProfile[] = []
): Promise<RealtimeMatchResult> {
  let bestDriver: DriverProfile | null = null;
  let bestEvaluation: PairingEvaluation | null = null;

  // 1. Evaluate all AVAILABLE drivers
  for (const driver of availableDrivers) {
    if (driver.status !== 'AVAILABLE') continue;

    const evaluation = await evaluatePairing(driver, guest, pickupLocation, dropoffLocation);
    if (evaluation.isValid && (!bestEvaluation || evaluation.cost < bestEvaluation.cost)) {
      bestDriver = driver;
      bestEvaluation = evaluation;
    }
  }

  // 2. Evaluate EN_ROUTE drivers for detour insertion if no idle driver is optimal
  for (const driver of enRouteDrivers) {
    if (driver.status !== 'EN_ROUTE' && driver.status !== 'ON_TRIP') continue;

    // Check if remaining capacity exists
    if (driver.seatCapacity - (guest.groupSize || 1) < 0) continue;

    // Evaluate detour insertion assuming driver is heading to their current dropoff
    const fakeDropoff: GeoPoint = { lat: 28.6183, lng: 77.2426 }; // Fallback venue
    const detourEval = await evaluateDetourInsertion(
      driver,
      fakeDropoff,
      guest,
      pickupLocation,
      dropoffLocation
    );

    if (detourEval.isValid && (!bestEvaluation || detourEval.cost < bestEvaluation.cost)) {
      bestDriver = driver;
      bestEvaluation = detourEval;
    }
  }

  return {
    driver: bestDriver,
    evaluation: bestEvaluation,
    isDetour: bestEvaluation?.isDetour || false,
    matchedAt: new Date().toISOString(),
  };
}
