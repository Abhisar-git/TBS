/* ============================================================
   TBS — Haversine Distance & Duration Calculator
   High-performance spherical geometry & ETA calculations
   ============================================================ */

import type { GeoPoint } from '@/types';

// Earth radius in meters
const EARTH_RADIUS_M = 6371000;

// Average urban speed in Delhi in km/h (accounting for traffic)
const DEFAULT_URBAN_SPEED_KMH = 32;

/**
 * Calculate the great-circle distance between two geographic coordinates in meters.
 */
export function calculateHaversineDistance(origin: GeoPoint, destination: GeoPoint): number {
  const dLat = toRad(destination.lat - origin.lat);
  const dLng = toRad(destination.lng - origin.lng);

  const lat1 = toRad(origin.lat);
  const lat2 = toRad(destination.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_M * c);
}

/**
 * Estimate driving duration in seconds based on Haversine distance and urban road factor.
 * Roads are not straight lines, so a road detour factor (1.35x) and urban speed are applied.
 */
export function calculateEstimatedDuration(
  origin: GeoPoint,
  destination: GeoPoint,
  speedKmh = DEFAULT_URBAN_SPEED_KMH
): { distanceM: number; durationSec: number; distanceKm: number } {
  const straightDistanceM = calculateHaversineDistance(origin, destination);
  
  // Road network circuitry factor (approx 1.35 for urban road grids)
  const roadDistanceM = Math.round(straightDistanceM * 1.35);
  const distanceKm = Math.round((roadDistanceM / 1000) * 10) / 10;

  // Duration in seconds = (distance in km / speed in km/h) * 3600
  const speedMetersPerSec = (speedKmh * 1000) / 3600;
  const durationSec = Math.round(roadDistanceM / speedMetersPerSec);

  return {
    distanceM: roadDistanceM,
    distanceKm,
    durationSec: Math.max(durationSec, 60), // Minimum 1 minute
  };
}

/**
 * Calculate bearing (compass angle 0-360 deg) between two points for vehicle icon orientation.
 */
export function calculateBearing(start: GeoPoint, end: GeoPoint): number {
  const startLat = toRad(start.lat);
  const startLng = toRad(start.lng);
  const endLat = toRad(end.lat);
  const endLng = toRad(end.lng);

  const dLng = endLng - startLng;

  const y = Math.sin(dLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

  let bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return Math.round(bearing);
}

/**
 * Format distance in meters to user-friendly string (e.g., "14.2 km" or "850 m")
 */
export function formatDistance(distanceM: number): string {
  if (distanceM >= 1000) {
    return `${(distanceM / 1000).toFixed(1)} km`;
  }
  return `${Math.round(distanceM)} m`;
}

/**
 * Format duration in seconds to user-friendly string (e.g., "28 mins" or "1 hr 15 mins")
 */
export function formatDuration(durationSec: number): string {
  const minutes = Math.ceil(durationSec / 60);
  if (minutes < 60) {
    return `${minutes} min${minutes === 1 ? '' : 's'}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) {
    return `${hours} hr${hours === 1 ? '' : 's'}`;
  }
  return `${hours} hr ${remainingMins} min${remainingMins === 1 ? '' : 's'}`;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}
