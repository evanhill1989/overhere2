# OverHere: Architecture Narrative

## Problem

People want spontaneous, real-world conversations with others nearby — but existing platforms fail at this. Dating apps create high-stakes pressure. Social networks require persistent profiles and histories that make casual interaction feel risky. Forums are too slow; you miss the moment.

The core tension: **How do you build trust for ephemeral human interaction at physical locations without creating a surveillance record?**

Naive solutions fail because they optimize for the wrong thing. If you track conversation history, people won't be authentic. If you require detailed profiles, the friction kills spontaneity. If updates aren't instant, the "who's here now" promise breaks. The system needed to feel immediate and safe simultaneously — two properties that traditionally conflict.

## Constraints

We could not assume:
- Users would tolerate app store friction (must work in mobile browsers)
- People would accept persistent chat archives (privacy risk too high)
- Unlimited API budget for real-time location lookups (Google Places charges per request)
- Users would wait for page refreshes to see new check-ins (real-time is table stakes)

We explicitly avoided:
- User profiles or persistent identity beyond active sessions
- Message history that survives session expiration
- Custom auth infrastructure (time/security risk)
- Native mobile apps (development/maintenance cost)

The system had to:
- Feel real-time without custom WebSocket infrastructure
- Work on day one without complex ops
- Prevent abuse without heavyweight moderation tools
- Handle unpredictable usage spikes (viral location scenarios)

These constraints forced architectural honesty: build for demo-ability first, scale later if proven.

## Tradeoffs

**Supabase vs. custom infrastructure**
Many would build custom Postgres + WebSocket servers for control. We chose Supabase's managed platform. This optimized for speed-to-demo and operational simplicity at the expense of vendor lock-in and opinionated patterns. For a solo builder validating product-market fit, managed scaling beats DIY infrastructure.

**Server Actions vs. REST APIs**
Traditional Next.js apps use API routes with explicit auth middleware. We chose Server Actions with inline auth checks. This optimized for development velocity (less boilerplate, simpler mental model) at the expense of adopting a newer, less-proven pattern. The tradeoff: faster iteration now, potential migration risk later.

**Google Places caching with staleness vs. real-time API calls**
We could fetch fresh place data on every check-in. Instead, we cache for 30 days and tolerate stale addresses. This optimized for cost predictability at the expense of accuracy. A restaurant's hours might change, but its location won't — good enough for MVP validation.

**Realtime subscriptions + polling fallback vs. pure polling**
Most apps just poll. We use Supabase Realtime subscriptions with polling as backup. This optimized for "feels alive" user experience at the expense of client-side complexity. The pattern (subscribe → invalidate TanStack Query cache → refetch) adds indirection but delivers instant updates.

**Ephemeral messages vs. conversation history**
We delete messages when sessions expire instead of archiving them. This optimized for psychological safety (lower barrier to try) at the expense of engagement metrics and user retention hooks. We knowingly traded growth hacking for trust.

## Why it matters to customers

Ephemeral data means you can say "I'm here, want to chat?" without worrying it's logged forever. That reduces the courage required to hit "send."

Real-time architecture means when someone checks in nearby, you see them immediately. It feels like a live space, not a message board you refresh. That immediacy is what makes spontaneous connection possible.

Managed infrastructure (Supabase, Vercel) means the app stays fast and available without operational babysitting. Users don't see "down for maintenance" — they see reliability, which builds trust in hyper-local contexts where stakes feel high.

Browser-first design means no app store gatekeeping. See a QR code at a coffee shop? You're chatting in 30 seconds. Lower friction, faster value.

The architecture isn't clever for cleverness's sake. Every choice trades off something to optimize for one outcome: **getting strangers to talk to each other without fear**. That's a product problem solved with infrastructure decisions.
