"use server";

import { db } from "@/lib/db";
import { placeClaimsTable, verificationAttemptsTable } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import type { ClaimId } from "@/lib/types/database";
import { CLAIM_LIMITS } from "@/lib/security/claimRateLimiter";

// ============================================
// PHONE VERIFICATION SERVICE (MOCK)
// ============================================

export type SendCodeResult = {
  success: boolean;
  error?: string;
  attemptsRemaining?: number;
};

export type VerifyCodeResult = {
  success: boolean;
  verified: boolean;
  error?: string;
  attemptsRemaining?: number;
};

/**
 * Generate a 6-digit verification code
 */
function generateVerificationCode(): string {
  // For mock implementation, always return "123456" for easy testing
  // In production, use: Math.floor(100000 + Math.random() * 900000).toString();
  return "123456";
}

/**
 * Hash verification code for storage (basic implementation)
 */
function hashCode(code: string): string {
  // For mock implementation, store plaintext
  // In production, use proper hashing (bcrypt, argon2, etc.)
  return code;
}

/**
 * Send verification code via SMS
 * MOCK IMPLEMENTATION: Doesn't actually send SMS, just stores code
 */
export async function sendVerificationCode(
  claimId: ClaimId,
  phoneNumber: string,
): Promise<SendCodeResult> {
  try {
    // Get claim
    const claim = await db
      .select()
      .from(placeClaimsTable)
      .where(eq(placeClaimsTable.id, claimId))
      .limit(1);

    if (claim.length === 0) {
      return { success: false, error: "Claim not found" };
    }

    // Generate code and expiry
    const code = generateVerificationCode();
    const expiresAt = new Date(
      Date.now() + CLAIM_LIMITS.CODE_EXPIRY_MINUTES * 60 * 1000,
    );

    // Update claim with verification code
    await db
      .update(placeClaimsTable)
      .set({
        verificationCode: hashCode(code),
        verificationCodeExpiresAt: expiresAt,
        verificationCodeAttempts: 0, // Reset attempts on new code
        phoneNumber: phoneNumber,
      })
      .where(eq(placeClaimsTable.id, claimId));

    // Log to verification attempts table
    await db.insert(verificationAttemptsTable).values({
      claimId,
      phoneNumber,
      attemptCount: 0,
      lastAttemptAt: new Date(),
    });

    // MOCK: In production, this is where you'd call Twilio/AWS SNS
    console.log(`[MOCK SMS] Sending code ${code} to ${phoneNumber}`);
    console.log(`[MOCK SMS] Code expires at ${expiresAt.toISOString()}`);

    return {
      success: true,
      attemptsRemaining: CLAIM_LIMITS.MAX_VERIFICATION_ATTEMPTS,
    };
  } catch (error) {
    console.error("Error sending verification code:", error);
    return {
      success: false,
      error: "Failed to send verification code",
    };
  }
}

/**
 * Verify phone code
 * MOCK IMPLEMENTATION: Accepts any code (or just "123456")
 */
