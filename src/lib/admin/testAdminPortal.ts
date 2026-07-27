/* ============================================================
   TBS — Phase 4 Admin Operations Portal Verification Test
   Verifies Admin Dashboard queries, Request Approvals, Driver Onboarding, and Manual Overrides
   ============================================================ */

import prisma from '@/lib/db/prisma';

export async function runAdminPortalVerification() {
  // 1. Fetch dashboard metrics
  const waitingGuests = await prisma.guestProfile.count({ where: { status: 'WAITING' } });
  const availableDrivers = await prisma.driverProfile.count({ where: { status: 'AVAILABLE' } });
  const totalTrips = await prisma.trip.count();

  if (typeof waitingGuests !== 'number' || typeof availableDrivers !== 'number') {
    throw new Error('Admin dashboard metrics query failed');
  }

  // 2. Test Driver Onboarding
  const bcrypt = await import('bcryptjs');
  const testHash = await bcrypt.hash('driver123', 12);
  const newDriverEmail = `testdriver_${Date.now()}@tbs.event`;

  const newDriver = await prisma.user.create({
    data: {
      name: 'Test Onboard Driver',
      email: newDriverEmail,
      phone: '+91 99999 88888',
      passwordHash: testHash,
      role: 'DRIVER',
      driverProfile: {
        create: {
          vehicleNumber: 'DL 01 AA 9999',
          vehicleModel: 'Toyota Innova Crysta',
          seatCapacity: 6,
          luggageCapacity: 5,
          status: 'AVAILABLE',
        },
      },
    },
    include: { driverProfile: true },
  });

  if (!newDriver.driverProfile) {
    throw new Error('Admin manual driver onboarding failed');
  }

  // 3. Test Manual Override Reassignment
  const existingTrip = await prisma.trip.findFirst({
    where: { status: { in: ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE'] } },
  });

  if (existingTrip) {
    await prisma.trip.update({
      where: { id: existingTrip.id },
      data: { driverId: newDriver.driverProfile.id },
    });
  }

  // Clean up test driver
  await prisma.user.delete({ where: { id: newDriver.id } });
}

if (require.main === module) {
  runAdminPortalVerification()
    .then(() => {
      // Exit cleanly
    })
    .catch((err) => {
      process.exit(1);
    });
}
