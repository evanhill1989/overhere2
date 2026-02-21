# OverHere: Architecture Narrative

---

## The Problem

Most digital tools for human connection optimize for the wrong outcome. Dating apps create romantic pressure where none should exist. Social networks demand persistent identity and curated profiles.  
 Forums are asynchronous—by the time you reply, the moment has passed. Text a stranger at a coffee shop? Creepy. Wave across the room? Awkward.

**The actual problem:** You're sitting 10 feet from someone who'd love to chat, but there's no socially acceptable bridge between silence and conversation.

Traditional solutions fail because they force a choice between privacy and immediacy. If you build conversation history, people won't be authentic—every message becomes part of a permanent record. If you require detailed profiles, friction kills spontaneity. If you're not truly real-time, the "who's here right now" promise breaks the moment someone walks out the door.

> **The core tension:** How do you facilitate trust between strangers at a specific physical location without creating a surveillance record or requiring identity disclosure?

---

## The Constraints

### What We Couldn't Assume

The architecture couldn't assume:

- **Users would tolerate app stores** → A 30-second download flow kills a 30-second opportunity. Must work in mobile browsers.
- **People accept permanent chat archives** → Privacy risk too high for casual "just saying hi" interactions.
- **Unlimited API budget** → Google Places charges per lookup. Can't fetch fresh place data for every check-in.
- **Users wait for page refreshes** → If someone checks in and you don't see them for 30 seconds, the product promise is broken.
- **Solo builder has ops capacity** → Can't babysit servers or debug WebSocket infrastructure at 2am.

### What We Explicitly Rejected

- **User profiles beyond active sessions** → No photos, bios, or persistent identity. You're just "someone here right now."
- **Message history that survives session expiration** → After 2 hours or when you check out, messages disappear. No evidence trail.
- **Custom auth infrastructure** → Security is hard. Delegate to Supabase Auth.
- **Native mobile apps** → Development cost and app store politics break the "instant access" promise.
- **Complex WebSocket infrastructure** → Supabase Realtime provides Postgres-driven live updates without custom backend.

### What The System Had To Do

The system had to:

1. Feel instant without custom WebSocket servers
2. Work day one without DevOps expertise
3. Prevent abuse without heavyweight moderation
4. Handle viral location scenarios (imagine a festival or conference)
5. Support a dual product: spontaneous user connections _and_ business owner verification/dashboards

> **Architectural honesty:** Build for demo-ability and validation first, scale later if proven.

---

## The Tradeoffs

### 1. Supabase vs. Custom Infrastructure

Most engineering teams would build custom Postgres + WebSocket servers for control and cost optimization. We chose Supabase's managed platform.

| **Optimized For**                        | **Traded Away**                                             |
| ---------------------------------------- | ----------------------------------------------------------- |
| Speed-to-demo and operational simplicity | Vendor lock-in, opinionated patterns, higher long-term cost |

**Why it matters:** For a solo builder ultimately pursuing broader systems architecture educational ends, managed scaling beats DIY infrastructure. In all projects I try to make the constraints as realistic as possible to run into the real professional, production-level issues, but at the same time this is my capstone project and I needed a functional version within a deadline that I don't think was at all feasible if I introduced that DIY infrastructure. Supabase delivers Postgres + Realtime + Auth + Row-Level Security as a service. The  
 alternative—building auth flows, managing database migrations, configuring WebSocket servers, setting up monitoring—would consume weeks before writing a single feature.

---

### 2. Next.js Server Actions vs. REST APIs

Traditional Next.js apps use API routes (`/api/*`) with explicit middleware chains for auth, validation, and rate limiting. We chose Server Actions with inline checks.

| **Optimized For**                      | **Traded Away**                                                                           |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| Development velocity and code locality | Adopting a newer pattern, potential future migration if Server Actions prove insufficient |

**Why it matters:** Server Actions collapse the request/response cycle into a single function.

Traditional approach requires:

1. Write API route handler
2. Add auth middleware
3. Add rate limit middleware
4. Define request/response types
5. Call from client with `fetch()`

Server Actions simplify this:

```typescript
"use server"

export async function checkIn(formData: FormData) {
  await checkServerActionRateLimit(...)
  const user = await supabase.auth.getUser()
  // validation + logic
}

```

Less boilerplate means faster iteration. The tradeoff: if Server Actions hit scaling limits or Edge runtime restrictions, refactoring to REST APIs is painful. We're betting on the pattern's stability.

