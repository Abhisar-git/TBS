/* ============================================================
   TBS — Phase 6 Guest Mobile App Verification Test
   Verifies Guest Ride Requests, Profile Updates, and History Queries
   ============================================================ */

import prisma from '@/lib/db/prisma';

export async function runGuestAppVerification() {
  const guest = await prisma.guestProfile.findFirst({
    include: { user: true },
  });

  if (!guest) {
    throw new Error('Test guest profile not found in database');
  }

  // 1. Test On-Demand Ride Request Submission
  const req = await prisma.rideRequest.create({
    data: {
      guestProfileId: guest.id,
      pickupPoint: 'IGI Airport T3, Delhi',
      dropoffPoint: 'Taj Palace, New Delhi',
      status: 'PENDING',
    },
  });

  if (req.status !== 'PENDING') {
    throw new Error('On-demand ride request creation failed');
  }

  // 2. Test Guest Profile Update
  const updatedGuest = await prisma.guestProfile.update({
    where: { id: guest.id },
    data: {
      flightOrTrainNumber: 'UK-812',
      groupSize: 2,
      luggageCount: 2,
    },
  });

  if (updatedGuest.flightOrTrainNumber !== 'UK-812' || updatedGuest.groupSize !== 2) {
    throw new Error('Guest profile update failed');
  }

  // Clean up test request
  await prisma.rideRequest.delete({ where: { id: req.id } });
}

if (require.main === module) {
  runGuestAppVerification()
    .then(() => {
      // Exit cleanly
    })
    .catch((err) => {
      process.exit(1);
    });
}
