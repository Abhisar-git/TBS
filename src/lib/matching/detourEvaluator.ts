/* ============================================================
   TBS — Opportunistic Detour Evaluator
   Evaluates mid-trip pickup insertions for en-route drivers
   ============================================================ */

import type { DriverProfile, GuestProfile, GeoPoint } from '@/types';
import { getCachedDistance } from '@/lib/maps/distanceCache';
import { evaluatePairing, type PairingEvaluation } from './costFunction';

export interface DetourConfig {
  maxDetourTimeMinutes: number;   // Maximum added trip time allowed for detour (default 10 mins)
  maxEtaSlipMinutes: number;      // Maximum delay allowed for existing passengers (default 5 mins)
}

export const DEFAULT_DETOUR_CONFIG: DetourConfig = {
  maxDetourTimeMinutes: 10,
  maxEtaSlipMinutes: 5,
};

export interface DetourEvaluation extends PairingEvaluation {
  originalRouteDurationSec: number;
  detourRouteDurationSec: number;
  passengerEtaSlipSec: number;
}

/**
 * Evaluate if an en-route driver can insert an additional guest pickup without violating schedule bounds.
 */
export async function evaluateDetourInsertion(
  driver: DriverProfile,
  existingDropoff: GeoPoint,
  newGuest: GuestProfile,
  newPickup: GeoPoint,
  newDropoff: GeoPoint,
  config: DetourConfig = DEFAULT_DETOUR_CONFIG
): Promise<DetourEvaluation> {
  const driverPos: GeoPoint = driver.currentLocation || { lat: 28.6183, lng: 77.2426 };

  // 1. Calculate original route: Driver -> Existing Dropoff
  const originalRoute = await getCachedDistance(driverPos, existingDropoff);
  const originalDurationSec = originalRoute.durationSec;

  // 2. Calculate detour route: Driver -> New Pickup -> New Dropoff -> Existing Dropoff
  const seg1 = await getCachedDistance(driverPos, newPickup);
  const seg2 = await getCachedDistance(newPickup, newDropoff);
  const seg3 = await getCachedDistance(newDropoff, existingDropoff);

  const detourDurationSec = seg1.durationSec + seg2.durationSec + seg3.durationSec;
  const addedDetourSec = detourDurationSec - originalDurationSec;

  const maxAllowedDetourSec = config.maxDetourTimeMinutes * 60;
  const maxAllowedSlipSec = config.maxEtaSlipMinutes * 60;

  // Evaluate base pairing costs
  const basePairing = await evaluatePairing(driver, newGuest, newPickup, newDropoff);

  if (!basePairing.isValid) {
    return {
      ...basePairing,
      originalRouteDurationSec: originalDurationSec,
      detourRouteDurationSec: detourDurationSec,
      passengerEtaSlipSec: addedDetourSec,
    };
  }

  // Validate detour thresholds
  if (addedDetourSec > maxAllowedDetourSec) {
    return {
      ...basePairing,
      cost: Infinity,
      isValid: false,
      isDetour: true,
      detourTimeSec: addedDetourSec,
      originalRouteDurationSec: originalDurationSec,
      detourRouteDurationSec: detourDurationSec,
      passengerEtaSlipSec: addedDetourSec,
      rejectionReason: `Added detour duration (${Math.round(addedDetourSec / 60)} mins) exceeds threshold (${config.maxDetourTimeMinutes} mins)`,
    };
  }

  // Adjusted cost including detour penalty
  const detourPenalty = addedDetourSec * 1.8;
  const finalCost = basePairing.cost + detourPenalty;

  return {
    ...basePairing,
    cost: finalCost,
    isDetour: true,
    detourTimeSec: addedDetourSec,
    originalRouteDurationSec: originalDurationSec,
    detourRouteDurationSec: detourDurationSec,
    passengerEtaSlipSec: addedDetourSec,
    isValid: true,
  };
}
