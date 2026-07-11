const express = require("express");
const entitlement = require("../lib/entitlement");

const router = express.Router();

// Event types that mean "this entitlement period is active" — everything except EXPIRATION.
// CANCELLATION means auto-renew was turned off but the user stays entitled until period end,
// so it's still treated as active here; the cache TTL (tied to expiresAtMs) handles the
// eventual cutoff even if we never see a later EXPIRATION event.
const INACTIVE_EVENT_TYPES = new Set(["EXPIRATION"]);

router.post("/revenuecat/webhook", async (req, res) => {
  const authHeader = req.headers.authorization || "";
  if (authHeader !== process.env.REVENUECAT_WEBHOOK_SECRET) {
    return res.status(401).json({ error: "invalid webhook auth" });
  }

  const event = req.body?.event;
  if (!event || !event.app_user_id) {
    return res.status(400).json({ error: "malformed webhook payload" });
  }

  const entitlementIds = event.entitlement_ids || [];
  const concernsUs = entitlementIds.includes(entitlement.ENTITLEMENT_ID);
  if (concernsUs) {
    const active = !INACTIVE_EVENT_TYPES.has(event.type);
    await entitlement.setCache(event.app_user_id, {
      active,
      expiresAtMs: event.expiration_at_ms || null
    });
  }

  res.json({});
});

module.exports = router;
