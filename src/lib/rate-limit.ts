// Simple rate limiting utility for API endpoints
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimiters = new Map<string, Map<string, RateLimitEntry>>();

export async function rateLimit(
  userId: string,
  operation: string,
  limit: number,
  windowMs: number = 60000
): Promise<void> {
  const now = Date.now();
  const key = `${operation}:${userId}`;
  
  if (!rateLimiters.has(operation)) {
    rateLimiters.set(operation, new Map());
  }

  const limiter = rateLimiters.get(operation)!;
  const entry = limiter.get(key);

  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance
    for (const [entryKey, entryValue] of limiter.entries()) {
      if (now > entryValue.resetTime) {
        limiter.delete(entryKey);
      }
    }
  }

  if (!entry || now > entry.resetTime) {
    limiter.set(key, { count: 1, resetTime: now + windowMs });
    return;
  }

  if (entry.count >= limit) {
    throw new Error(`Rate limit exceeded for ${operation}. Max ${limit} requests per ${windowMs}ms.`);
  }

  entry.count++;
}

// Simple rate limit check (compatible with existing checkRateLimit from ai.ts)
export function checkRateLimit(userId: string, limit: number = 30, windowMs: number = 60000): boolean {
  const rateLimits = new Map<string, { count: number; resetTime: number }>();
  const now = Date.now();
  const userLimit = rateLimits.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimits.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= limit) {
    return false;
  }
  
  userLimit.count++;
  return true;
}