/* Weekly free-tier quota: an atomic Redis counter keyed by ISO week (UTC, Monday-start),
 * expiring itself ~12 days after first use so there's nothing to garbage-collect. */
const redis = require("./redis");

const LIMIT = 5;
const BUCKET_TTL_SECONDS = 12 * 24 * 60 * 60; // 12 days — covers the week + clock-skew buffer

/** ISO week string like "2026-W28" for the UTC date `now` falls in (Monday-start weeks). */
function isoWeek(now) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1 .. Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // move to the Thursday of this ISO week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Next Monday 00:00 UTC strictly after `now`. */
function nextMondayUtc(now) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1 .. Sun=7
  d.setUTCDate(d.getUTCDate() + (8 - dayNum)); // next Monday (always in the future)
  return d;
}

function bucketKey(deviceId, now) {
  return `quota:${deviceId}:${isoWeek(now)}`;
}

/** Increments this week's counter for deviceId and returns the new count. Sets the
 * bucket's TTL on first use only (INCR result === 1) so it self-expires unattended. */
async function increment(deviceId, now = new Date()) {
  const key = bucketKey(deviceId, now);
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, BUCKET_TTL_SECONDS);
  return count;
}

/** Read-only status: how many analyses are left this week, without consuming one. */
async function status(deviceId, now = new Date()) {
  const raw = await redis.get(bucketKey(deviceId, now));
  const count = raw ? Number(raw) : 0;
  return {
    limit: LIMIT,
    remaining: Math.max(0, LIMIT - count),
    resetAt: nextMondayUtc(now).toISOString()
  };
}

module.exports = { LIMIT, isoWeek, nextMondayUtc, bucketKey, increment, status };
