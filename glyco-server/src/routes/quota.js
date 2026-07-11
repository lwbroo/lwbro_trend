const express = require("express");
const quota = require("../lib/quota");
const entitlement = require("../lib/entitlement");

const router = express.Router();

router.get("/quota", async (req, res) => {
  const deviceId = req.query.deviceId;
  if (!deviceId) return res.status(400).json({ error: "missing deviceId" });

  const { active } = await entitlement.isActive(deviceId);
  if (active) {
    return res.json({ unlimited: true, limit: null, remaining: null, resetAt: null });
  }
  const current = await quota.status(deviceId);
  res.json({ unlimited: false, ...current });
});

module.exports = router;
