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
 * Resolve geographic coordinates for a given address string or accommodation entity.
 */
export function getCoordinatesForLocation(
  address?: string | null,
  accommodation?: { lat: number; lng: number; address: string } | null
): GeoPoint {
  if (accommodation?.lat && accommodation?.lng) {
    return { lat: accommodation.lat, lng: accommodation.lng };
  }

  const addr = (address || '').toLowerCase();
  if (addr.includes('airport') || addr.includes('t3')) {
    return { lat: 28.5562, lng: 77.1000 };
  }
  if (addr.includes('anand vihar') || addr.includes('anvt')) {
    return { lat: 28.6508, lng: 77.3152 };
  }
  if (addr.includes('railway') || addr.includes('station') || addr.includes('ndls') || addr.includes('paharganj')) {
    return { lat: 28.6430, lng: 77.2194 };
  }

  // Default venue coordinate (Bharat Mandapam, New Delhi)
  return { lat: 28.6186, lng: 77.2486 };
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

  // Determine dynamic pickup and dropoff points based on guest profile data
  const pickupLocation = getCoordinatesForLocation(guest.pickupPoint, null);
  const dropoffLocation = getCoordinatesForLocation(
    guest.accommodation?.address,
    guest.accommodation
  );

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
    arrivalEta: guest.arrivalEta ? guest.arrivalEta.toISOString() : null,
    departureEta: guest.departureEta ? guest.departureEta.toISOString() : null,
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

  // 4. Create Trip record and update database states atomically via Prisma Transaction
  const matchedDriver = matchResult.driver;
  const pickupAddressStr = guest.pickupPoint || 'Pickup Point';
  const dropoffAddressStr = guest.accommodation?.name
    ? `${guest.accommodation.name}, ${guest.accommodation.address}`
    : 'Bharat Mandapam, New Delhi';

  const [trip] = await prisma.$transaction([
    prisma.trip.create({
      data: {
        tripType: 'ARRIVAL',
        driverId: matchedDriver.id,
        pickupAddress: pickupAddressStr,
        pickupLat: pickupLocation.lat,
        pickupLng: pickupLocation.lng,
        dropoffAddress: dropoffAddressStr,
        dropoffLat: dropoffLocation.lat,
        dropoffLng: dropoffLocation.lng,
        status: 'DRIVER_ASSIGNED',
        scheduledPickupAt: new Date(),
        passengers: {
          create: [
            {
              guestProfileId: guest.id,
              boardingStatus: 'WAITING',
            },
          ],
        },
      },
    }),
    prisma.guestProfile.update({
      where: { id: guest.id },
      data: { status: 'ASSIGNED' },
    }),
    prisma.driverProfile.update({
      where: { id: matchedDriver.id },
      data: { status: 'EN_ROUTE' },
    }),
  ]);

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
    arrivalEta: g.arrivalEta ? g.arrivalEta.toISOString() : null,
    departureEta: g.departureEta ? g.departureEta.toISOString() : null,
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

  // Build map of guest ID to DB object for fast lookup of accommodation details
  const waitingGuestsMap = new Map(waitingGuests.map((g) => [g.id, g]));

  // 3. Build NxM Cost Matrix (Drivers x Guests) using dynamic coordinates per guest
  const costMatrix: number[][] = [];
  for (let i = 0; i < formattedDrivers.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < prioritizedGuests.length; j++) {
      const driver = formattedDrivers[i];
      const guest = prioritizedGuests[j];
      const dbGuest = waitingGuestsMap.get(guest.id);

      const pickupLoc: GeoPoint = getCoordinatesForLocation(guest.pickupPoint, null);
      const dropLoc: GeoPoint = getCoordinatesForLocation(
        dbGuest?.accommodation?.address,
        dbGuest?.accommodation
      );

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
      const dbGuest = waitingGuestsMap.get(guest.id);

      const pickupLoc: GeoPoint = getCoordinatesForLocation(guest.pickupPoint, null);
      const dropLoc: GeoPoint = getCoordinatesForLocation(
        dbGuest?.accommodation?.address,
        dbGuest?.accommodation
      );

      const pickupAddressStr = guest.pickupPoint || 'Pickup Location';
      const dropoffAddressStr = dbGuest?.accommodation?.name
        ? `${dbGuest.accommodation.name}, ${dbGuest.accommodation.address}`
        : 'Bharat Mandapam, New Delhi';

      // Atomic transaction per matched pair
      const [trip] = await prisma.$transaction([
        prisma.trip.create({
          data: {
            tripType: 'ARRIVAL',
            driverId: driver.id,
            pickupAddress: pickupAddressStr,
            pickupLat: pickupLoc.lat,
            pickupLng: pickupLoc.lng,
            dropoffAddress: dropoffAddressStr,
            dropoffLat: dropLoc.lat,
            dropoffLng: dropLoc.lng,
            status: 'DRIVER_ASSIGNED',
            scheduledPickupAt: new Date(),
            passengers: {
              create: [{ guestProfileId: guest.id, boardingStatus: 'WAITING' }],
            },
          },
        }),
        prisma.guestProfile.update({ where: { id: guest.id }, data: { status: 'ASSIGNED' } }),
        prisma.driverProfile.update({ where: { id: driver.id }, data: { status: 'EN_ROUTE' } }),
      ]);

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
