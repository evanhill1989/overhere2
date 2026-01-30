# Code Patterns

## Server Action Pattern

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

## Realtime Hook Pattern

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

## Branded Types

All IDs use branded types to prevent mixing (e.g., can't pass `UserId` where `PlaceId` expected).

- Define branded types in `src/lib/types/core.ts`
- Validate at boundaries with Zod schemas
- Enforces type safety across the application