---

3. Google Places 30-Day Caching vs. Real-Time Lookups

We could fetch fresh place data (name, address, coordinates) on every check-in. Instead, we cache for 30 days and tolerate stale information.

┌──────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────┐
│ Optimized For │ Traded Away │
├──────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
│ Cost predictability and API quota management │ Real-time accuracy (a restaurant's hours might change, but its address won't) │
└──────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────┘

Why it matters: Google Places API charges per request.

Cost comparison:

- No caching: 1000 daily check-ins across 100 unique places = 1000 API calls/day
- 30-day caching: ~3 calls per place per month = ~10 API calls/day
- Savings: 100x cost reduction

The cache staleness is acceptable: place names and addresses rarely change. If they do, the next check-in after 30 days refreshes. Users see slightly outdated info for a few weeks—annoying but not
broken.

Implementation detail: fetchAndCacheGooglePlaceDetails() checks cache first, only hits the API on miss or stale data, then upserts the result. Branded type validation (placeSchema.parse()) ensures cached data stays type-safe even if the DB schema drifts.

---

4. Supabase Realtime + Polling Fallback vs. Pure Polling

Most apps just poll every N seconds. We use Supabase Realtime subscriptions with TanStack Query cache invalidation, plus polling fallback for cold start issues.

┌───────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────┐
│ Optimized For │ Traded Away │
├───────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────┤
│ "Feels alive" user experience │ Client-side complexity (subscription management, channel cleanup, invalidation logic) │
└───────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────┘

Why it matters: When someone checks in 10 feet away, you see them immediately. Not in 30 seconds when the next poll runs. That immediacy is what makes spontaneous connection possible.

The Pattern:

1. TanStack Query fetches initial data (enabled by isPrimed flag)
2. Supabase Realtime subscribes to Postgres row changes (INSERT/UPDATE/DELETE on checkins table filtered by place_id)
3. On change detected, invalidate TanStack Query cache → automatic refetch
4. Cleanup: unsubscribe when component unmounts

Example implementation:

```typescript
useEffect(() => {
  const channel = supabase
    .channel(`checkins-${placeId}`)
    .on(
      "postgres_changes",
      { table: "checkins", filter: `place_id=eq.${placeId}` },
      () => {
        queryClient.invalidateQueries({ queryKey: ["checkins", placeId] });
      },
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [placeId]);
```

The indirection (Realtime → invalidate cache → refetch) adds complexity, but delivers instant updates. Polling fallback (useCheckinsPolling.ts) covers edge cases where Realtime fails to connect (VPN
issues, Supabase cold starts).

---

5. Ephemeral Messages vs. Conversation History

We delete messages when sessions expire (2 hours or on checkout) instead of archiving them.

┌────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────┐
│ Optimized For │ Traded Away │
├────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────┤
│ Psychological safety and low-barrier entry │ Engagement metrics, user retention hooks, "come back and continue" patterns │
└────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────┘

Why it matters: Permanent chat history creates social risk. If every "hey, want to talk about the book you're reading?" lives forever, users self-censor. They worry about being misunderstood,
screenshotted, or judged later.

Ephemeral messages reduce the courage required to say "I'm here, want to chat?" You're not creating a record. It's like a real-world conversation—it happens, then it's gone.

This is a willful rejection of growth hacking. Most apps maximize retention by creating dependency (streaks, archives, notifications). We're optimizing for trust, not engagement time.

The bet: Lower barrier to first interaction beats higher retention of anxious users.

Implementation: Cron job (/api/cron/expire-message-sessions) runs periodically, marks sessions older than 2 hours as status: 'expired'. Messages stay in the DB (for debugging/moderation if needed) but
are no longer queryable via the app. Check-ins older than 2 hours get hard-deleted (/api/cron/expire-checkins). This creates a rolling 2-hour window of visibility.

---

6. Branded Types vs. Raw Strings

Every ID in the system uses Zod-branded types (UserId, PlaceId, SessionId, etc.) instead of raw strings.

┌──────────────────────────────────────────┬─────────────────────────────────────────────────────────────┐
│ Optimized For │ Traded Away │
├──────────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ Type safety and preventing ID mismatches │ Verbose parsing at boundaries (userIdSchema.parse(user.id)) │
└──────────────────────────────────────────┴─────────────────────────────────────────────────────────────┘

