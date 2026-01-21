Ownership Verification Flow Plan

1. Entry Point & Routing

Improvements to your approach:

- Footer link labeled "Business Owners" or "For Business Owners" (more professional than "Location Owners")
- Add a second subtle entry point: On the place detail page (/places/[placeId]), show a small "Are you the owner?" link only to authenticated users with an active check-in at that location
- Route logic:
  - If user has verified ownership → their dashboard (/dashboard/places)
  - If user has pending claim → claim status page (/claim/[claimId]/status)
  - Otherwise → landing/eligibility page (/claim/start)

2. Pre-Verification Requirements

Your approach is good. I'd add:

Required before starting claim:
✓ Authenticated user account
✓ Active check-in at target location within last 24 hours
✓ No existing pending claims for this user
✓ Account age > 7 days (prevents fresh spam accounts)
✓ Not in cooldown period from previous rejection

3. Multi-Step Verification Flow

Step 0: Landing Page (/claim/start)

- Overview of business owner benefits
- Clear explanation: "This is for business owners/managers only"
- "Start Verification" button → checks eligibility requirements

Step 1: Eligibility & Legal Agreement (/claim/eligibility)

Content:

- "You must be an owner, manager, or authorized representative"
- List what you can/cannot do with ownership access
- Explicit penalties section:
  - False claims result in permanent ban
  - Legal liability for fraudulent claims
  - Violations reported to authorities if malicious
- Checkbox: "I certify I am authorized to represent this business"
- Checkbox: "I understand false claims will result in account termination"
- Continue button (disabled until both checked)

Step 2: Place Selection & Recent Check-in Verification (/claim/select-place)

- Show user's active check-ins from last 24 hours
- User selects which place they want to claim
- Display place details (name, address, Google Place ID)
- Confirm: "Is this the correct location?"
- Backend validation:
  - Verify check-in exists and is within 24hr window
  - Check user doesn't already have pending claim for this place
  - Verify place isn't already claimed (or handle co-owner case)

Step 3: Business Information (/claim/[claimId]/business-info)

Form fields:

- Your role: [Owner | Manager | Authorized Representative]
- Business email (must match business domain if available)
  - For "Joe's Coffee Shop" → require @joescoffeeshop.com or similar
  - If small biz without domain, allow explanation field
- Business phone number (will be used for verification)
- Optional: Business registration number, EIN, or other proof
- Years at this location: [< 1 | 1-2 | 3-5 | 5+]
- Brief description of your role (100 chars max)

Validation:

- Email domain check against known business websites
- Phone number area code should match location area (soft check)

Step 4: Phone Verification (/claim/[claimId]/verify-phone)

Process:

1. Send 6-digit SMS code to business phone
2. Code expires in 10 minutes
3. Max 3 attempts to enter correct code
4. After 3 failures → claim automatically rejected, 7-day cooldown

Display:

- "We sent a code to XXX-XXX-1234"
- Input field for 6-digit code
- "Resend code" (max 2 resends, 60s cooldown between)
- Verification timer countdown

Alternative verification methods (if phone fails):

- "Having trouble? Request manual verification"
  → Triggers admin review flow
  → User must upload business documents

Step 5: Review & Submit (/claim/[claimId]/review)

Summary of all information:

- Place name & address
- Your role
- Contact info provided
- Verification method used

Final warnings:

- "Fraudulent claims are tracked and prosecuted"
- "Our team may contact you to verify details"

Submit button → moves claim to "pending" status

Step 6: Pending Review (/claim/[claimId]/status)

Status screen:

- "Your claim is under review"
- Estimated review time: 1-3 business days
- Shows submission timestamp
- Contact support button if needed

Email notification sent to user with claim details

4. Enhanced Security & Anti-Fraud Measures

Rate Limits (more aggressive than you proposed):

// Per-user limits
MAX_ACTIVE_CLAIMS: 1
MAX_LIFETIME_CLAIMS: 10 // Reasonable for someone managing multiple locations
MAX_REJECTED_CLAIMS: 3
REJECTION_COOLDOWN_DAYS: 60 // Longer cooldown = stronger deterrent

// Per-IP limits (catch ban evaders)
MAX_CLAIMS_PER_IP_PER_DAY: 2
MAX_CLAIMS_PER_IP_PER_WEEK: 5

// Per-place limits
MAX_CLAIMS_PER_PLACE_PER_DAY: 10 // Prevent coordinated attacks on single location
REQUIRE_UNIQUE_PHONE_PER_PLACE: true // Same phone can't claim multiple times

// Account requirements
MIN_ACCOUNT_AGE_DAYS: 7
MIN_CHECKINS_BEFORE_CLAIM: 1 // Could increase to 2-3

Fraud Detection Signals:

// Flag for manual review if:

- Account age < 30 days
- User has 0 previous check-ins beyond the required one
- Phone number already used for another claim
- Email domain doesn't match business
- Multiple claims from same IP
- Claim submitted outside business hours (weak signal)
- User's previous claims were rejected
- Business already has a verified owner (co-owner case)

Verification Code Security:

// Phone verification
CODE_LENGTH: 6 digits
CODE_EXPIRY_MINUTES: 10
MAX_VERIFICATION_ATTEMPTS: 3
MAX_CODE_RESENDS: 2
RESEND_COOLDOWN_SECONDS: 60

// Store hashed verification codes, never plain text
// Rate limit by phone number globally (prevent number recycling attacks)

5. Processing Fee Consideration

My recommendation: Start without a fee, add later if needed

Pros of fee:

- Strong spam deterrent
- Revenue stream
- Shows seriousness

Cons of fee:

- Barrier for legitimate small business owners
- Adds payment processing complexity
- Refund handling for rejected claims creates friction
- May seem like a cash grab

