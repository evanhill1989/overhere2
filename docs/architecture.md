# Architecture

## Tech Stack

- **Frontend**: React 19, Next.js 15 (App Router), Tailwind CSS, shadcn/ui
- **Backend**: Next.js Server Actions, Supabase (Postgres + Realtime)
- **ORM**: Drizzle ORM with snake_case DB, automatic camelCase conversion
- **State Management**: TanStack Query v5 for server state
- **Animations**: GSAP
- **Deployment**: Vercel

## Core Data Flow

### 1. Server Actions (`src/app/_actions/`)

All mutations and queries:

- `checkinActions.ts`: Check-in management, Google Places API caching
- `checkinQueries.ts`: Fetch check-ins at places
- `messageActions.ts`: Message requests, sessions, and message sending
- `searchPlaces.ts`: Google Places API search

### 2. Realtime Hooks (`src/hooks/realtime-hooks/`)

Supabase Realtime subscriptions:

- `useRealtimeCheckins.ts`: Live check-in updates
- `useRealtimeMessages.ts`: Live message updates
- `useRealtimeMessageRequests.ts`: Live message request updates
- `useRealtimeMessageSession.ts`: Track session status changes
- **Pattern**: Subscribe to Postgres changes, invalidate TanStack Query cache

### 3. Type System (`src/lib/types/`)

- `core.ts`: Branded types (UserId, PlaceId, etc.), Zod validators
- `database.ts`: Domain entity schemas (User, Place, Checkin, Message, etc.)
- `api.ts`: Request/Response contracts for API routes
- Uses branded types throughout for type safety

## Authentication & Middleware

- Supabase Auth with JWT tokens
- Middleware (`src/middleware.ts`) protects `/places/*` routes only
- `ensureUserInDb` utility syncs Supabase Auth users to local `users` table
- Client-side: `src/utils/supabase/client.ts`
- Server-side: `src/utils/supabase/server.ts`
- Admin client: `src/utils/supabase/admin.ts`

## Rate Limiting

Server actions use rate limiting via `src/lib/security/serverActionRateLimit.ts`:

- Separate stores for different action types (checkin, messaging, search)
- IP-based limits with configurable windows
- Example: `RATE_LIMIT_CONFIGS.CHECKIN_CREATE` (3 per 60s)

## Google Places Integration

- API calls in `src/lib/api/googlePlaces.ts`
- Caching logic in `checkinActions.ts` (`fetchAndCacheGooglePlaceDetails`)
- 30-day cache prevents excessive API usage
- Search results prefetched via `src/app/api/prefetch/place-data/route.ts`

## Realtime Architecture

Pattern used in all realtime hooks:

1. TanStack Query fetches initial data (enabled by `isPrimed` flag)
2. Supabase Realtime subscribes to Postgres changes
3. On change, invalidate/refetch query cache
4. Fallback polling (`useCheckinsPolling.ts`) for cold start issues
