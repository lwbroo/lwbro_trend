const express = require("express");
const entitlement = require("../lib/entitlement");

const router = express.Router();

/* On-demand refresh straight from RevenueCat. Called by the client right after a
 * purchase or a "Restore purchases" tap, so a cold/stale cache doesn't make a paying
 * user wait for the next webhook delivery. Not called on the per-analysis hot path. */
router.post("/entitlement/sync", async (req, res) => {
  const { deviceId } = req.body || {};
  if (!deviceId) return res.status(400).json({ error: "missing deviceId" });

  try {
    const { active } = await entitlement.syncFromRevenueCat(deviceId);
    res.json({ unlimited: active });
  } catch {
    res.status(502).json({ error: "revenuecat_sync_failed" });
  }
});

module.exports = router;
