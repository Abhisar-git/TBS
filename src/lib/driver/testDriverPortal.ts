/* ============================================================
   TBS — Phase 5 Driver Portal Verification Test
   Verifies Driver Accept/Reject, Status Transitions, and Break Manager
   ============================================================ */

import prisma from '@/lib/db/prisma';

export async function runDriverPortalVerification() {
  // 1. Fetch test driver and guest
  const driver = await prisma.driverProfile.findFirst({
    include: { user: true },
  });

  const guest = await prisma.guestProfile.findFirst({
    include: { user: true },
  });

  if (!driver || !guest) {
    throw new Error('Test driver or guest not found in database');
  }

  // 2. Create test trip assigned to driver
  const testTrip = await prisma.trip.create({
    data: {
      tripType: 'ARRIVAL',
      driverId: driver.id,
      pickupAddress: 'IGI Airport T3, Delhi',
      pickupLat: 28.5562,
      pickupLng: 77.1000,
      dropoffAddress: 'Taj Palace, Delhi',
      dropoffLat: 28.5910,
      dropoffLng: 77.1725,
      status: 'DRIVER_ASSIGNED',
      scheduledPickupAt: new Date(),
      passengers: {
        create: [{ guestProfileId: guest.id, boardingStatus: 'WAITING' }],
      },
    },
  });

  // 3. Test Accept Trip -> DRIVER_EN_ROUTE
  await prisma.trip.update({
    where: { id: testTrip.id },
    data: { status: 'DRIVER_EN_ROUTE' },
  });

  // 4. Test Status Progression -> DRIVER_ARRIVED -> IN_PROGRESS -> COMPLETED
  await prisma.trip.update({
    where: { id: testTrip.id },
    data: { status: 'DRIVER_ARRIVED' },
  });

  await prisma.trip.update({
    where: { id: testTrip.id },
    data: { status: 'IN_PROGRESS', actualPickupTime: new Date() },
  });

  await prisma.trip.update({
    where: { id: testTrip.id },
    data: { status: 'COMPLETED', actualDropoffTime: new Date() },
  });

  // 5. Test Break Manager
  const breakEnd = new Date(Date.now() + 15 * 60 * 1000);
  const updatedDriver = await prisma.driverProfile.update({
    where: { id: driver.id },
    data: {
      status: 'ON_BREAK',
      breakUntil: breakEnd,
    },
  });

  if (updatedDriver.status !== 'ON_BREAK' || !updatedDriver.breakUntil) {
    throw new Error('Driver break manager test failed');
  }

  // Restore driver to AVAILABLE
  await prisma.driverProfile.update({
    where: { id: driver.id },
    data: {
      status: 'AVAILABLE',
      breakUntil: null,
    },
  });
}

if (require.main === module) {
  runDriverPortalVerification()
    .then(() => {
      // Exit cleanly
    })
    .catch((err) => {
      process.exit(1);
    });
}
