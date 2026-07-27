const express = require("express");
const anthropic = require("../lib/anthropicClient");
const quota = require("../lib/quota");
const entitlement = require("../lib/entitlement");
const ipThrottle = require("../lib/ipThrottle");

const router = express.Router();

router.post("/analyze", async (req, res) => {
  const { deviceId, imageBase64, note, lang } = req.body || {};
  if (!deviceId || !imageBase64) {
    return res.status(400).json({ error: "missing deviceId or imageBase64" });
  }

  const { active } = await entitlement.isActive(deviceId);

  if (!active) {
    // Per-IP daily ceiling first — this is the backstop against cycling deviceIds to
    // farm fresh weekly quotas. Paying subscribers skip it entirely.
    const throttle = await ipThrottle.consume(req.ip);
    if (!throttle.allowed) {
      return res.status(429).json({ error: "ip_rate_limited", message: "too many analyses from this network today" });
    }

    const current = await quota.status(deviceId);
    if (current.remaining <= 0) {
      return res.status(402).json({ error: "quota_exceeded", quota: { ...current, unlimited: false } });
    }
  }

  let recognized;
  try {
    recognized = await anthropic.recognize({ imageBase64, note, lang: lang === "zh" ? "zh" : "en" });
  } catch (err) {
    if (err instanceof anthropic.RecognitionError) {
      const statusByKind = { rate_limited: 429, refusal: 422, max_tokens: 422, bad_response: 502, network: 502, upstream: 502 };
      return res.status(statusByKind[err.kind] || 502).json({ error: err.kind, message: err.message });
    }
    return res.status(502).json({ error: "upstream", message: "recognition failed" });
  }

  let responseQuota;
  if (active) {
    responseQuota = { unlimited: true, limit: null, remaining: null, resetAt: null };
  } else {
    const count = await quota.increment(deviceId);
    responseQuota = { unlimited: false, limit: quota.LIMIT, remaining: Math.max(0, quota.LIMIT - count), resetAt: quota.nextMondayUtc(new Date()).toISOString() };
  }

  res.json({ foods: recognized.foods || [], photo_note: recognized.photo_note || "", quota: responseQuota });
});

module.exports = router;
