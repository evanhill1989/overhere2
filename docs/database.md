# Database

## Drizzle ORM Commands

```bash
# Generate migrations after schema changes
npx drizzle-kit generate

# Push schema changes to database
npx drizzle-kit push

# Open Drizzle Studio (database GUI)
npx drizzle-kit studio
```

Database schema is defined in `src/lib/schema.ts` and migrations are stored in `drizzle/`.

## Naming Conventions

- Database uses `snake_case` for all columns
- Drizzle auto-converts to `camelCase` in TypeScript via `casing: "snake_case"` config in `src/lib/db.ts`
- All tables use `withTimezone: true` for timestamps

## Schema

Key tables (see `src/lib/schema.ts`):

- `users`: User accounts (synced with Supabase Auth)
- `places`: Cached Google Places data (30-day staleness)
- `checkins`: User presence at locations (expires via cron)
- `message_session_requests`: Pending/accepted/rejected message requests
- `message_sessions`: Active/expired chat sessions
- `messages`: Individual messages within sessions
- `failed_message_requests`: Debug/analytics for failed requests
