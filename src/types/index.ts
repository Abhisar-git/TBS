/* ============================================================
   TBS — Shared TypeScript Types
   Central type definitions for the entire application
   ============================================================ */

// ---------- Enums ----------

export type UserRole = 'GUEST' | 'DRIVER' | 'ADMIN';

export type GuestStatus =
  | 'REGISTERED'
  | 'WAITING'
  | 'ASSIGNED'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'DEPARTED';

export type DriverStatus =
  | 'OFFLINE'
  | 'AVAILABLE'
  | 'EN_ROUTE'
  | 'ON_TRIP'
  | 'ON_BREAK'
  | 'UNAVAILABLE';

export type TripType =
  | 'ARRIVAL'       // airport/station → accommodation
  | 'TO_VENUE'      // accommodation → venue
  | 'FROM_VENUE'    // venue → accommodation
  | 'DEPARTURE';    // accommodation → airport/station

export type TripStatus =
  | 'PENDING'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_EN_ROUTE'
  | 'DRIVER_ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type BoardingStatus =
  | 'WAITING'
  | 'BOARDED'
  | 'DROPPED_OFF'
  | 'NO_SHOW';

export type RideRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DECLINED'
  | 'MATCHED'
  | 'EXPIRED';

// ---------- Core Models ----------

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  createdAt: string;
}

export interface Event {
  id: string;
  name: string;
  venueAddress: string;
  venueLocation: GeoPoint;
  eventStart: string;
  eventEnd: string;
  schedule: ScheduleBlock[];
}

export interface ScheduleBlock {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  tripType: TripType;
}

export interface Accommodation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  location?: GeoPoint;
}

export interface GuestProfile {
  id: string;
  userId: string;
  user?: User;
  flightOrTrainNumber: string | null;
  arrivalEta: string | null;
  departureEta: string | null;
  pickupPoint: string;
  accommodationId: string;
  accommodation?: Accommodation;
  groupSize: number;
  luggageCount: number;
  status: GuestStatus;
}

export interface DriverProfile {
  id: string;
  userId: string;
  user?: User;
  vehicleNumber: string;
  vehicleModel: string;
  seatCapacity: number;
  luggageCapacity: number;
  status: DriverStatus;
  currentLocation: GeoPoint | null;
  currentLat?: number | null;
  currentLng?: number | null;
  locationUpdatedAt: string | null;
  availableAfter: string | null;
  predictedFreeLocation: GeoPoint | null;
  breakMinutesRemaining: number;
  trips?: Trip[];
}

export interface Trip {
  id: string;
  tripType: TripType;
  driverId: string | null;
  driver?: DriverProfile;
  pickupAddress: string;
  pickupLocation?: GeoPoint;
  pickupLat?: number;
  pickupLng?: number;
  dropoffAddress: string;
  dropoffLocation?: GeoPoint;
  dropoffLat?: number;
  dropoffLng?: number;
  scheduledPickupTime: string | null;
  actualPickupTime: string | null;
  actualDropoffTime: string | null;
  status: TripStatus;
  estimatedDurationSec: number | null;
  actualDurationSec: number | null;
  distanceKm: number | null;
  routePolyline: string | null;
  passengers: TripPassenger[];
  createdAt: string;
}

export interface TripPassenger {
  id: string;
  tripId: string;
  guestProfileId: string;
  guestProfile?: GuestProfile;
  boardingStatus: BoardingStatus;
}

export interface RideRequest {
  id: string;
  guestProfileId: string;
  guestProfile?: GuestProfile;
  pickupPoint: string;
  dropoffPoint: string;
  status: RideRequestStatus;
  adminNotes: string | null;
  approvedById: string | null;
  approvedBy?: User;
  createdAt: string;
  resolvedAt: string | null;
}

export interface DistanceResult {
  durationSec: number;
  distanceM: number;
  durationInTrafficSec?: number;
}

// ---------- Location ----------

export interface LocationUpdate {
  driverId: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  timestamp: string;
}

export interface DriverLocationSnapshot {
  driverId: string;
  driverName: string;
  vehicleNumber: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  status: DriverStatus;
  currentTripId: string | null;
  etaSeconds: number | null;
}

// ---------- SSE Event Payloads ----------

export interface SSEEvent<T = unknown> {
  event: string;
  data: T;
  timestamp: string;
}

export interface TripStatusEvent {
  tripId: string;
  status: TripStatus;
  etaSeconds: number | null;
  driverLocation: GeoPoint | null;
}

export interface RideRequestUpdateEvent {
  requestId: string;
  status: RideRequestStatus;
  tripId?: string;
}

export interface DashboardStatsEvent {
  waitingGuests: number;
  activeTrips: number;
  idleDrivers: number;
  pendingRequests: number;
  completedTrips: number;
  averageWaitMinutes: number;
}

// ---------- API Request/Response ----------

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------- Matching Engine ----------

export interface MatchCandidate {
  driverId: string;
  guestProfileId: string;
  score: number;
  travelTimeSec: number;
  distanceM: number;
  isDetour: boolean;
  detourTimeSec: number;
  capacityFit: number;
}

export interface BatchAssignmentResult {
  assignments: Array<{
    driverId: string;
    tripId: string;
    guestProfileIds: string[];
    pickupLocation: GeoPoint;
    dropoffLocation: GeoPoint;
    estimatedPickupTime: string;
    estimatedDurationSec: number;
  }>;
  unmatched: string[];
  totalCost: number;
}

// ---------- Notification ----------

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
