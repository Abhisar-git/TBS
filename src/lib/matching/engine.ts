/* ============================================================
   TBS — Dispatch & Matching Engine Orchestrator
   Main entry point executing batch dispatch and real-time matching
   ============================================================ */

import prisma from '@/lib/db/prisma';
import type { DriverProfile, GuestProfile, GeoPoint } from '@/types';
import { solveHungarianBipartiteMatching } from './batchSolver';
import { evaluatePairing } from './costFunction';
import { matchRealtimeGuest } from './greedyMatcher';
import { prioritizeWaitingGuests } from './starvationGuard';

export interface DispatchSummary {
  assignedCount: number;
  unassignedCount: number;
  tripsCreated: string[];
  matchedPairings: Array<{ driverId: string; guestProfileId: string; tripId: string }>;
}

/**
 * Execute real-time dispatch for a single guest (e.g. after an on-demand ride request is approved).
 */
export async function dispatchSingleGuest(guestProfileId: string): Promise<{
  success: boolean;
  tripId?: string;
  driverId?: string;
  message?: string;
}> {
  // 1. Fetch guest profile
  const guest = await prisma.guestProfile.findUnique({
    where: { id: guestProfileId },
    include: { user: true, accommodation: true },
  });

  if (!guest) {
    return { success: false, message: 'Guest profile not found' };
  }

  // Determine pickup and dropoff points
  const pickupLocation: GeoPoint = { lat: 28.5562, lng: 77.1000 }; // Default IGI T3 Airport
  const dropoffLocation: GeoPoint = guest.accommodation
    ? { lat: guest.accommodation.lat, lng: guest.accommodation.lng }
    : { lat: 28.6183, lng: 77.2426 }; // Default venue

  // 2. Fetch available drivers
  const availableDrivers = await prisma.driverProfile.findMany({
    where: { status: 'AVAILABLE' },
    include: { user: true },
  });

  const enRouteDrivers = await prisma.driverProfile.findMany({
    where: { status: { in: ['EN_ROUTE', 'ON_TRIP'] } },
    include: { user: true },
  });

  if (availableDrivers.length === 0 && enRouteDrivers.length === 0) {
    return { success: false, message: 'No drivers available at this moment. Guest remains in waiting queue.' };
  }

  // Convert Prisma profiles to domain model types
  const formattedAvailable: DriverProfile[] = availableDrivers.map((d) => ({
    id: d.id,
    userId: d.userId,
    vehicleNumber: d.vehicleNumber,
    vehicleModel: d.vehicleModel,
    seatCapacity: d.seatCapacity,
    luggageCapacity: d.luggageCapacity,
    status: d.status as DriverProfile['status'],
    currentLocation: d.currentLat && d.currentLng ? { lat: d.currentLat, lng: d.currentLng } : null,
    locationUpdatedAt: d.locationUpdatedAt ? d.locationUpdatedAt.toISOString() : null,
    availableAfter: d.breakUntil ? d.breakUntil.toISOString() : null,
    predictedFreeLocation: null,
    breakMinutesRemaining: 0,
  }));

  const formattedEnRoute: DriverProfile[] = enRouteDrivers.map((d) => ({
    id: d.id,
    userId: d.userId,
    vehicleNumber: d.vehicleNumber,
    vehicleModel: d.vehicleModel,
    seatCapacity: d.seatCapacity,
    luggageCapacity: d.luggageCapacity,
    status: d.status as DriverProfile['status'],
    currentLocation: d.currentLat && d.currentLng ? { lat: d.currentLat, lng: d.currentLng } : null,
    locationUpdatedAt: d.locationUpdatedAt ? d.locationUpdatedAt.toISOString() : null,
    availableAfter: d.breakUntil ? d.breakUntil.toISOString() : null,
    predictedFreeLocation: null,
    breakMinutesRemaining: 0,
  }));

  const formattedGuest: GuestProfile = {
    id: guest.id,
    userId: guest.userId,
    flightOrTrainNumber: guest.flightOrTrainNumber,
    arrivalEta: null,
    departureEta: null,
    pickupPoint: guest.pickupPoint || '',
    accommodationId: guest.accommodationId || '',
    groupSize: guest.groupSize,
    luggageCount: guest.luggageCount,
    status: guest.status as GuestProfile['status'],
  };

  // 3. Match guest to best driver
  const matchResult = await matchRealtimeGuest(
    formattedGuest,
    pickupLocation,
    dropoffLocation,
    formattedAvailable,
    formattedEnRoute
  );

  if (!matchResult.driver || !matchResult.evaluation?.isValid) {
    return { success: false, message: 'No suitable driver meeting capacity and route constraints found.' };
  }

  // 4. Create Trip record and update database states
  const matchedDriver = matchResult.driver;
  const trip = await prisma.trip.create({
    data: {
      tripType: 'ARRIVAL',
      driverId: matchedDriver.id,
      pickupAddress: guest.pickupPoint || 'Delhi Airport (T3)',
      pickupLat: pickupLocation.lat,
      pickupLng: pickupLocation.lng,
      dropoffAddress: guest.accommodation?.address || 'Bharat Mandapam, New Delhi',
      dropoffLat: dropoffLocation.lat,
      dropoffLng: dropoffLocation.lng,
      status: 'DRIVER_ASSIGNED',
      scheduledPickupTime: new Date(),
      estimatedDurationSec: matchResult.evaluation.travelTimeSec,
      distanceKm: Math.round((matchResult.evaluation.distanceM / 1000) * 10) / 10,
      passengers: {
        create: [
          {
            guestProfileId: guest.id,
            boardingStatus: 'WAITING',
          },
        ],
      },
    },
  });

  // Update guest status to ASSIGNED
  await prisma.guestProfile.update({
    where: { id: guest.id },
    data: { status: 'ASSIGNED' },
  });

  // Update driver status to EN_ROUTE
  await prisma.driverProfile.update({
    where: { id: matchedDriver.id },
    data: { status: 'EN_ROUTE' },
  });

  return {
    success: true,
    tripId: trip.id,
    driverId: matchedDriver.id,
    message: 'Driver assigned successfully.',
  };
}

