import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  HUB_API_URL: z.string().url().default("https://api.example.com"),
  HUB_INTERNAL_API_KEY: z.string().default("placeholder-hub-internal-key"),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("[CONFIG_ERROR] Invalid environment variables:", result.error.format());
    throw new Error("Invalid environment configuration. Check your .env file.");
  }
  return result.data;
}

const parsedEnv = validateEnv();

export const config = {
  app: {
    env: parsedEnv.NODE_ENV,
    url: parsedEnv.NEXT_PUBLIC_APP_URL,
    isProduction: parsedEnv.NODE_ENV === "production",
    isDevelopment: parsedEnv.NODE_ENV === "development",
  },
  database: {
    url: parsedEnv.DATABASE_URL,
  },
  hub: {
    apiUrl: parsedEnv.HUB_API_URL,
    apiKey: parsedEnv.HUB_INTERNAL_API_KEY,
  },
} as const;

export type AppConfig = typeof config;
