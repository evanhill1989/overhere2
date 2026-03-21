import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  sanitizeText,
  escapeHtml,
  sanitizeQueryParam,
  validateFormData,
} from "./common";

// ============================================
// sanitizeText
// ============================================

describe("sanitizeText", () => {
  it("strips HTML tags", () => {
    expect(sanitizeText("<b>bold</b>")).toBe("bold");
    expect(sanitizeText("<script>alert('xss')</script>")).toBe("alert('xss')");
  });

  it("removes leftover angle brackets", () => {
    // "< b >" is matched as an HTML tag and stripped, then remaining brackets are removed
    expect(sanitizeText("a < b > c")).toBe("a  c");
    // "< b" has no closing >, so only the < is removed by the second replace
    expect(sanitizeText("a < b")).toBe("a  b");
  });

  it("trims whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(sanitizeText("")).toBe("");
  });

  it("handles string with only HTML", () => {
    expect(sanitizeText("<br><hr>")).toBe("");
  });
});

// ============================================
// escapeHtml
// ============================================

describe("escapeHtml", () => {
  it("escapes ampersand", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtml("<div>")).toBe("&lt;div&gt;");
  });

  it("escapes quotes", () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
    expect(escapeHtml("it's")).toBe("it&#x27;s");
  });

  it("escapes forward slash", () => {
    expect(escapeHtml("a/b")).toBe("a&#x2F;b");
  });

  it("escapes all special chars together", () => {
    expect(escapeHtml('<a href="/">')).toBe(
      "&lt;a href=&quot;&#x2F;&quot;&gt;",
    );
  });

  it("leaves plain text unchanged", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });
});

// ============================================
// sanitizeQueryParam
// ============================================

describe("sanitizeQueryParam", () => {
  it("returns sanitized string for string input", () => {
    expect(sanitizeQueryParam("  hello  ")).toBe("hello");
  });

  it("takes first element of array", () => {
    expect(sanitizeQueryParam(["first", "second"])).toBe("first");
  });

  it("returns empty string for undefined", () => {
    expect(sanitizeQueryParam(undefined)).toBe("");
  });

  it("strips HTML from param", () => {
    expect(sanitizeQueryParam("<b>bold</b>")).toBe("bold");
  });
});

// ============================================
// validateFormData
// ============================================

describe("validateFormData", () => {
  it("parses and sanitizes form data", () => {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
    });

    const formData = new FormData();
    formData.append("name", "  Alice  ");
    formData.append("email", "alice@example.com");

    const result = validateFormData(formData, schema);
    expect(result.name).toBe("Alice");
    expect(result.email).toBe("alice@example.com");
  });

  it("strips HTML from form values", () => {
    const schema = z.object({
      comment: z.string(),
    });

    const formData = new FormData();
    formData.append("comment", "<script>bad</script>safe");

    const result = validateFormData(formData, schema);
    expect(result.comment).toBe("badsafe");
  });

  it("throws on invalid data", () => {
    const schema = z.object({
      email: z.string().email(),
    });

    const formData = new FormData();
    formData.append("email", "not-an-email");

    expect(() => validateFormData(formData, schema)).toThrow();
  });
});