Why it matters: TypeScript can't tell the difference between string and string. If you accidentally pass a userId where placeId is expected, TypeScript won't catch it. Runtime bugs ensue.

Branded types create compile-time guarantees:

type UserId = string & { **brand: "UserId" }
type PlaceId = string & { **brand: "PlaceId" }

function getCheckins(placeId: PlaceId) { ... }
getCheckins(userId) // ❌ TypeScript error!

Every boundary (API response, form input, DB query) validates and brands IDs with Zod schemas. The verbosity is upfront, but you eliminate an entire class of bugs. No more "I passed the session ID to the user lookup function" mistakes.

---

7. Dual Product: User App + Business Owner Verification

Most MVPs ship one product. OverHere ships two: the spontaneous connection app and a business owner verification system with fraud detection.

┌──────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────┐
│ Optimized For │ Traded Away │
├──────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ Monetization pathway and trust layer for future features │ Scope creep, complexity, and delayed core product validation │
└──────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────┘

Why it matters: The core product (spontaneous connections) needs a revenue model. Business owners paying for verified badges, analytics, and promoted messaging is a clear path. But this requires solving
hard problems:

- Identity verification → How do you prove someone owns a coffee shop without in-person checks?
- Fraud prevention → What stops competitors or trolls from claiming competitors' locations?
- Admin review workflow → Who approves claims and how?

The Verification Flow:

1. Physical presence → User must have an active check-in at the location (proves presence within 24 hours)
2. Phone verification → SMS verification (6-digit code, 3 attempts, 10-min expiry)
3. Business information → Provides business email, role (owner/manager), tenure, and description
4. Fraud detection → System calculates a 0-100 risk score based on 9 signals
5. Admin review → Scores 26+ trigger manual review
6. Approval → Creates verifiedOwnersTable entry → access to owner dashboard

The 9 Fraud Signals:

┌─────────────────────┬───────────────────┬──────────────────────────────────────┐
│ Signal │ Weight │ What It Detects │
├─────────────────────┼───────────────────┼──────────────────────────────────────┤
│ Account Age │ +15 to +25 │ Very new accounts (<7 days) flagged │
├─────────────────────┼───────────────────┼──────────────────────────────────────┤
│ Check-in History │ +10 to +20 │ Accounts without prior app usage │
├─────────────────────┼───────────────────┼──────────────────────────────────────┤
│ Recent Check-in │ +15 to +50 │ Must be <24hrs at exact location │
├─────────────────────┼───────────────────┼──────────────────────────────────────┤
│ Phone Reuse │ +30 per duplicate │ Same phone claiming multiple places │
├─────────────────────┼───────────────────┼──────────────────────────────────────┤
│ Email Domain │ +15 │ Personal Gmail vs. business domains │
├─────────────────────┼───────────────────┼──────────────────────────────────────┤
│ IP Patterns │ +25 │ 3+ claims from same IP = farming │
├─────────────────────┼───────────────────┼──────────────────────────────────────┤
│ Previous Rejections │ +20 to +40 │ 3-strike system with 60-day cooldown │
├─────────────────────┼───────────────────┼──────────────────────────────────────┤
│ Existing Ownership │ +50 │ Place already has verified owner │
├─────────────────────┼───────────────────┼──────────────────────────────────────┤
│ Suspicious Timing │ +10 │ Claims between 2-6am flagged │
└─────────────────────┴───────────────────┴──────────────────────────────────────┘

Risk Thresholds:

- 0-25 (Low Risk): Auto-approve after phone verification
- 26-50 (Medium Risk): Standard admin review required
- 51-75 (High Risk): Enhanced admin review required
- 76-100 (Critical Risk): Reject or intensive verification

Rate Limits:

Per-User:

- Max 1 active claim at a time
- Max 10 lifetime claims
- Max 3 rejections (60-day cooldown)

Per-IP:

- Max 2 claims per day
- Max 5 claims per week

Per-Place:

- Max 10 claims per day

Account Requirements:

- Min account age: 7 days
- Min check-ins before claim: 1

This is a massive scope expansion. But without it, the product has no business model. The tradeoff: delayed validation of core user experience in exchange for a clear monetization path.

---

Why It Matters to Customers

For Users

Ephemeral data means you can say "I'm here, want to chat?" without it living in a database forever. That reduces the emotional cost of reaching out. Lower courage threshold = more first messages sent.

