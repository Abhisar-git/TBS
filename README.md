# TBS — Event Transport Dispatch & Royal Hospitality Platform

A mobile-first dispatch and hospitality platform automating vehicle logistics for large-scale group events (weddings, conferences, corporate summits). Built for a single-event private fleet of 10–100 drivers and hundreds of arriving guests in Delhi, India (Bharat Mandapam, DEL T3, NDLS, ANVT, and partner hotels).

---

## System Overview & Problem Statement

Large group events require coordinating complex vehicle logistics: picking guests up from airports and railway stations, dropping them at accommodations, and moving them between accommodations and the event venue over the course of the event. Manually coordinating this — matching drivers to guests, tracking arrivals, managing peak-hour surges, and avoiding both guest waiting time and idle vehicles — is error-prone and does not scale.

This system automates coordination: assigning available drivers to guests intelligently in real time based on location, timing, vehicle capacity, and traffic conditions — similar in spirit to ride-hailing apps, but adapted for the fixed, scheduled, multi-stop nature of a private group event.

---

## System Architecture

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT LAYER                                      |
|  +------------------------+  +--------------------------+  +-------------------+  |
|  |    Guest Concierge     |  |    Operations Center     |  |  Chauffeur Console|  |
|  |   (Mobile-First PWA)   |  |     (Admin Role)         |  |   (Driver Role)   |  |
|  +-----------+------------+  +------------+-------------+  +---------+---------+  |
+--------------|----------------------------|--------------------------|------------+
               |                            |                          |
               +--------------------+-------+--------------------------+
                                    |
+-----------------------------------|-----------------------------------------------+
|                            API & GATEWAY LAYER                                    |
|                   Next.js 14 App Router + Server-Sent Events                      |
+-----------------------------------|-----------------------------------------------+
                                    |
+-----------------------------------|-----------------------------------------------+
|                            CORE ENGINES & LOGIC                                   |
|  +------------------------+  +--------------------------+  +-------------------+  |
|  |     Matching Engine    |  |  Anti-Starvation Engine  |  |  Distance Cache   |  |
|  |  (Hungarian + Greedy)  |  |   (Priority Scoring)     |  | (2-Tier Memory/DB)|  |
|  +------------------------+  +--------------------------+  +-------------------+  |
+-----------------------------------|-----------------------------------------------+
                                    |
+-----------------------------------|-----------------------------------------------+
|                         DATA & PERSISTENCE LAYER                                  |
|                         Prisma ORM + SQLite / PostgreSQL                          |
+-----------------------------------------------------------------------------------+
```

---

## Architectural Trade-offs & Design Choices

### 1. Why WebSockets Were Not Used (Server-Sent Events vs. WebSockets)
* **Technical Constraint**: WebSockets require a stateful, persistent, always-on TCP connection server (such as a standalone Node.js server or custom Socket.IO daemon). Serverless deployment platforms like Vercel execute API routes as ephemeral, stateless functions that spin up on demand and shut down after processing each request. Serverless environments cannot hold open persistent bidirectional TCP WebSocket connections without expensive third-party proxy addons.
* **Design Decision**: Implemented Server-Sent Events (SSE) for real-time map updates and status streams (`/api/events/stream`, `/api/events/admin-stream`, `/api/events/driver-stream`). SSE operates over standard HTTP/2 streaming, which is 100% compatible with Vercel serverless infrastructure. State mutations (accepting trips, updating location, submitting ride requests) are handled via standard HTTP POST/PATCH endpoints, while client state is kept synchronized through unidirectional SSE streams with automatic reconnection handling.

### 2. Mobile Deployment: Web App (PWA) vs. Standalone React Native Native Binaries
* **Trade-off & Limitation**: Hosting live links for native mobile binaries (.apk for Android / .ipa for iOS) is not possible on web deployment platforms like Vercel.
* **Design Decision**: Built as a responsive, mobile-first Web Application (Progressive Web App) to enable instant browser access across guest and driver devices without requiring App Store installation during a single-weekend event. The frontend architecture is modular and ready to be compiled into React Native (Expo) native binaries or wrapped using Capacitor if native device binaries are required.

### 3. Distance Matrix Caching: 2-Tier In-Memory/Database vs. External Redis
* **Trade-off**: Standalone Redis clusters introduce external infrastructure dependencies for local testing.
* **Design Decision**: Built a 2-tier caching layer (Tier 1: In-memory JavaScript Map for sub-millisecond lookups; Tier 2: Prisma database caching for persistence). This achieves a verified 212x speedup over raw routing API calls while keeping local setup zero-dependency. An Upstash Redis adapter (`@upstash/redis`) can be plugged in for multi-region serverless deployments.

### 4. Routing Engine: OpenRouteService & Haversine vs. Commercial APIs
* **Trade-off**: Commercial map APIs incur strict rate limits and quota costs during bulk matrix calculations.
* **Design Decision**: OpenRouteService generates road driving polylines and route durations, backed by an automated Haversine matrix calculator fallback to guarantee 100% routing uptime during peak scenario testing.

### 5. Aesthetic & Theme Engine: The Bride Side Visual Design
* **Design Decision**: Emulated the visual identity of "The Bride Side" brand: Royal Velvet Crimson (`#7A1325`, `#5B0E1A`), Imperial Gold (`#D4AF37`), and Warm Silk Ivory (`#FFFDF9`), built with custom Aceternity glassmorphism cards (`GlowingCard`), background spotlights (`Spotlight`), and modular showcases (`BentoGrid`).

