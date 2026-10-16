import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required for database connectivity"),

  HUB_INTERNAL_API_KEY: z
    .string()
    .min(16, "HUB_INTERNAL_API_KEY must be at least 16 characters for secure provisioning"),

  HUB_SSO_SECRET: z
    .string()
    .min(32, "HUB_SSO_SECRET must be at least 32 characters for HMAC-SHA256 signature security"),

  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL")
    .default("http://localhost:3000"),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  NEXT_PUBLIC_HUB_BILLING_URL: z
    .string()
    .url()
    .optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("FATAL: Environment validation failure. Missing or invalid production variables:");
    console.error(JSON.stringify(result.error.format(), null, 2));

    // Hard fail during build or production startup
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `Production deployment aborted: ${result.error.issues.map((e: any) => `${e.path.join(".")}: ${e.message}`).join(", ")}`
      );
    }

    return process.env as unknown as Env;
  }

  // Production Security Warning: Block insecure dev keys in live production
  if (result.data.NODE_ENV === "production") {
    if (
      result.data.HUB_INTERNAL_API_KEY.includes("placeholder") ||
      result.data.HUB_INTERNAL_API_KEY.includes("dev-")
    ) {
      throw new Error("SECURITY VIOLATION: Insecure dev placeholder detected for HUB_INTERNAL_API_KEY in production.");
    }

    if (
      result.data.HUB_SSO_SECRET.includes("placeholder") ||
      result.data.HUB_SSO_SECRET.includes("dev-")
    ) {
      throw new Error("SECURITY VIOLATION: Insecure dev placeholder detected for HUB_SSO_SECRET in production.");
    }
  }

  return result.data;
}

export const env = validateEnv();
