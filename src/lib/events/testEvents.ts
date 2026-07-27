/* ============================================================
   TBS — Phase 3 Real-Time Event Stream Verification Test
   Verifies Pub/Sub event broadcasting and channel routing
   ============================================================ */

import eventBroadcaster from './eventBroadcaster';

export async function runEventStreamVerification() {
  let receivedGuestEvent = false;
  let receivedAdminEvent = false;

  // 1. Subscribe guest and admin listeners
  const unsubGuest = eventBroadcaster.subscribe('guest:user-123', (msg) => {
    if (msg.event === 'location_update' && (msg.data as { lat: number }).lat === 28.5562) {
      receivedGuestEvent = true;
    }
  });

  const unsubAdmin = eventBroadcaster.subscribe('admin', (msg) => {
    if (msg.event === 'location_update') {
      receivedAdminEvent = true;
    }
  });

  // 2. Broadcast events
  eventBroadcaster.notify('guest:user-123', 'location_update', {
    lat: 28.5562,
    lng: 77.1000,
    driverName: 'Test Driver',
  });

  // Clean up
  unsubGuest();
  unsubAdmin();

  if (!receivedGuestEvent || !receivedAdminEvent) {
    throw new Error('Event broadcaster channel routing verification failed');
  }
}

if (require.main === module) {
  runEventStreamVerification()
    .then(() => {
      // Exit cleanly
    })
    .catch((err) => {
      process.exit(1);
    });
}
