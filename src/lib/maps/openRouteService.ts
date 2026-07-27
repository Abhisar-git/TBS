/* ============================================================
   TBS — OpenRouteService & OSRM Routing Client
   Live routing, route polylines, and distance matrix with Haversine fallback
   ============================================================ */

import type { GeoPoint, DistanceResult } from '@/types';
import { calculateEstimatedDuration } from './haversine';

const ORS_BASE_URL = 'https://api.openrouteservice.org/v2';
const OSRM_PUBLIC_URL = 'https://router.project-osrm.org';

interface RouteResult {
  distanceM: number;
  durationSec: number;
  distanceKm: number;
  polyline: GeoPoint[]; // Array of lat,lng points for polyline rendering
  polylineString?: string;
}

interface MatrixResult {
  durationsSec: number[][]; // [origin_idx][dest_idx]
  distancesM: number[][];  // [origin_idx][dest_idx]
}

/**
 * Get driving route between origin and destination.
 * Attempts OpenRouteService / OSRM API, falls back gracefully to Haversine straight-line estimation.
 */
export async function getDrivingRoute(
  origin: GeoPoint,
  destination: GeoPoint
): Promise<RouteResult> {
  const apiKey = process.env.ORS_API_KEY;

  // Try OpenRouteService if API key is configured
  if (apiKey) {
    try {
      const url = `${ORS_BASE_URL}/directions/driving-car?api_key=${apiKey}&start=${origin.lng},${origin.lat}&end=${destination.lng},${destination.lat}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' }, next: { revalidate: 3600 } });

      if (res.ok) {
        const data = await res.json();
        const route = data.features?.[0];
        if (route) {
          const summary = route.properties.summary;
          const coords: [number, number][] = route.geometry.coordinates; // [lng, lat]
          const polyline: GeoPoint[] = coords.map(([lng, lat]) => ({ lat, lng }));

          return {
            distanceM: Math.round(summary.distance),
            durationSec: Math.round(summary.duration),
            distanceKm: Math.round((summary.distance / 1000) * 10) / 10,
            polyline,
            polylineString: JSON.stringify(polyline),
          };
        }
      }
    } catch (err) {
      console.warn('ORS API request failed, trying OSRM fallback:', err);
    }
  }

  // Try OSRM public demo server (free, no API key required)
  try {
    const osrmUrl = `${OSRM_PUBLIC_URL}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
    const res = await fetch(osrmUrl, { next: { revalidate: 3600 } });

    if (res.ok) {
      const data = await res.json();
      const route = data.routes?.[0];
      if (route) {
        const coords: [number, number][] = route.geometry.coordinates; // [lng, lat]
        const polyline: GeoPoint[] = coords.map(([lng, lat]) => ({ lat, lng }));

        return {
          distanceM: Math.round(route.distance),
          durationSec: Math.round(route.duration),
          distanceKm: Math.round((route.distance / 1000) * 10) / 10,
          polyline,
          polylineString: JSON.stringify(polyline),
        };
      }
    }
  } catch (err) {
    console.warn('OSRM public server unavailable, falling back to Haversine formula:', err);
  }

  // Fallback: Haversine distance with synthetic straight-line polyline
  const est = calculateEstimatedDuration(origin, destination);
  return {
    distanceM: est.distanceM,
    durationSec: est.durationSec,
    distanceKm: est.distanceKm,
    polyline: [origin, destination],
    polylineString: JSON.stringify([origin, destination]),
  };
}

/**
 * Get distance matrix for multiple origins and destinations in a single call.
 */
export async function getDistanceMatrix(
  origins: GeoPoint[],
  destinations: GeoPoint[]
): Promise<MatrixResult> {
  const resultDurations: number[][] = Array(origins.length)
    .fill(0)
    .map(() => Array(destinations.length).fill(0));
  const resultDistances: number[][] = Array(origins.length)
    .fill(0)
    .map(() => Array(destinations.length).fill(0));

  // Default calculation via Haversine
  for (let i = 0; i < origins.length; i++) {
    for (let j = 0; j < destinations.length; j++) {
      const est = calculateEstimatedDuration(origins[i], destinations[j]);
      resultDurations[i][j] = est.durationSec;
      resultDistances[i][j] = est.distanceM;
    }
  }

  return {
    durationsSec: resultDurations,
    distancesM: resultDistances,
  };
}

/**
 * Get distance and duration for single origin and destination
 */
export async function getDistanceAndDuration(
  origin: GeoPoint,
  destination: GeoPoint
): Promise<DistanceResult> {
  const route = await getDrivingRoute(origin, destination);
  return {
    distanceM: route.distanceM,
    durationSec: route.durationSec,
    durationInTrafficSec: Math.round(route.durationSec * 1.15), // +15% for peak traffic estimate
  };
}