Alternative: Freemium model

- Verification is free
- Owner dashboard features require subscription ($20-50/month)
- This way legitimate owners get access, pay for value
- Spammers don't profit from free verification

6. Admin Review Dashboard

Essential features for manual review:

Admin dashboard shows:

- All pending claims sorted by submission date
- Fraud risk score (0-100) based on signals
- User's claim history
- Place details & existing owner status
- Quick actions: [Approve] [Reject] [Request More Info]
- Rejection reason dropdown (tracked for patterns)
- Notes field for internal documentation

Automatic approval criteria (skip manual review):

- Account age > 90 days
- Email domain matches verified business domain
- Phone verification successful
- No fraud signals triggered
- Place has no existing owner

7. Database Schema Validation

Looking at your existing schema, you have most pieces. Suggested additions:

// Add to placeClaimsTable
ipAddress: varchar("ip_address", { length: 45 }), // Track for rate limiting
userAgent: text("user_agent"), // Fraud detection
fraudScore: integer("fraud_score").default(0), // 0-100
adminReviewNotes: text("admin_review_notes"),
role: ownerRoleEnum("role").notNull(), // From business info step

// Add new table for tracking verification attempts
export const verificationAttemptsTable = pgTable("verification_attempts", {
id: uuid("id").primaryKey().defaultRandom(),
claimId: uuid("claim_id").notNull().references(() => placeClaimsTable.id),
phoneNumber: varchar("phone_number", { length: 20 }),
attemptCount: integer("attempt_count").default(0),
lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Add new table for claim history/audit trail
export const claimAuditLogTable = pgTable("claim_audit_log", {
id: uuid("id").primaryKey().defaultRandom(),
claimId: uuid("claim_id").notNull().references(() => placeClaimsTable.id),
action: varchar("action", { length: 100 }).notNull(), // "submitted", "phone_verified", "rejected", etc.
actorId: uuid("actor_id"), // User or admin who took action
metadata: text("metadata"), // JSON string with details
createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

8. Technical Implementation Checklist

Server Actions needed:
□ src/app/\_actions/ownershipActions.ts - startClaim(placeId): Create pending claim, check eligibility - submitBusinessInfo(claimId, data): Save business details - sendVerificationCode(claimId): SMS verification - verifyPhoneCode(claimId, code): Check code validity - submitClaim(claimId): Final submission - cancelClaim(claimId): User cancellation

□ src/app/\_actions/ownershipQueries.ts - getUserClaims(userId): Get all user's claims - getClaimStatus(claimId): Get specific claim details - getPlaceOwnershipStatus(placeId): Check if claimed - checkClaimEligibility(userId, placeId): Pre-check before starting

Rate Limiting:
□ Add CLAIM\_\* configs to src/lib/security/serverActionRateLimit.ts
□ Implement per-IP and per-user tracking
□ Add phone number rate limiting

Components:
□ src/components/ownership/ClaimEligibilityScreen.tsx
□ src/components/ownership/PlaceSelectionForm.tsx
□ src/components/ownership/BusinessInfoForm.tsx
□ src/components/ownership/PhoneVerificationForm.tsx
□ src/components/ownership/ClaimReviewScreen.tsx
□ src/components/ownership/ClaimStatusTracker.tsx

Pages:
□ src/app/claim/start/page.tsx
□ src/app/claim/eligibility/page.tsx
□ src/app/claim/[claimId]/business-info/page.tsx
□ src/app/claim/[claimId]/verify-phone/page.tsx
□ src/app/claim/[claimId]/review/page.tsx
□ src/app/claim/[claimId]/status/page.tsx

Admin pages:
□ src/app/admin/claims/page.tsx (pending claims list)
□ src/app/admin/claims/[claimId]/page.tsx (review individual claim)

Utilities:
□ src/lib/services/phoneVerification.ts (Twilio/SMS integration)
□ src/lib/services/fraudDetection.ts (Calculate fraud scores)
□ src/lib/services/domainValidation.ts (Email domain checks)

Emails:
□ Claim submitted confirmation
□ Claim approved notification
□ Claim rejected notification (with reason)
□ Admin: New claim needs review

9. User Experience Considerations

Progress indicator:

- Show step progress: "Step 2 of 5: Business Information"
- Allow going back to previous steps
- Auto-save form data (prevent loss on accidental close)

Clear communication:

- Set expectations: "Review typically takes 1-3 business days"
- Email at every step: submission, review, approval/rejection
- If rejected, clear explanation of why + how to appeal

Co-ownership handling:

- If place already has owner, require existing owner approval
- Or route to "Request Co-Owner Access" flow
- Existing owner gets notification + approval UI

10. Launch Strategy

Phase 1: Soft Launch

- Manually approve all claims for first 2-4 weeks
- Gather data on fraud attempts
- Refine fraud detection rules
- Document common rejection reasons

Phase 2: Semi-Automated

- Auto-approve low-risk claims (aged accounts, domain match, etc.)
- Manual review for medium/high risk
- Monitor false positive/negative rates

Phase 3: Full Automation

- Auto-approve >80% of claims
- Manual review only for high-risk
- Admin dashboard for exception handling

Summary

Your original plan was solid. My key additions:

1. Account age requirement (7+ days) - simple spam deterrent
2. IP-based rate limiting - catch ban evaders
3. Fraud scoring system - automate risk assessment
4. Audit logging - track all actions for investigation
5. Co-ownership flow - handle businesses with multiple managers
6. Freemium over upfront fee - better user experience
7. Soft launch strategy - gather data before full automation

The flow prioritizes legitimate owners while creating multiple barriers for spammers: recent check-in requirement, legal warnings, phone verification, rate limits, and manual review for suspicious cases.