---

## Matching & Dispatch Engine Specifications

The system combines three dispatch strategies to balance operational efficiency and guest satisfaction:

### 1. Pre-Day Batch Dispatch (Hungarian Algorithm - O(N^3))
* **Implementation**: Bipartite Matching via the Hungarian Algorithm (`src/lib/matching/hungarian.ts`).
* **Use Case**: Scheduled flight and train arrival batches known prior to event day.
* **Objective**: Minimizes the global cost matrix combining travel distance, arrival time differences, and guest wait times:
  Cost = w1 * Distance(Guest, Driver) + w2 * |ArrivalETA - DriverReadyTime| + w3 * WaitTime

### 2. Real-Time On-Demand Dispatch (Greedy Near-Neighbor)
* **Implementation**: Low-latency greedy heuristic (`src/lib/matching/greedy.ts`).
* **Use Case**: Ad-hoc guest ride requests submitted during the event and approved by operations.
* **Selection Metric**: Filters available drivers by seat and luggage capacity, selecting the optimal driver by real-time distance.

### 3. Multi-Guest Pooling & Detour Constraints
* **Implementation**: Pooling Engine (`src/lib/matching/pooling.ts`).
* **Constraints Enforced**:
  * Vehicle capacity limit: Sum of GroupSizes <= Driver.SeatCapacity
  * Luggage capacity limit: Sum of LuggageCounts <= Driver.LuggageCapacity
  * Maximum allowable detour insertion time: Delta Detour <= 15 minutes
  * Maximum total delay for any guest: Total Delay <= 20 minutes

### 4. Anti-Starvation Mechanism
* **Implementation**: Priority Queue Engine (`src/lib/matching/priorityQueue.ts`).
* **Priority Formula**:
  Priority Score = w1 * WaitTime + w2 * FlightDelayTime - w3 * DetourPenalty
* **Guarantee**: Escalates priority for guests in low-density pickup points, preventing them from being indefinitely bypassed by closer arrivals.

---

## Scope & Functional Requirements

### 1. Guest App (`/guest`)
* **Registration & Details**: View flight/train arrival details, pickup point, and assigned accommodation.
* **Automatic Notification**: Receives automatic notification upon driver match containing driver name, vehicle number, and live ETA (no driver browsing or selection).
* **Live Driver Tracking**: Interactive map displaying real-time driver coordinates and route ETA (`/guest/track`).
* **On-Demand Ride Requests**: Raise unscheduled ride requests from the app (`/guest/request`), which transition to a "Request Pending" state awaiting admin review.
* **Travel Profile Editor**: Update party size, luggage count, and flight arrival information (`/guest/profile`).