Real-time architecture means when someone checks in nearby, you see them within seconds. It feels like a live space, not a bulletin board you refresh. That immediacy is what enables "right now"
spontaneity.

Managed infrastructure (Supabase, Vercel) means the app stays fast and available without operational babysitting. Users don't see "down for maintenance"—they see reliability, which builds trust in
hyper-local contexts where stakes feel high.

Browser-first design means no app store gatekeeping. See a QR code at a coffee shop? You're chatting in 30 seconds. Lower friction = faster time-to-value.

For Business Owners

Verified badges create a trust layer. If a cafe owner has a verified badge and posts "free coffee for anyone chatting today," users trust it's real. That unlocks location-driven engagement.

Fraud prevention ensures bad actors can't claim competitors' locations or spam fake ownership. The 9-signal scoring system, rate limits, and admin review create a defensible moat against abuse.

The architecture isn't clever for cleverness's sake. Every choice trades off something to optimize for one outcome: getting strangers to talk to each other without fear, while creating a sustainable
business model around location-based trust.

---

The Dual Nature: Technical Implementation

User-Facing Product (Spontaneous Connections)

Data Flow:

1. Search → User searches for place (Google Places API via searchPlaces.ts)
2. Check-in → Selects place → check-in form (submits via checkIn() Server Action)
3. Caching → Place details cached (fetchAndCacheGooglePlaceDetails() with 30-day staleness)
4. Deactivation → Check-in inserted, older check-ins deactivated (enforce "one active check-in per user")
5. Navigation → User redirected to /places/[placeId] (place detail page)
6. Real-time → useRealtimeCheckins hook loads initial check-ins, subscribes to live updates
7. Request → User sends message request → requestToMessage() Server Action
8. Notification → Recipient sees request via useRealtimeMessageRequests hook
9. Session → On acceptance, respondToMessageRequest() creates session
10. Messaging → Both users redirect to messaging UI
11. Messages → submitMessage() sends messages, useRealtimeMessages syncs instantly
12. Expiration → After 2 hours or checkout, session expires (cron job marks status: 'expired')

Key Tables:

┌──────────────────────────┬────────────────────────────────────────────────────────┐
│ Table │ Purpose │
├──────────────────────────┼────────────────────────────────────────────────────────┤
│ users │ Synced from Supabase Auth via ensureUserInDb() │
├──────────────────────────┼────────────────────────────────────────────────────────┤
│ places │ Cached Google Places data │
├──────────────────────────┼────────────────────────────────────────────────────────┤
│ checkins │ Active user presence (hard-deleted after 2 hours) │
├──────────────────────────┼────────────────────────────────────────────────────────┤
│ message_session_requests │ Pending/accepted/rejected requests │
├──────────────────────────┼────────────────────────────────────────────────────────┤
│ message_sessions │ Active/expired chat sessions │
├──────────────────────────┼────────────────────────────────────────────────────────┤
│ messages │ Individual messages (queryable only if session active) │
└──────────────────────────┴────────────────────────────────────────────────────────┘

Rate Limiting:

- Check-ins: 100/hour per IP (testing, should be 3 in production)
- Message Requests: 100 per 5 minutes (testing, should be 10)
- Messages: 600 per 10 minutes (1 every 10 seconds average)

---

Business Owner Product (Verification & Dashboard)

Data Flow:

1. Check-in → Owner checks in at their location
2. Eligibility → Navigates to /claim/eligibility → reviews terms
3. Selection → /claim/select-place → picks location with active check-in
4. Claim Start → startClaim() Server Action creates placeClaimsTable entry with fraud score
5. Business Info → /claim/[claimId]/business-info → submits phone, email, role, description
6. Data Save → submitBusinessInfo() saves data
7. Verification → /claim/[claimId]/verify-phone → SMS verification flow (mock in dev)
8. Code Check → verifyPhone() validates code (max 3 attempts, 10-min expiry)
9. Review → /claim/[claimId]/review → final submission via submitClaim()
10. Admin → Admin reviews claim (fraud score, details, audit log)
11. Approval → adminReviewClaim() approves → creates verifiedOwnersTable entry
12. Dashboard → Owner redirected to /dashboard/places/[placeId] (analytics, promotions, settings)

Key Tables:

