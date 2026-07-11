const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startUpstashStub, startRevenueCatStub } = require("./helpers/stubServer");

let redisStub, rcStub;
let entitlement;

before(async () => {
  redisStub = await startUpstashStub();
  process.env.UPSTASH_REDIS_REST_URL = redisStub.url;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  process.env.REVENUECAT_ENTITLEMENT_ID = "unlimited";
  process.env.REVENUECAT_SECRET_API_KEY = "test-secret";
  rcStub = await startRevenueCatStub({
    entitlements: { unlimited: { expires_date: new Date(Date.now() + 3600_000).toISOString() } }
  });
  process.env.REVENUECAT_API_BASE = rcStub.url;
  entitlement = require("../src/lib/entitlement");
});

after(async () => {
  await redisStub.close();
  await rcStub.close();
});

test("isActive is false for a deviceId with no cache entry", async () => {
  const { active } = await entitlement.isActive(`dev-${Math.random()}`);
  assert.equal(active, false);
});

test("setCache then isActive reflects an active entitlement", async () => {
  const deviceId = `dev-${Math.random()}`;
  await entitlement.setCache(deviceId, { active: true, expiresAtMs: Date.now() + 3600_000 });
  const { active } = await entitlement.isActive(deviceId);
  assert.equal(active, true);
});

test("setCache then isActive reflects an inactive entitlement", async () => {
  const deviceId = `dev-${Math.random()}`;
  await entitlement.setCache(deviceId, { active: false });
  const { active } = await entitlement.isActive(deviceId);
  assert.equal(active, false);
});

test("syncFromRevenueCat picks up an active subscriber and caches it", async () => {
  const deviceId = `dev-${Math.random()}`;
  const result = await entitlement.syncFromRevenueCat(deviceId);
  assert.equal(result.active, true);
  const cached = await entitlement.isActive(deviceId);
  assert.equal(cached.active, true);
});