### 2. Admin Portal — Admin/Operations Role (`/admin`)
* **Fleet Dashboard**: Real-time Leaflet map rendering driver locations, trip statuses, and operational metrics (`/admin/dashboard`).
* **Ride Request Queue**: Review, approve, or decline guest-submitted ride requests (`/admin/requests`). Approval triggers automated matching dispatch.
* **Driver Onboarding**: Manually register pre-approved drivers, vehicle plates, model specs, and seat/luggage capacities (`/admin/drivers`).
* **Guest Directory**: Manage guest travel profiles and manually assign drivers (`/admin/guests`).
* **Manual Override**: Override automated driver assignments in edge cases such as vehicle breakdown or priority escort (`/admin/trips`).
* **Batch Optimization Console**: Execute pre-day Hungarian batch solver rounds (`/admin/batch`).

### 3. Admin Portal — Driver Role (`/driver`)
* **Role-Based Access**: Single portal codebase supporting driver credentials with isolated views.
* **Trip Card Management**: View assigned trip details one at a time (pickup, guest name, count, destination). Drivers cannot browse the full guest queue or view other drivers.
* **Accept / Reject Workflow**: Drivers can accept or reject assigned trips. Rejection re-queues the guest for automated reassignment (`/driver/dashboard`).
* **Status Progression**: Update trip status (`DRIVER_EN_ROUTE` -> `DRIVER_ARRIVED` -> `IN_PROGRESS` -> `COMPLETED`) to calculate halt and free times (`/driver/trip`).
* **Continuous Location Sharing**: Live geolocation tracked and pushed to SSE streams during active trips (`useLocation.ts`).
* **Rest Break Timer**: Drivers can select 15, 30, or 45-minute rest breaks. The matching engine holds new assignments until the break completes (`/driver/break`).

---

## Event Setup & Locations (Delhi, India)

* **Event Venue**: Bharat Mandapam (Pragati Maidan).
* **Arrival Hubs**:
  * Indira Gandhi International Airport (DEL T3)
  * New Delhi Railway Station (NDLS)
  * Anand Vihar Terminal (ANVT)
* **Partner Accommodations**:
  * Taj Palace (Chanakyapuri)
  * The Leela Palace (New Delhi)
  * ITC Maurya (Diplomatic Enclave)
  * JW Marriott Hotel (Aerocity)

---

## Local Setup & Execution Guide

### Prerequisites
* Node.js v18+
* npm v9+

### Commands
```bash
# 1. Install dependencies
npm install

# 2. Push database schema (SQLite dev environment)
npx prisma db push

# 3. Seed test dataset (50 guests, 15 drivers, 4 hotels, Delhi coordinates)
npx tsx prisma/seed.ts

# 4. Run local development server
npm run dev
```

Application will run locally at `http://localhost:3000`.

### Demo User Accounts

| Role | Email | Password | Access Route |
|---|---|---|---|
| Admin Operations | `admin@tbs.event` | `admin123` | `/admin/dashboard` |
| Driver / Chauffeur | `driver1@tbs.event` | `driver123` | `/driver/dashboard` |
| Guest | `guest1@tbs.event` | `guest123` | `/guest/dashboard` |

---

## Verification & Simulation Scripts

```bash
# TypeScript Type Check
npx tsc --noEmit

# Maps & Routing Infrastructure Verification
npx tsx src/lib/maps/testMaps.ts

# Peak Arrival Scenario Simulation
npx tsx src/lib/simulation/testPeakScenario.ts

# Production Build Verification
npm run build
```

---

## Production Deployment

The platform is configured for deployment on Vercel via `vercel.json`:
* API routes configured with serverless timeouts.
* Dynamic headers configured with `export const dynamic = 'force-dynamic'`.
* Prerendering boundaries configured with React `<Suspense>`.
