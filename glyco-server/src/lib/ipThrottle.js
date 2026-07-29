/* Abuse backstop for the free tier.
 *
 * The weekly quota is keyed by a client-generated deviceId held in localStorage, so a
 * user who clears site data (or reinstalls) gets a fresh id and a fresh free analyses.
 * That's acceptable for honest users but trivially scriptable, and every analysis costs
 * a real Anthropic call — so this adds a coarse per-IP daily ceiling as a second line of
 * defense. It is deliberately generous: the free tier is 3/week per device, so a shared
 * NAT (household, small office, cafe) of several genuine users stays far below the cap,
 * while bulk deviceId cycling from one address hits it quickly.
 *
 * Entitled (paying) subscribers are never throttled here — see routes/analyze.js.
 * This is not a substitute for real device attestation (App Attest / Play Integrity),
 * which is the proper fix and belongs to the native-app phase.
 */
const redis = require("./redis");

const DAILY_IP_LIMIT = Number(process.env.IP_DAILY_LIMIT || 15);
const BUCKET_TTL_SECONDS = 2 * 24 * 60 * 60; // 2 days — outlives the day bucket, self-cleaning

function dayKey(now) {
  return now.toISOString().slice(0, 10); // YYYY-MM-DD, UTC
}

function bucketKey(ip, now) {
  return `ipquota:${ip}:${dayKey(now)}`;
}

/** Consumes one unit for this IP. Returns { allowed, count, limit }.
 * Fails OPEN: if Redis is unreachable this must not block paying/honest traffic — the
 * per-device weekly quota is still enforced independently and is the primary control. */
async function consume(ip, now = new Date()) {
  if (!ip) return { allowed: true, count: 0, limit: DAILY_IP_LIMIT };
  try {
    const key = bucketKey(ip, now);
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, BUCKET_TTL_SECONDS);
    return { allowed: count <= DAILY_IP_LIMIT, count, limit: DAILY_IP_LIMIT };
  } catch {
    return { allowed: true, count: 0, limit: DAILY_IP_LIMIT };
  }
}

module.exports = { consume, bucketKey, DAILY_IP_LIMIT };
