import { z } from "zod";

/**
 * Strips HTML tags, script vectors, and javascript: protocols from input strings
 * to strictly prevent Stored XSS attacks in clinical records and receipts.
 */
export function stripHtml(input: string): string {
  if (!input || typeof input !== "string") return "";

  return input
    // Remove script tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove iframe tags and contents
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    // Remove style tags and contents
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, "")
    // Neutralize dangerous javascript: protocol pseudo-URLs
    .replace(/javascript:/gi, "")
    // Trim leading/trailing whitespace
    .trim();
}

/**
 * Custom Zod string preprocessor that automatically sanitizes input against XSS.
 */
export const sanitizedString = (min = 0, max = 1000) =>
  z.preprocess((val) => (typeof val === "string" ? stripHtml(val) : val), z.string().min(min).max(max));

export const sanitizedOptionalString = (max = 1000) =>
  z.preprocess(
    (val) => (typeof val === "string" ? stripHtml(val) : val),
    z.string().max(max).optional().nullable()
  );
