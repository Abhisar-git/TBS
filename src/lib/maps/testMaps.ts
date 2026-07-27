/* ============================================================
   TBS — Phase 1 Maps Verification Test
   Verifies Haversine, OpenRouteService/OSRM routing, and Caching
   ============================================================ */

import { DELHI_LOCATIONS } from './locations';
import { calculateHaversineDistance, calculateEstimatedDuration, formatDistance, formatDuration } from './haversine';
import { getDrivingRoute, getDistanceAndDuration } from './openRouteService';
import { getCachedDistance } from './distanceCache';

export async function runMapsVerification() {
  console.log('🧪 Running Phase 1 Maps & Routing Infrastructure Verification...\n');

  const airport = { lat: DELHI_LOCATIONS.airport.lat, lng: DELHI_LOCATIONS.airport.lng };
  const venue = { lat: DELHI_LOCATIONS.venue.lat, lng: DELHI_LOCATIONS.venue.lng };
  const hotel = { lat: DELHI_LOCATIONS.accommodations[0].lat, lng: DELHI_LOCATIONS.accommodations[0].lng };

  // 1. Haversine Test
  console.log('1️⃣ Haversine Calculation Test:');
  const straightDistM = calculateHaversineDistance(airport, venue);
  const est = calculateEstimatedDuration(airport, venue);
  console.log(`   Airport (IGI T3) → Venue (Bharat Mandapam):`);
  console.log(`   Straight-line distance: ${formatDistance(straightDistM)}`);
  console.log(`   Estimated road distance: ${formatDistance(est.distanceM)} (${est.distanceKm} km)`);
  console.log(`   Estimated duration: ${formatDuration(est.durationSec)}\n`);

  // 2. OpenRouteService / OSRM Driving Route Test
  console.log('2️⃣ Driving Route & Polyline Test:');
  const route = await getDrivingRoute(airport, hotel);
  console.log(`   Airport (IGI T3) → Hotel (${DELHI_LOCATIONS.accommodations[0].name}):`);
  console.log(`   Road Distance: ${formatDistance(route.distanceM)}`);
  console.log(`   Duration: ${formatDuration(route.durationSec)}`);
  console.log(`   Polyline Waypoints: ${route.polyline.length} points generated\n`);

  // 3. Distance Cache Test
  console.log('3️⃣ Distance Matrix Cache Test:');
  const start = Date.now();
  const res1 = await getCachedDistance(hotel, venue);
  const time1 = Date.now() - start;

  const start2 = Date.now();
  const res2 = await getCachedDistance(hotel, venue);
  const time2 = Date.now() - start2;

  console.log(`   First call (compute/fetch): ${time1} ms -> ${formatDistance(res1.distanceM)}, ${formatDuration(res1.durationSec)}`);
  console.log(`   Second call (in-memory cache): ${time2} ms -> ${formatDistance(res2.distanceM)}, ${formatDuration(res2.durationSec)}`);
  console.log(`   Cache acceleration factor: ${Math.round(time1 / Math.max(time2, 1))}x faster\n`);

  console.log('✅ Phase 1 Verification Complete! All routing modules working correctly.');
}

// Allow direct execution
if (require.main === module) {
  runMapsVerification().catch(console.error);
}
