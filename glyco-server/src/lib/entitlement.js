/* Paid-tier entitlement check. The source of truth is RevenueCat; we mirror it into a
 * Redis cache so the hot path (/api/analyze) never makes a synchronous third-party call.
 * The cache is kept fresh by RevenueCat webhooks (see routes/webhook.js) and can be
 * force-refreshed on demand via /api/entitlement/sync (right after a purchase/restore). */
const redis = require("./redis");

// Matches the entitlement identifier actually created in the RevenueCat dashboard
// (RevenueCat auto-derived it from the project name rather than "unlimited").
const ENTITLEMENT_ID = process.env.REVENUECAT_ENTITLEMENT_ID || "Glyco_Navigator Pro";
// Overridable only for tests (points the subscriber lookup at a local stub).
const REVENUECAT_API_BASE = process.env.REVENUECAT_API_BASE || "https://api.revenuecat.com/v1";
// Cache outlives the real expiry by this much so a lost cancellation/expiration webhook
// fails open toward "still entitled" rather than wrongly denying a paying user.
const GRACE_SECONDS = 60 * 60;

function cacheKey(deviceId) {
  return `entitlement:${deviceId}`;
}

/** Cheap read used by the hot path. Returns { active }. */
async function isActive(deviceId) {
  const raw = await redis.get(cacheKey(deviceId));
  if (!raw) return { active: false };
  try {
    const cached = JSON.parse(raw);
    return { active: !!cached.active };
  } catch {
    return { active: false };
  }
}

/** Upserts the cache. `expiresAtMs` is the real subscription-period end; the Redis key's
 * own TTL is set past that so the cache self-clears even if we never see the follow-up
 * cancellation/expiration event. */
async function setCache(deviceId, { active, expiresAtMs }) {
  const now = Date.now();
  const ttlSeconds = active && expiresAtMs
    ? Math.max(60, Math.ceil((expiresAtMs - now) / 1000) + GRACE_SECONDS)
    : GRACE_SECONDS;
  await redis.set(cacheKey(deviceId), JSON.stringify({ active, expiresAtMs: expiresAtMs || null }), ttlSeconds);
}

/** On-demand refresh straight from RevenueCat — used by /api/entitlement/sync, not by
 * the per-analysis hot path. */
async function syncFromRevenueCat(deviceId) {
  const resp = await fetch(`${REVENUECAT_API_BASE}/subscribers/${encodeURIComponent(deviceId)}`, {
    headers: { Authorization: `Bearer ${process.env.REVENUECAT_SECRET_API_KEY}` }
  });
  if (!resp.ok) {
    // Unknown subscriber (never purchased) is a normal, non-error case for RevenueCat.
    if (resp.status === 404) {
      await setCache(deviceId, { active: false });
      return { active: false };
    }
    throw new Error(`revenuecat subscriber lookup failed: ${resp.status}`);
  }
  const body = await resp.json();
  const entitlement = body.subscriber?.entitlements?.[ENTITLEMENT_ID];
  const expiresAtMs = entitlement?.expires_date ? Date.parse(entitlement.expires_date) : null;
  const active = !!entitlement && (!expiresAtMs || expiresAtMs > Date.now());
  await setCache(deviceId, { active, expiresAtMs });
  return { active };
}

module.exports = { isActive, setCache, syncFromRevenueCat, ENTITLEMENT_ID };