export async function verifyPhoneCode(
  claimId: ClaimId,
  submittedCode: string,
): Promise<VerifyCodeResult> {
  try {
    // Get claim
    const claim = await db
      .select()
      .from(placeClaimsTable)
      .where(eq(placeClaimsTable.id, claimId))
      .limit(1);

    if (claim.length === 0) {
      return {
        success: false,
        verified: false,
        error: "Claim not found",
      };
    }

    const claimData = claim[0];

    // Check if code exists
    if (!claimData.verificationCode) {
      return {
        success: false,
        verified: false,
        error: "No verification code sent. Please request a new code.",
      };
    }

    // Check if code expired
    if (
      claimData.verificationCodeExpiresAt &&
      new Date() > new Date(claimData.verificationCodeExpiresAt)
    ) {
      return {
        success: false,
        verified: false,
        error: "Verification code expired. Please request a new code.",
      };
    }

    // Check attempts
    const attempts = claimData.verificationCodeAttempts || 0;
    if (attempts >= CLAIM_LIMITS.MAX_VERIFICATION_ATTEMPTS) {
      return {
        success: false,
        verified: false,
        error: "Too many verification attempts. Please request a new code.",
        attemptsRemaining: 0,
      };
    }

    // MOCK IMPLEMENTATION: Auto-pass any code
    // In production, compare: hashCode(submittedCode) === claimData.verificationCode
    const isValid = true; // Always pass for mock

    if (!isValid) {
      // Increment attempts
      await db
        .update(placeClaimsTable)
        .set({
          verificationCodeAttempts: attempts + 1,
        })
        .where(eq(placeClaimsTable.id, claimId));

      return {
        success: true,
        verified: false,
        error: "Invalid verification code",
        attemptsRemaining:
          CLAIM_LIMITS.MAX_VERIFICATION_ATTEMPTS - (attempts + 1),
      };
    }

    // Code is valid - clear verification data
    await db
      .update(placeClaimsTable)
      .set({
        verificationCode: null,
        verificationCodeExpiresAt: null,
        verificationCodeAttempts: 0,
      })
      .where(eq(placeClaimsTable.id, claimId));

    // Update verification attempts table
    await db
      .update(verificationAttemptsTable)
      .set({
        attemptCount: attempts + 1,
        lastAttemptAt: new Date(),
      })
      .where(eq(verificationAttemptsTable.claimId, claimId));

    return {
      success: true,
      verified: true,
    };
  } catch (error) {
    console.error("Error verifying phone code:", error);
    return {
      success: false,
      verified: false,
      error: "Failed to verify code",
    };
  }
}

/**
 * Resend verification code
 */
export async function resendVerificationCode(
  claimId: ClaimId,
): Promise<SendCodeResult> {
  try {
    // Get claim to retrieve phone number
    const claim = await db
      .select()
      .from(placeClaimsTable)
      .where(eq(placeClaimsTable.id, claimId))
      .limit(1);

    if (claim.length === 0) {
      return { success: false, error: "Claim not found" };
    }

    const phoneNumber = claim[0].phoneNumber;
    if (!phoneNumber) {
      return { success: false, error: "No phone number on file" };
    }

    // Send new code (reuses sendVerificationCode logic)
    return await sendVerificationCode(claimId, phoneNumber);
  } catch (error) {
    console.error("Error resending verification code:", error);
    return {
      success: false,
      error: "Failed to resend verification code",
    };
  }
}

/**
 * Check remaining verification attempts
 */
export async function getVerificationAttempts(claimId: ClaimId): Promise<{
  attempts: number;
  attemptsRemaining: number;
  codeExpired: boolean;
}> {
  const claim = await db
    .select()
    .from(placeClaimsTable)
    .where(eq(placeClaimsTable.id, claimId))
    .limit(1);

  if (claim.length === 0) {
    return { attempts: 0, attemptsRemaining: 0, codeExpired: true };
  }

  const attempts = claim[0].verificationCodeAttempts || 0;
  const codeExpired =
    claim[0].verificationCodeExpiresAt &&
    new Date() > new Date(claim[0].verificationCodeExpiresAt);

  return {
    attempts,
    attemptsRemaining: Math.max(
      0,
      CLAIM_LIMITS.MAX_VERIFICATION_ATTEMPTS - attempts,
    ),
    codeExpired: codeExpired || false,
  };
}

// ============================================
// FUTURE: Real Twilio Implementation
// ============================================

/*
  // Example of real Twilio implementation (commented out for future use):

  import twilio from 'twilio';

  const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  async function sendSmsViaTwilio(phoneNumber: string, code: string): Promise<boolean> {
    try {
      await twilioClient.messages.create({
        body: `Your OverHere verification code is: ${code}. This code expires in ${CLAIM_LIMITS.CODE_EXPIRY_MINUTES} minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });
      return true;
    } catch (error) {
      console.error('Twilio SMS error:', error);
      return false;
    }
  }

  // Then in sendVerificationCode(), replace the console.log with:
  // const smsSent = await sendSmsViaTwilio(phoneNumber, code);
  // if (!smsSent) {
  //   return { success: false, error: "Failed to send SMS" };
  // }
  */
