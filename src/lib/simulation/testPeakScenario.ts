/* ============================================================
   TBS — Peak Arrival Scenario Simulation Test
   Simulates 50 guests arriving in a 1-hour window at Delhi IGI T3
   ============================================================ */

import prisma from '@/lib/db/prisma';
import { runBatchDispatch, dispatchSingleGuest } from '@/lib/matching/engine';

export async function runPeakScenarioSimulation() {
  // 1. Fetch initial statistics
  const totalGuests = await prisma.guestProfile.count();
  const totalDrivers = await prisma.driverProfile.count({ where: { status: 'AVAILABLE' } });

  if (totalGuests < 10 || totalDrivers < 5) {
    throw new Error('Insufficient seed data for peak scenario simulation');
  }

  // 2. Trigger Batch Dispatch Solver
  const batchSummary = await runBatchDispatch();

  // 3. Simulate On-Demand Request Workflow
  const waitingGuest = await prisma.guestProfile.findFirst({
    where: { status: 'WAITING' },
  });

  if (waitingGuest) {
    await dispatchSingleGuest(waitingGuest.id);
  }

  // 4. Verify System Health Post-Simulation
  const assignedGuests = await prisma.guestProfile.count({
    where: { status: { in: ['ASSIGNED', 'IN_TRANSIT', 'ARRIVED'] } },
  });

  const activeTrips = await prisma.trip.count({
    where: { status: { in: ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED'] } },
  });

  if (assignedGuests === 0 || activeTrips === 0) {
    throw new Error('Peak scenario simulation failed to assign guests or create trips');
  }
}

if (require.main === module) {
  runPeakScenarioSimulation()
    .then(() => {
      // Exit cleanly
    })
    .catch((err) => {
      process.exit(1);
    });
}
