"use server";

/**
 * Domain validation utilities for business email verification
 */

// Common business types and their typical domains
const BUSINESS_DOMAIN_PATTERNS = {
  restaurant: ["restaurant", "cafe", "bistro", "diner", "grill", "kitchen"],
  retail: ["shop", "store", "boutique", "market", "outlet"],
  service: ["service", "repair", "salon", "spa", "clinic", "dental"],
  hospitality: ["hotel", "inn", "resort", "lodge", "motel"],
};

// Domains that are always considered personal (not business)
const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "aol.com",
  "icloud.com",
  "protonmail.com",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "gmx.com",
  "inbox.com",
];

export type DomainValidationResult = {
  isValid: boolean;
  isBusinessDomain: boolean;
  isProbablyLegitimate: boolean;
  confidence: "high" | "medium" | "low";
  reason?: string;
};

/**
 * Validate business email domain
 */
export function validateBusinessEmail(
  email: string,
  businessName?: string,
): DomainValidationResult {
  const domain = email.split("@")[1]?.toLowerCase();

  if (!domain) {
    return {
      isValid: false,
      isBusinessDomain: false,
      isProbablyLegitimate: false,
      confidence: "low",
      reason: "Invalid email format",
    };
  }

  // Check if personal domain
  if (PERSONAL_EMAIL_DOMAINS.includes(domain)) {
    return {
      isValid: true,
      isBusinessDomain: false,
      isProbablyLegitimate: false,
      confidence: "high",
      reason: "Personal email domain detected",
    };
  }

  // If business name provided, check for domain match
  if (businessName) {
    const normalizedBusinessName = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const normalizedDomain = domain.replace(/[^a-z0-9]/g, "");

    // Check if domain contains business name
    if (
      normalizedDomain.includes(normalizedBusinessName) ||
      normalizedBusinessName.includes(normalizedDomain.split(".")[0])
    ) {
      return {
        isValid: true,
        isBusinessDomain: true,
        isProbablyLegitimate: true,
        confidence: "high",
        reason: "Domain matches business name",
      };
    }
  }

  // Check for generic business domain patterns
  const domainName = domain.split(".")[0];
  const hasBusinessPattern = Object.values(BUSINESS_DOMAIN_PATTERNS)
    .flat()
    .some((pattern) => domainName.includes(pattern));

  if (hasBusinessPattern) {
    return {
      isValid: true,
      isBusinessDomain: true,
      isProbablyLegitimate: true,
      confidence: "medium",
      reason: "Domain contains business-related keywords",
    };
  }

  // Default: Unknown domain, possibly business
  return {
    isValid: true,
    isBusinessDomain: true,
    isProbablyLegitimate: false,
    confidence: "low",
    reason: "Unable to verify business domain authenticity",
  };
}

/**
 * Extract domain from email
 */
export function extractDomain(email: string): string | null {
  const parts = email.split("@");
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}

/**
 * Check if email is from a free email provider
 */
export function isFreeEmailProvider(email: string): boolean {
  const domain = extractDomain(email);
  return domain ? PERSONAL_EMAIL_DOMAINS.includes(domain) : false;
}
