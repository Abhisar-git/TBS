# Use Local React State and Next.js Route Pathnames for Tab Bar Selection

* Status: accepted
* Deciders: Lead Frontend Architect, Core Engineering Team
* Date: 2026-07-27

## Context and Problem Statement

In building the mobile-first navigation interfaces across [`src/app/guest/layout.tsx`](file:///c:/Users/abhis/Desktop/TBS/src/app/guest/layout.tsx), [`src/app/driver/layout.tsx`](file:///c:/Users/abhis/Desktop/TBS/src/app/driver/layout.tsx), and [`src/app/admin/layout.tsx`](file:///c:/Users/abhis/Desktop/TBS/src/app/admin/layout.tsx), our team needed to determine how active tab selection and navigation state should be managed. We needed to choose between introducing a global state management store, using URL pathnames with local React state, or leveraging URL query parameters.

## Decision Drivers

* Maintainability and code simplicity in layout components without unnecessary boilerplate or external dependencies.
* Seamless deep linking and browser back/forward navigation support without state desynchronization.

## Considered Options

* Option 1: Local React state derived from Next.js `usePathname()` hook.
* Option 2: Global state management using Zustand (extending [`src/stores/authStore.ts`](file:///c:/Users/abhis/Desktop/TBS/src/stores/authStore.ts)).
* Option 3: URL query parameters (e.g., `?tab=track`) managed via `useSearchParams()`.

## Decision Outcome

Chosen option: "Option 1: Local React state derived from Next.js `usePathname()` hook", because active tab state naturally reflects the current URL path across Next.js App Router route segments. Managing this locally via `usePathname()` eliminates global state sync bugs, preserves native URL deep-linking, and avoids adding state management complexity to existing stores like [`src/stores/authStore.ts`](file:///c:/Users/abhis/Desktop/TBS/src/stores/authStore.ts).

### Positive Consequences

* Simplifies layout components by keeping navigation state fully declarative based on `usePathname()`.
* Ensures deep-linking and browser navigation (back/forward) remain inherently in sync with the highlighted tab without custom listeners.

### Negative Consequences

* Tab changes require full page route transitions rather than instant client-side view swaps within a single page component.
* Shared tab state cannot be easily accessed outside of layout/navigation rendering without inspecting the router.

## Pros and Cons of the Options

### Option 1: Local React state derived from Next.js `usePathname()` hook

* Good, because `pathname === '/guest/track'` directly determines active link highlighting with zero state management overhead.
* Good, because it supports native browser history, bookmarking, and deep links out of the box.
* Bad, because navigation requires route changes which depend on Next.js page routing performance.

### Option 2: Global state management using Zustand (extending `src/stores/authStore.ts`)

* Good, because it allows global access and manipulation of current active tab state across any component in the app tree.
* Good, because tab switching can happen instantaneously without triggering page route evaluations.
* Bad, because it introduces state synchronization overhead between the URL bar and the Zustand store, risking UI bugs on browser back/forward navigation.

### Option 3: URL query parameters managed via `useSearchParams()`

* Good, because it keeps navigation within a single page layout while maintaining bookmarkable URLs.
* Good, because state is preserved in the URL without requiring a global store.
* Bad, because it clutters route URLs with query strings instead of clean RESTful App Router path segments like `/guest/track` or `/driver/trip`.