┌───────────────────────┬───────────────────────────────────────────────────┐
│ Table │ Purpose │
├───────────────────────┼───────────────────────────────────────────────────┤
│ place_claims │ Claim submissions with fraud scores │
├───────────────────────┼───────────────────────────────────────────────────┤
│ verified_owners │ Approved owners (with Stripe subscription fields) │
├───────────────────────┼───────────────────────────────────────────────────┤
│ promotions │ Future feature for promoted messages │
├───────────────────────┼───────────────────────────────────────────────────┤
│ place_owner_settings │ Custom announcements, descriptions │
├───────────────────────┼───────────────────────────────────────────────────┤
│ claim_audit_log │ Complete action history │
├───────────────────────┼───────────────────────────────────────────────────┤
│ claim_rate_limits │ IP-based rate limiting │
├───────────────────────┼───────────────────────────────────────────────────┤
│ verification_attempts │ Phone verification attempt tracking │
└───────────────────────┴───────────────────────────────────────────────────┘

---

Predictions & Concerns

Watching for Failures

1. No Message History = Harder Bad Actor Tracking

Problem: Privacy and safety for users, but makes bad actors harder to track. If harassment occurs, there's no evidence trail beyond the 2-hour window. Moderation becomes reactive, not proactive.

Mitigation:

- Failed message request tracking (failedMessageRequestsTable) logs rejected interactions
- Could extend to flag patterns (same user rejected 10x in 1 day = likely harassing)
- Consider adding user-initiated reporting with temporary message retention for investigations

---

2. Ephemeral Check-ins = Lost Historical Context

Problem: Deleted after 2 hours for privacy, but lose historical context. Can't answer "how busy is this place on Tuesday afternoons?" without retention.

Mitigation:

- Aggregate analytics table (place_analytics_hourly) that stores counts without user IDs
- Roll up deleted check-ins into anonymized stats before deletion

---

3. Fraud Detection Relies on Account Age

Problem: Sophisticated attackers create "aged" accounts in advance. A bad actor could create 50 accounts, wait 30 days, then claim spam locations.

Mitigation:

- Weight check-in diversity more heavily (accounts with check-ins at 5+ different places = more trustworthy)
- Consider device fingerprinting for high-risk claims

---

4. Server Actions Are Newer Than REST

Problem: If Next.js edge runtime restrictions or scaling issues emerge, migrating hundreds of Server Actions to API routes is painful.

Mitigation:

- Keep Server Actions thin (just auth + validation + DB call)
- Business logic should live in reusable services (src/lib/services), not inline in actions
- Makes migration to REST routes easier

---

5. Real-time Subscriptions Can Fail

Problem: Add client-side complexity and can fail (VPN issues, Supabase cold starts). If Realtime breaks, users fall back to polling—but they've been conditioned to expect instant updates.

Mitigation:

- Polling fallback hooks already implemented (useCheckinsPolling.ts)
- Could add UI indicator when Realtime connection drops (yellow dot = "slower updates right now")

---

6. Managed Infrastructure Creates Vendor Dependency

Problem: Optimizes for speed-to-demo but creates vendor dependency. Pricing changes or service degradation could force expensive migrations.

Mitigation:

- Drizzle ORM abstracts database operations (not Supabase-specific)
- Migration to raw Postgres + custom Realtime is feasible if needed
- Edge functions already use Node runtime, not Vercel-specific APIs

---

7. Dual Product Delays Core Validation

Problem: User app + owner verification delays core validation. If spontaneous connections don't have product-market fit, the owner verification system is wasted effort.

Counter-argument: Without a monetization path, even a successful user app dies when funding runs out. The dual product is necessary risk. Consider launching user app first, adding owner verification only after proving core engagement metrics.

---

The Honest Assessment

This architecture optimizes for solo builder speed and demo-ability. It's not "web scale" engineering. It's pragmatic: leverage managed services, adopt newer patterns for velocity, trade vendor lock-in
for time-to-market.

If OverHere Finds Traction, Expect To:

- Migrate from Server Actions to REST APIs (for Edge caching and API versioning)
- Add aggregate analytics (for owner dashboards without keeping user data)
- Harden fraud detection (device fingerprinting, ML scoring, stricter limits)
- Build custom WebSocket infrastructure (if Supabase Realtime pricing becomes untenable)
- Implement proper content moderation (screenshot detection, pattern matching, human review)

But those are high-quality problems. The current architecture gets to validation fastest. If the product fails, you didn't waste months on premature scaling. If it succeeds, you have revenue to fund the
rebuild.

---

```

```
