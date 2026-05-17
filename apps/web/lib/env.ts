import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOSTNAME: z.string().default("localhost"),
  SESSION_SECRET: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}

export const env: Env = parseEnv();
