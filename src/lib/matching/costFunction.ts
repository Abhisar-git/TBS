/* ============================================================
   TBS — Matching Engine Cost & Scoring Function
   Weighted objective cost function for driver-to-guest pairing
   ============================================================ */

import type { DriverProfile, GuestProfile, GeoPoint } from "@/types";
import { getCachedDistance } from "@/lib/maps/distanceCache";

export interface MatchingWeights {
	w1_travelTime: number; // Weight for travel time to pickup (seconds)
	w2_waitTime: number; // Anti-starvation weight (seconds waited)
	w3_capacityWaste: number; // Penalty for oversized vehicle selection
	w4_breakViolation: number; // Penalty for interrupting scheduled rest break
	w5_detourTime: number; // Penalty for added detour time
	w6_clusterBonus: number; // Bonus for same-destination grouping
}

export const DEFAULT_WEIGHTS: MatchingWeights = {
	w1_travelTime: 1.0,
	w2_waitTime: 2.5,
	w3_capacityWaste: 15.0,
	w4_breakViolation: 500.0,
	w5_detourTime: 1.8,
	w6_clusterBonus: 120.0,
};

export interface PairingEvaluation {
	cost: number;
	travelTimeSec: number;
	distanceM: number;
	capacityFit: number;
	waitTimeSec: number;
	detourTimeSec: number;
	isDetour: boolean;
	isValid: boolean;
	rejectionReason?: string;
}

/**
 * Evaluate the suitability and numerical cost of pairing a driver with a guest (or group of guests).
 * Lower cost indicates a superior match.
 */
export async function evaluatePairing(
	driver: DriverProfile,
	guest: GuestProfile,
	pickupLocation: GeoPoint,
	dropoffLocation: GeoPoint,
	weights: MatchingWeights = DEFAULT_WEIGHTS,
): Promise<PairingEvaluation> {
	// 1. Capacity Validation
	const remainingSeats = driver.seatCapacity - (guest.groupSize || 1);
	const remainingLuggage = driver.luggageCapacity - (guest.luggageCount || 1);

	if (remainingSeats < 0) {
		return {
			cost: Infinity,
			travelTimeSec: Infinity,
			distanceM: Infinity,
			capacityFit: remainingSeats,
			waitTimeSec: 0,
			detourTimeSec: 0,
			isDetour: false,
			isValid: false,
			rejectionReason: `Vehicle seat capacity (${driver.seatCapacity}) insufficient for group size (${guest.groupSize})`,
		};
	}

	if (remainingLuggage < 0) {
		return {
			cost: Infinity,
			travelTimeSec: Infinity,
			distanceM: Infinity,
			capacityFit: remainingLuggage,
			waitTimeSec: 0,
			detourTimeSec: 0,
			isDetour: false,
			isValid: false,
			rejectionReason: `Vehicle luggage capacity (${driver.luggageCapacity}) insufficient for luggage count (${guest.luggageCount})`,
		};
	}

	// 2. Driver Status Validation
	if (driver.status === "OFFLINE" || driver.status === "UNAVAILABLE") {
		return {
			cost: Infinity,
			travelTimeSec: Infinity,
			distanceM: Infinity,
			capacityFit: 0,
			waitTimeSec: 0,
			detourTimeSec: 0,
			isDetour: false,
			isValid: false,
			rejectionReason: `Driver status is ${driver.status}`,
		};
	}

	// 3. Driver Rest Break Check
	let breakPenalty = 0;
	if (driver.status === "ON_BREAK" && driver.breakMinutesRemaining > 0) {
		breakPenalty =
			driver.breakMinutesRemaining * 60 * weights.w4_breakViolation;
	}

	// 4. Determine driver origin coordinates
	const driverOrigin: GeoPoint = driver.currentLocation || {
		lat: 28.6183, // Default Delhi center if unknown
		lng: 77.2426,
	};

	// 5. Compute Travel Distance & Duration
	const routeDist = await getCachedDistance(driverOrigin, pickupLocation);
	const travelTimeSec = routeDist.durationSec;
	const distanceM = routeDist.distanceM;

	// 6. Calculate Guest Wait Time (Anti-Starvation)
	let waitTimeSec = 0;
	if (guest.arrivalEta) {
		const arrivalMs = new Date(guest.arrivalEta).getTime();
		const nowMs = Date.now();
		if (nowMs > arrivalMs) {
			waitTimeSec = Math.floor((nowMs - arrivalMs) / 1000);
		}
	}

	// 7. Calculate Capacity Utilization Fit (Penalize unused seats)
	const capacityWastePenalty = remainingSeats * weights.w3_capacityWaste;

	// 8. Compute Total Cost
	const cost =
		weights.w1_travelTime * travelTimeSec -
		weights.w2_waitTime * waitTimeSec +
		capacityWastePenalty +
		breakPenalty;

	return {
		cost,
		travelTimeSec,
		distanceM,
		capacityFit: remainingSeats,
		waitTimeSec,
		detourTimeSec: 0,
		isDetour: false,
		isValid: true,
	};
}
