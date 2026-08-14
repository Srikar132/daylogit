import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;

// A generous sliding window — this exists to stop abuse/bugs from hammering
// the DB and Cloudinary, not to throttle normal usage. 30 writes/minute per
// action type is far above what a real user does by hand for a deliberate
// action (create/delete/rename/upload).
const limiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "60 s"), analytics: true, prefix: "helm-rl" })
  : null;

// Widget position/size/data saves fire on every drag-settle or debounced
// keystroke — legitimately far more frequent than a deliberate create/delete,
// but still worth a real ceiling: leaving them completely unthrottled means
// a scripted/buggy client can hammer the endpoint with no limit at all. The
// client already debounces each individual widget's save by 500ms, so even
// continuously dragging one widget tops out around ~2 req/s; this budget is
// sized for "several widgets being actively dragged/typed into at once,"
// not a single deliberate action.
const dragLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(300, "60 s"), analytics: true, prefix: "helm-rl-drag" })
  : null;

export type RateLimitResult = { success: boolean; error?: string };

async function check(instance: Ratelimit | null, identifier: string): Promise<RateLimitResult> {
  if (!instance) return { success: true };
  const { success } = await instance.limit(identifier);
  return success ? { success: true } : { success: false, error: "Too many requests — slow down and try again shortly." };
}

/** No-op (always allows) when UPSTASH_REDIS_REST_URL/TOKEN aren't set — lets
 *  the app run in dev/without the service configured instead of hard-failing
 *  every mutation. `identifier` should be `${actionType}:${userId}` so a
 *  burst on one action (e.g. uploads) doesn't also lock the user out of an
 *  unrelated one (e.g. deleting a photo). */
export function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  return check(limiter, identifier);
}

/** Same shape as checkRateLimit but with a much larger budget — for
 *  high-frequency, low-cost writes (widget position/resize/data saves). */
export function checkDragRateLimit(identifier: string): Promise<RateLimitResult> {
  return check(dragLimiter, identifier);
}
