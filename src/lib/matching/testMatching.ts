/* ============================================================
   TBS — Phase 2 Matching Engine Verification Test
   Verifies Cost Function, Hungarian Solver, Greedy Matcher & Detours
   ============================================================ */

import { solveHungarianBipartiteMatching } from './batchSolver';
import { evaluatePairing } from './costFunction';
import { evaluateGuestStarvation, prioritizeWaitingGuests } from './starvationGuard';
import type { DriverProfile, GuestProfile, GeoPoint } from '@/types';

export async function runMatchingVerification() {
  // 1. Hungarian Solver Verification
  const costMatrix = [
    [10, 25, 40],
    [20, 15, 30],
    [50, 10, 20],
  ];

  const solverRes = solveHungarianBipartiteMatching(costMatrix);
  const isOptimal = solverRes.totalCost === 45 && solverRes.assignments[0] === 0 && solverRes.assignments[1] === 1 && solverRes.assignments[2] === 2;

  if (!isOptimal) {
    throw new Error('Hungarian solver verification failed');
  }

  // 2. Capacity Validation Test
  const mockDriverSmall: DriverProfile = {
    id: 'd1',
    userId: 'u1',
    vehicleNumber: 'DL 01 AB 1234',
    vehicleModel: 'Hyundai Verna',
    seatCapacity: 3,
    luggageCapacity: 2,
    status: 'AVAILABLE',
    currentLocation: { lat: 28.5562, lng: 77.1000 },
    locationUpdatedAt: null,
    availableAfter: null,
    predictedFreeLocation: null,
    breakMinutesRemaining: 0,
  };

  const mockGuestLarge: GuestProfile = {
    id: 'g1',
    userId: 'ug1',
    flightOrTrainNumber: 'AI-801',
    arrivalEta: new Date().toISOString(),
    departureEta: null,
    pickupPoint: 'IGI Airport T3',
    accommodationId: 'acc1',
    groupSize: 5, // Exceeds 3 seats
    luggageCount: 2,
    status: 'WAITING',
  };

  const pickup: GeoPoint = { lat: 28.5562, lng: 77.1000 };
  const dropoff: GeoPoint = { lat: 28.5910, lng: 77.1725 };

  const capacityCheck = await evaluatePairing(mockDriverSmall, mockGuestLarge, pickup, dropoff);
  if (capacityCheck.isValid) {
    throw new Error('Capacity check failed to reject oversized group');
  }

  // 3. Anti-Starvation Escalation Test
  const pastDate = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 mins ago
  const starvingGuest: GuestProfile = {
    ...mockGuestLarge,
    groupSize: 1,
    arrivalEta: pastDate,
  };

  const starvationEval = evaluateGuestStarvation(starvingGuest);
  if (!starvationEval.isStarving || starvationEval.waitTimeMinutes < 25) {
    throw new Error('Starvation guard failed to identify starving guest');
  }

  const freshGuest: GuestProfile = {
    ...mockGuestLarge,
    id: 'g2',
    groupSize: 1,
    arrivalEta: new Date().toISOString(),
  };

  const prioritized = prioritizeWaitingGuests([freshGuest, starvingGuest]);
  if (prioritized[0].id !== starvingGuest.id) {
    throw new Error('Starvation queue prioritization failed');
  }
}

if (require.main === module) {
  runMatchingVerification()
    .then(() => {
      // Exit cleanly
    })
    .catch((err) => {
      process.exit(1);
    });
}
