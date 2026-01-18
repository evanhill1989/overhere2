# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OverHere is a mobile-first, hyper-local app for spontaneous real-world conversations. Users check in at physical locations, see others nearby, and can initiate ephemeral messaging sessions. The app emphasizes anonymity, privacy, and brief platonic interactions.

## Code Suggestion & Editing Policy (Important)

By default, do NOT apply changes to the repository.

When suggesting code changes:

- Provide **complete, copy-pasteable code blocks** (not diff/patch format).
- Clearly indicate **which file** the code belongs in and **where** it should be inserted or replaced.
- Prefer showing the **full updated function/component** when modifying existing code.

Only use diff format or ask to apply changes directly if I explicitly say:

- “apply these changes”
- “update the file for me”
- “go ahead and edit the code”

If instructions are ambiguous, assume I want to manually copy/paste the code myself.

## Development Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint

# Database operations
npm run drop-table  # Drop message sessions table (uses tsx scripts/drop-message-sessions.ts)
```

### Database Management with Drizzle

```bash
# Generate migrations after schema changes
npx drizzle-kit generate

# Push schema changes to database
npx drizzle-kit push

# Open Drizzle Studio (database GUI)
npx drizzle-kit studio
```

Database schema is defined in `src/lib/schema.ts` and migrations are stored in `drizzle/`.

## Architecture Overview

### Tech Stack

- **Frontend**: React 19, Next.js 15 (App Router), Tailwind CSS, shadcn/ui
- **Backend**: Next.js Server Actions, Supabase (Postgres + Realtime)
- **ORM**: Drizzle ORM with snake_case DB, automatic camelCase conversion
- **State Management**: TanStack Query v5 for server state
- **Animations**: GSAP
- **Deployment**: Vercel

### Core Data Flow

1. **Server Actions** (`src/app/_actions/`): All mutations and queries

   - `checkinActions.ts`: Check-in management, Google Places API caching
   - `checkinQueries.ts`: Fetch check-ins at places
   - `messageActions.ts`: Message requests, sessions, and message sending
   - `searchPlaces.ts`: Google Places API search

2. **Realtime Hooks** (`src/hooks/realtime-hooks/`): Supabase Realtime subscriptions

   - `useRealtimeCheckins.ts`: Live check-in updates
   - `useRealtimeMessages.ts`: Live message updates
   - `useRealtimeMessageRequests.ts`: Live message request updates
   - `useRealtimeMessageSession.ts`: Track session status changes
   - Pattern: Subscribe to Postgres changes, invalidate TanStack Query cache

3. **Type System** (`src/lib/types/`):
   - `core.ts`: Branded types (UserId, PlaceId, etc.), Zod validators
   - `database.ts`: Domain entity schemas (User, Place, Checkin, Message, etc.)
   - `api.ts`: Request/Response contracts for API routes
   - Uses branded types throughout for type safety

### Database Schema

Key tables (see `src/lib/schema.ts`):

- `users`: User accounts (synced with Supabase Auth)
- `places`: Cached Google Places data (30-day staleness)
- `checkins`: User presence at locations (expires via cron)
- `message_session_requests`: Pending/accepted/rejected message requests
- `message_sessions`: Active/expired chat sessions
- `messages`: Individual messages within sessions
- `failed_message_requests`: Debug/analytics for failed requests

All tables use `withTimezone: true` for timestamps. The DB uses snake_case; Drizzle auto-converts to camelCase via `casing: "snake_case"` config in `src/lib/db.ts`.

### Authentication & Middleware

- Supabase Auth with JWT tokens
- Middleware (`src/middleware.ts`) protects `/places/*` routes only
- `ensureUserInDb` utility syncs Supabase Auth users to local `users` table
- Client-side: `src/utils/supabase/client.ts`
- Server-side: `src/utils/supabase/server.ts`
- Admin client: `src/utils/supabase/admin.ts`

### Rate Limiting

Server actions use rate limiting via `src/lib/security/serverActionRateLimit.ts`:

- Separate stores for different action types (checkin, messaging, search)
- IP-based limits with configurable windows
- Example: `RATE_LIMIT_CONFIGS.CHECKIN_CREATE` (3 per 60s)

### Google Places Integration

- API calls in `src/lib/api/googlePlaces.ts`
- Caching logic in `checkinActions.ts` (`fetchAndCacheGooglePlaceDetails`)
- 30-day cache prevents excessive API usage
- Search results prefetched via `src/app/api/prefetch/place-data/route.ts`

### Realtime Architecture

Pattern used in all realtime hooks:

1. TanStack Query fetches initial data (enabled by `isPrimed` flag)
2. Supabase Realtime subscribes to Postgres changes
3. On change, invalidate/refetch query cache
4. Fallback polling (`useCheckinsPolling.ts`) for cold start issues

### Key Patterns

**Server Action Pattern**:

```typescript
"use server"
// 1. Rate limit check
await checkServerActionRateLimit(RATE_LIMIT_CONFIGS.SOME_ACTION)
// 2. Auth check
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
// 3. Validate input with Zod
const validated = schema.parse(input)
// 4. Database operation with Drizzle
await db.insert(table).values(...)
```

**Realtime Hook Pattern**:

```typescript
// 1. TanStack Query for initial fetch
const query = useQuery({ queryKey, queryFn, enabled: isPrimed })
// 2. Supabase subscription
useEffect(() => {
  const channel = supabase.channel(...)
    .on('postgres_changes', ..., () => {
      queryClient.invalidateQueries({ queryKey })
    })
    .subscribe()
  return () => supabase.removeChannel(channel)
}, [placeId])
```

**Branded Types**:
All IDs use branded types to prevent mixing (e.g., can't pass `UserId` where `PlaceId` expected). Validate at boundaries with Zod schemas from `src/lib/types/core.ts`.

### File Organization

```
src/
├── app/                    # Next.js App Router
│   ├── _actions/          # Server Actions (mutations/queries)
│   ├── api/               # API routes (cron, prefetch)
│   ├── places/[placeId]/  # Main place detail page
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── *.tsx             # Feature components
├── hooks/                # Custom React hooks
│   └── realtime-hooks/   # Supabase Realtime hooks
├── lib/
│   ├── schema.ts         # Drizzle schema
│   ├── db.ts             # Database client
│   ├── types/            # TypeScript types & Zod schemas
│   ├── security/         # Rate limiting
│   └── api/              # External API clients
├── utils/
│   └── supabase/         # Supabase client utilities
└── middleware.ts         # Next.js middleware (auth)
```

## Important Notes

- **React Compiler**: Enabled in `next.config.ts`, strict mode disabled
- **Cron Jobs**: `/api/cron/expire-checkins` and `/api/cron/expire-message-sessions` should be called by Vercel Cron or similar
- **Environment Variables**: Requires `DATABASE_URL`, `DIRECT_URL_IPV4`, Supabase keys, Google Places API key
- **Path Alias**: `@/` maps to `src/`
- **Styling**: Tailwind CSS v4 with custom config, uses `tailwind-merge` via `cn()` utility
- **Forms**: Zod validation schemas in `src/lib/validators/` for checkin/message inputs

## Common Workflows

### Adding a New Feature with Server Actions

1. Define branded types in `src/lib/types/core.ts`
2. Add Zod schemas to `src/lib/types/database.ts` or `src/lib/validators/`
3. Create server action in `src/app/_actions/`
4. Add rate limit config if needed
5. Create custom hook in `src/hooks/` (with realtime if needed)
6. Build UI component in `src/components/` or page component

### Modifying Database Schema

1. Edit `src/lib/schema.ts`
2. Run `npx drizzle-kit generate` to create migration
3. Run `npx drizzle-kit push` or deploy migration
4. Update TypeScript types in `src/lib/types/database.ts`
5. Update affected server actions and queries

### Debugging Realtime Issues

- Check `isPrimed` flag is true before subscription
- Verify channel names match between subscription and data
- Use polling fallback hooks (`useCheckinsPolling`) if needed
- Check Supabase RLS policies allow real-time reads