/**
 * Run Hungarian Algorithm Batch Dispatch for all unassigned waiting guests.
 */
export async function runBatchDispatch(): Promise<DispatchSummary> {
  // 1. Fetch unassigned guests waiting for pickup
  const waitingGuests = await prisma.guestProfile.findMany({
    where: { status: 'WAITING' },
    include: { user: true, accommodation: true },
  });

  // 2. Fetch available drivers
  const availableDrivers = await prisma.driverProfile.findMany({
    where: { status: 'AVAILABLE' },
    include: { user: true },
  });

  if (waitingGuests.length === 0 || availableDrivers.length === 0) {
    return {
      assignedCount: 0,
      unassignedCount: waitingGuests.length,
      tripsCreated: [],
      matchedPairings: [],
    };
  }

  // Convert to domain objects and prioritize guests by starvation score
  const formattedGuests: GuestProfile[] = waitingGuests.map((g) => ({
    id: g.id,
    userId: g.userId,
    flightOrTrainNumber: g.flightOrTrainNumber,
    arrivalEta: null,
    departureEta: null,
    pickupPoint: g.pickupPoint || '',
    accommodationId: g.accommodationId || '',
    groupSize: g.groupSize,
    luggageCount: g.luggageCount,
    status: g.status as GuestProfile['status'],
  }));

  const prioritizedGuests = prioritizeWaitingGuests(formattedGuests);

  const formattedDrivers: DriverProfile[] = availableDrivers.map((d) => ({
    id: d.id,
    userId: d.userId,
    vehicleNumber: d.vehicleNumber,
    vehicleModel: d.vehicleModel,
    seatCapacity: d.seatCapacity,
    luggageCapacity: d.luggageCapacity,
    status: d.status as DriverProfile['status'],
    currentLocation: d.currentLat && d.currentLng ? { lat: d.currentLat, lng: d.currentLng } : null,
    locationUpdatedAt: d.locationUpdatedAt ? d.locationUpdatedAt.toISOString() : null,
    availableAfter: d.breakUntil ? d.breakUntil.toISOString() : null,
    predictedFreeLocation: null,
    breakMinutesRemaining: 0,
  }));

  // 3. Build NxM Cost Matrix (Drivers x Guests)
  const costMatrix: number[][] = [];
  for (let i = 0; i < formattedDrivers.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < prioritizedGuests.length; j++) {
      const driver = formattedDrivers[i];
      const guest = prioritizedGuests[j];
      const orig: GeoPoint = driver.currentLocation || { lat: 28.6183, lng: 77.2426 };
      const pickupLoc: GeoPoint = { lat: 28.5562, lng: 77.1000 };
      const dropLoc: GeoPoint = { lat: 28.5910, lng: 77.1725 };

      const evalRes = await evaluatePairing(driver, guest, pickupLoc, dropLoc);
      row.push(evalRes.isValid ? evalRes.cost : 1e9);
    }
    costMatrix.push(row);
  }

  // 4. Solve optimal matching via Hungarian Algorithm
  const solverResult = solveHungarianBipartiteMatching(costMatrix);

  const tripsCreated: string[] = [];
  const matchedPairings: Array<{ driverId: string; guestProfileId: string; tripId: string }> = [];

  for (let driverIdx = 0; driverIdx < solverResult.assignments.length; driverIdx++) {
    const guestIdx = solverResult.assignments[driverIdx];
    if (guestIdx !== -1 && guestIdx < prioritizedGuests.length) {
      const driver = formattedDrivers[driverIdx];
      const guest = prioritizedGuests[guestIdx];

      const pickupLoc: GeoPoint = { lat: 28.5562, lng: 77.1000 };
      const dropLoc: GeoPoint = { lat: 28.5910, lng: 77.1725 };

      const trip = await prisma.trip.create({
        data: {
          tripType: 'ARRIVAL',
          driverId: driver.id,
          pickupAddress: guest.pickupPoint || 'Delhi Airport (T3)',
          pickupLat: pickupLoc.lat,
          pickupLng: pickupLoc.lng,
          dropoffAddress: 'Taj Palace, New Delhi',
          dropoffLat: dropLoc.lat,
          dropoffLng: dropLoc.lng,
          status: 'DRIVER_ASSIGNED',
          scheduledPickupTime: new Date(),
          passengers: {
            create: [{ guestProfileId: guest.id, boardingStatus: 'WAITING' }],
          },
        },
      });

      await prisma.guestProfile.update({ where: { id: guest.id }, data: { status: 'ASSIGNED' } });
      await prisma.driverProfile.update({ where: { id: driver.id }, data: { status: 'EN_ROUTE' } });

      tripsCreated.push(trip.id);
      matchedPairings.push({ driverId: driver.id, guestProfileId: guest.id, tripId: trip.id });
    }
  }

  return {
    assignedCount: matchedPairings.length,
    unassignedCount: waitingGuests.length - matchedPairings.length,
    tripsCreated,
    matchedPairings,
  };
}
