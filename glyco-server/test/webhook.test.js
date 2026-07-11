const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startUpstashStub } = require("./helpers/stubServer");

let redisStub, server, baseUrl, entitlement;

before(async () => {
  redisStub = await startUpstashStub();
  process.env.UPSTASH_REDIS_REST_URL = redisStub.url;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  process.env.REVENUECAT_WEBHOOK_SECRET = "shared-secret-value";
  process.env.REVENUECAT_ENTITLEMENT_ID = "unlimited";
  process.env.ALLOWED_ORIGINS = "http://localhost:8000";

  const { createApp } = require("../src/index");
  entitlement = require("../src/lib/entitlement");
  const app = createApp();
  await new Promise((resolve) => { server = app.listen(0, "127.0.0.1", resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise(r => server.close(r));
  await redisStub.close();
});

function postWebhook(body, authHeader) {
  return fetch(`${baseUrl}/api/revenuecat/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(authHeader !== undefined ? { authorization: authHeader } : {}) },
    body: JSON.stringify(body)
  });
}

test("rejects a webhook with a wrong Authorization header", async () => {
  const resp = await postWebhook({ event: { type: "INITIAL_PURCHASE", app_user_id: "dev-x", entitlement_ids: ["unlimited"] } }, "wrong-secret");
  assert.equal(resp.status, 401);
});

test("rejects a webhook with no Authorization header", async () => {
  const resp = await postWebhook({ event: { type: "INITIAL_PURCHASE", app_user_id: "dev-x", entitlement_ids: ["unlimited"] } });
  assert.equal(resp.status, 401);
});

test("accepts a correctly-signed INITIAL_PURCHASE and activates the entitlement cache", async () => {
  const deviceId = `dev-${Math.random()}`;
  const resp = await postWebhook({
    event: { type: "INITIAL_PURCHASE", app_user_id: deviceId, entitlement_ids: ["unlimited"], expiration_at_ms: Date.now() + 3600_000 }
  }, "shared-secret-value");
  assert.equal(resp.status, 200);
  const { active } = await entitlement.isActive(deviceId);
  assert.equal(active, true);
});

test("accepts a correctly-signed EXPIRATION and deactivates the entitlement cache", async () => {
  const deviceId = `dev-${Math.random()}`;
  await entitlement.setCache(deviceId, { active: true, expiresAtMs: Date.now() + 3600_000 });
  const resp = await postWebhook({
    event: { type: "EXPIRATION", app_user_id: deviceId, entitlement_ids: ["unlimited"] }
  }, "shared-secret-value");
  assert.equal(resp.status, 200);
  const { active } = await entitlement.isActive(deviceId);
  assert.equal(active, false);
});

test("ignores webhook events for a different entitlement id", async () => {
  const deviceId = `dev-${Math.random()}`;
  const resp = await postWebhook({
    event: { type: "INITIAL_PURCHASE", app_user_id: deviceId, entitlement_ids: ["some_other_entitlement"] }
  }, "shared-secret-value");
  assert.equal(resp.status, 200);
  const { active } = await entitlement.isActive(deviceId);
  assert.equal(active, false); // untouched — no cache entry was written for our entitlement
});
