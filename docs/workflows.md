# Common Workflows

## Adding a New Feature with Server Actions

1. Define branded types in `src/lib/types/core.ts`
2. Add Zod schemas to `src/lib/types/database.ts` or `src/lib/validators/`
3. Create server action in `src/app/_actions/`
4. Add rate limit config if needed
5. Create custom hook in `src/hooks/` (with realtime if needed)
6. Build UI component in `src/components/` or page component

## Modifying Database Schema

1. Edit `src/lib/schema.ts`
2. Run `npx drizzle-kit generate` to create migration
3. Run `npx drizzle-kit push` or deploy migration
4. Update TypeScript types in `src/lib/types/database.ts`
5. Update affected server actions and queries

## Debugging Realtime Issues

- Check `isPrimed` flag is true before subscription
- Verify channel names match between subscription and data
- Use polling fallback hooks (`useCheckinsPolling`) if needed
- Check Supabase RLS policies allow real-time reads
