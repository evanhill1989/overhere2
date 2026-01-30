# Development

## Database Operations

```bash
# Drop message sessions table
npm run drop-table
```

Uses `tsx scripts/drop-message-sessions.ts`

## Configuration Notes

### React Compiler

- Enabled in `next.config.ts`
- Strict mode disabled

### Cron Jobs

The following endpoints should be called by Vercel Cron or similar:

- `/api/cron/expire-checkins`
- `/api/cron/expire-message-sessions`

### Environment Variables

Required environment variables:

- `DATABASE_URL`
- `DIRECT_URL_IPV4`
- Supabase keys (service role, anon key, project URL)
- Google Places API key

### Styling

- Tailwind CSS v4 with custom config

### Form Validation

- Zod validation schemas in `src/lib/validators/` for checkin/message inputs
