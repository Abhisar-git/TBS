# TBS Dispatch System — Technical Design & Matching Algorithm Document

## Executive Summary

The Transport Dispatch System (TBS) automates real-time and scheduled vehicle logistics for large multi-day group events (conferences, offsites, weddings). It matches pre-registered drivers to event attendees based on live location, vehicle capacities (seats and luggage), arrival timing, driver rest break policies, and traffic conditions.

The system serves three user roles across two applications:
1. **Guest Mobile App**: Used by attendees to view pickup details, track driver live position on a map, update travel itineraries, and raise on-demand ride requests.
2. **Admin Portal**: Single application with two role-isolated views:
   - **Admin / Operations Role**: Master control dashboard with full visibility across all drivers and guests, approval workflow for on-demand requests, manual override re-assignment, and pre-day batch dispatch execution.
   - **Driver Role**: Restricted view showing only the driver's own assigned trip, step-by-step trip progression (`Arrived at Pickup` -> `Guest Boarded` -> `Arrived at Drop`), rest break timer, and background location streaming.

---

## Matching & Dispatch Engine Architecture

The dispatch engine employs a dual-mode strategy designed for scalability, low latency, and zero guest starvation:

```
                          ┌─────────────────────────────┐
                          │   Pending / Waiting Queue   │
                          └──────────────┬──────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
      ┌─────────────────────────┐                 ┌─────────────────────────┐
      │   Batch Mode (Pre-Day)  │                 │  Real-Time Mode (Event) │
      │  Hungarian Algorithm    │                 │  Scored Greedy Matcher  │
      │   O(N^3) Optimal 1-to-1 │                 │  + Detour Insertion     │
      └────────────┬────────────┘                 └────────────┬────────────┘
                   │                                           │
                   └─────────────────────┬─────────────────────┘
                                         ▼
                          ┌─────────────────────────────┐
                          │ Cost Function Evaluation    │
                          └──────────────┬──────────────┘
                                         ▼
                          ┌─────────────────────────────┐
                          │ Database State Update       │
                          │ + SSE Real-Time Stream      │
                          └─────────────────────────────┘
```

### 1. Cost & Scoring Function

Each potential pairing between a driver $D$ and a waiting guest $G$ is scored using a weighted cost function:

$$\text{Cost}(D, G) = w_1 \cdot T_{\text{pickup}} - w_2 \cdot T_{\text{wait}} + w_3 \cdot C_{\text{waste}} + w_4 \cdot B_{\text{penalty}} + w_5 \cdot D_{\text{detour}} - w_6 \cdot S_{\text{cluster}}$$

Where:
- **$T_{\text{pickup}}$ ($w_1 = 1.0$)**: Travel duration in seconds from the driver's current position to the pickup location.
- **$T_{\text{wait}}$ ($w_2 = 2.5$)**: Time in seconds the guest has been waiting past their ETA. Monotonically increasing weight prevents guest starvation.
- **$C_{\text{waste}}$ ($w_3 = 15.0$)**: Penalty for unutilized seat capacity ($D_{\text{seats}} - G_{\text{group}}$), encouraging snug fits and reserving large SUVs for larger groups.
- **$B_{\text{penalty}}$ ($w_4 = 500.0$)**: Penalty applied if assigning a driver currently on a scheduled rest break.
- **$D_{\text{detour}}$ ($w_5 = 1.8$)**: Added travel duration in seconds if inserting a pickup into an en-route driver's active trip.
- **$S_{\text{cluster}}$ ($w_6 = 120.0$)**: Bonus credited when grouping guests heading to the same destination hotel or venue.

Hard constraints:
- Driver seat capacity $\ge$ Guest group size (Hard rejection if violated).
- Driver luggage capacity $\ge$ Guest luggage count (Hard rejection if violated).
- Driver status must be `AVAILABLE` or `EN_ROUTE` with remaining capacity.

---

### 2. Scheduled Batch Mode (Hungarian Algorithm)

For pre-day dispatch and scheduled arrivals, the system constructs a cost matrix $C_{N \times M}$ representing all eligible driver-guest pairings.

- **Algorithm**: Hungarian (Kuhn-Munkres) Bipartite Matching algorithm.
- **Complexity**: $O(N^3)$ where $N, M \le 100$.
- **Optimality**: Guarantees the global minimum total cost across the entire fleet for the scheduled window.

---

### 3. Real-Time Mode & Opportunistic Detour Insertion

When an on-demand request is approved by an admin or a new guest enters the queue:
1. The engine runs a real-time greedy match across all `AVAILABLE` drivers.
2. If no idle driver is optimal, it evaluates `EN_ROUTE` drivers for mid-trip detour insertion.
3. Detour Insertion Conditions:
   - Added detour duration $D_{\text{detour}} \le 10\text{ minutes}$.
   - Existing passenger ETA delay $\le 5\text{ minutes}$.
   - Remaining seat and luggage capacity respects the new group.

---

### 4. Anti-Starvation Guard

- Guests in `WAITING` status carry an escalating priority score based on wait time.
- If wait time exceeds $15\text{ minutes}$, anti-starvation multiplier ($1.8\times$) elevates the guest to the top of the queue.
- If wait time exceeds $25\text{ minutes}$, critical multiplier ($3.0\times$) triggers priority dispatch and alerts the Admin Operations Control Center.

---

## Technical Trade-offs & Decisions

| Area | Decision | Trade-off / Rationale |
|---|---|---|
| **Routing Engine** | OpenRouteService / OSRM with Haversine fallback | Eliminates external API key costs; provides free GeoJSON polylines; Haversine fallback guarantees 100% system availability if offline. |
| **Real-Time Transport** | Server-Sent Events (SSE) + REST POST | Fully compatible with Vercel serverless deployment without needing persistent WebSocket servers; sub-second streaming latency. |
| **Architecture** | Next.js 14 App Router Monolith | Co-located API routes and frontend; single project deployment on Vercel; role-isolated route groups (`/guest`, `/admin`, `/driver`). |
| **Styling** | Tailwind CSS with Luxury Theme Tokens | Tailored color scheme (Royal Burgundy `#8C1D2F`, Champagne Gold `#C5A059`, Glassmorphic Cards) aligned with high-end wedding/event aesthetics. |

---

## Verification & Test Strategy

1. **Unit Tests**:
   - `src/lib/maps/testMaps.ts`: Verified Haversine distance, road circuitry factor ($1.35\times$), OSRM polyline decoding, and 2-tier distance caching.
   - `src/lib/matching/testMatching.ts`: Verified Hungarian $O(N^3)$ optimality, capacity rejection, and anti-starvation queue ranking.
   - `src/lib/events/testEvents.ts`: Verified pub/sub channel routing for SSE streaming.
   - `src/lib/driver/testDriverPortal.ts`: Verified driver accept/reject flow, step-by-step status transitions, and rest break scheduling.
   - `src/lib/admin/testAdminPortal.ts`: Verified admin ops dashboard, manual override driver reassignment, and driver onboarding.
   - `src/lib/guest/testGuestApp.ts`: Verified guest ride requests, live map tracking, and profile updates.
2. **Peak Scenario Test**:
   - `src/lib/simulation/testPeakScenario.ts`: Simulated 50 guests arriving at Delhi IGI T3 within a 1-hour window to verify 0 starvation, capacity compliance, and execution under peak surge.
