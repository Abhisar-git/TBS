/* ============================================================
   TBS — Distance & Route Cache Manager
   In-memory & persistent DB caching layer for distance queries
   ============================================================ */

import prisma from '@/lib/db/prisma';
import type { GeoPoint, DistanceResult } from '@/types';
import { getDistanceAndDuration } from './openRouteService';

// In-memory cache for ultra-fast matching engine loops
const memoryCache = new Map<string, { result: DistanceResult; expiresAt: number }>();
const MEMORY_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Generate a deterministic hash key for a coordinate pair (rounded to ~10m precision)
 */
export function hashCoordinate(point: GeoPoint): string {
  const lat = point.lat.toFixed(4);
  const lng = point.lng.toFixed(4);
  return `${lat},${lng}`;
}

/**
 * Generate a cache key for an (origin, destination) route pair
 */
export function getRouteCacheKey(origin: GeoPoint, destination: GeoPoint): string {
  return `${hashCoordinate(origin)}->${hashCoordinate(destination)}`;
}

/**
 * Get distance and duration for a route, checking in-memory cache first, then database,
 * and falling back to OpenRouteService / Haversine calculation.
 */
export async function getCachedDistance(
  origin: GeoPoint,
  destination: GeoPoint
): Promise<DistanceResult> {
  const cacheKey = getRouteCacheKey(origin, destination);
  const now = Date.now();

  // 1. Check in-memory cache
  const inMemory = memoryCache.get(cacheKey);
  if (inMemory && inMemory.expiresAt > now) {
    return inMemory.result;
  }

  // 2. Check Database DistanceCache table
  const originHash = hashCoordinate(origin);
  const destHash = hashCoordinate(destination);

  try {
    const cached = await prisma.distanceCache.findUnique({
      where: {
        originHash_destHash: {
          originHash,
          destHash,
        },
      },
    });

    if (cached && cached.expiresAt > new Date()) {
      const result: DistanceResult = {
        distanceM: cached.distanceM,
        durationSec: cached.durationSec,
        durationInTrafficSec: cached.durationSec,
      };

      // Populate memory cache
      memoryCache.set(cacheKey, { result, expiresAt: now + MEMORY_CACHE_TTL_MS });
      return result;
    }
  } catch (err) {
    console.warn('DB Distance Cache lookup failed:', err);
  }

  // 3. Compute fresh distance via routing API / Haversine
  const freshResult = await getDistanceAndDuration(origin, destination);

  // 4. Save to Memory Cache
  memoryCache.set(cacheKey, { result: freshResult, expiresAt: now + MEMORY_CACHE_TTL_MS });

  // 5. Save to DB DistanceCache asynchronously (non-blocking)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours DB cache
  prisma.distanceCache
    .upsert({
      where: {
        originHash_destHash: {
          originHash,
          destHash,
        },
      },
      update: {
        distanceM: freshResult.distanceM,
        durationSec: freshResult.durationSec,
        durationInTrafficSec: freshResult.durationInTrafficSec || null,
        fetchedAt: new Date(),
        expiresAt,
      },
      create: {
        originHash,
        destHash,
        distanceM: freshResult.distanceM,
        durationSec: freshResult.durationSec,
        durationInTrafficSec: freshResult.durationInTrafficSec || null,
        expiresAt,
      },
    })
    .catch((err:Error) => console.warn('Failed to persist distance cache to DB:', err));

  return freshResult;
}

/**
 * Clear expired entries from memory cache
 */
export function pruneMemoryCache(): void {
  const now = Date.now();
  for (const [key, value] of memoryCache.entries()) {
    if (value.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
}
