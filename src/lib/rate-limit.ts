import { headers } from "next/headers";
import { getEnv } from "@/lib/cloudflare";

export async function getClientIP(): Promise<string> {
  const h = await headers();
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  );
}

export interface RateLimitResult {
  ok: boolean;
  retryAfter: number;
}

export async function checkRateLimit(
  action: string,
  max: number,
  windowSeconds: number,
  env?: Env,
): Promise<RateLimitResult> {
  const e = env ?? (await getEnv());
  const ip = await getClientIP();
  const key = `ratelimit:${action}:${ip}`;

  const stored = await e.CACHE.get(key);
  const count = stored ? parseInt(stored, 10) : 0;
  if (Number.isNaN(count)) {
    // Key is corrupt; reset the window.
    await e.CACHE.put(key, "1", { expirationTtl: windowSeconds });
    return { ok: true, retryAfter: 0 };
  }

  if (count >= max) {
    return { ok: false, retryAfter: windowSeconds };
  }

  await e.CACHE.put(key, String(count + 1), { expirationTtl: windowSeconds });
  return { ok: true, retryAfter: 0 };
}
