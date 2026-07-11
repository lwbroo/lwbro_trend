const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startUpstashStub, startAnthropicStub } = require("./helpers/stubServer");

let redisStub, anthropicStub, server, baseUrl, entitlement, quota;

before(async () => {
  redisStub = await startUpstashStub();
  anthropicStub = await startAnthropicStub();
  process.env.UPSTASH_REDIS_REST_URL = redisStub.url;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  process.env.ANTHROPIC_BASE_URL = anthropicStub.url;
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.ALLOWED_ORIGINS = "http://localhost:8000";

  const { createApp } = require("../src/index");
  entitlement = require("../src/lib/entitlement");
  quota = require("../src/lib/quota");

  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise(r => server.close(r));
  await redisStub.close();
  await anthropicStub.close();
});

function analyze(body) {
  return fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

test("returns foods/photo_note and decrements quota on each call", async () => {
  const deviceId = `dev-${Math.random()}`;
  const resp = await analyze({ deviceId, imageBase64: "Zm9v", note: "", lang: "en" });
  assert.equal(resp.status, 200);
  const body = await resp.json();
  assert.equal(body.foods.length, 1);
  assert.equal(body.foods[0].name, "White rice");
  assert.equal(body.quota.unlimited, false);
  assert.equal(body.quota.remaining, quota.LIMIT - 1);
});

test("402s with quota_exceeded once the weekly limit is used up, without calling Anthropic again", async () => {
  const deviceId = `dev-${Math.random()}`;
  for (let i = 0; i < quota.LIMIT; i++) {
    const resp = await analyze({ deviceId, imageBase64: "Zm9v", lang: "en" });
    assert.equal(resp.status, 200);
  }
  const resp = await analyze({ deviceId, imageBase64: "Zm9v", lang: "en" });
  assert.equal(resp.status, 402);
  const body = await resp.json();
  assert.equal(body.error, "quota_exceeded");
  assert.equal(body.quota.remaining, 0);
});

test("400s when deviceId or imageBase64 is missing", async () => {
  const resp = await analyze({ lang: "en" });
  assert.equal(resp.status, 400);
});

test("an active entitlement bypasses quota entirely", async () => {
  const deviceId = `dev-${Math.random()}`;
  await entitlement.setCache(deviceId, { active: true, expiresAtMs: Date.now() + 3600_000 });

  // Exhaust what would normally be the free quota, plus one more — every call should still succeed.
  for (let i = 0; i < quota.LIMIT + 2; i++) {
    const resp = await analyze({ deviceId, imageBase64: "Zm9v", lang: "en" });
    assert.equal(resp.status, 200);
    const body = await resp.json();
    assert.equal(body.quota.unlimited, true);
  }
});

test("GET /api/quota reports remaining without consuming it", async () => {
  const deviceId = `dev-${Math.random()}`;
  const before = await (await fetch(`${baseUrl}/api/quota?deviceId=${deviceId}`)).json();
  assert.equal(before.remaining, quota.LIMIT);
  await analyze({ deviceId, imageBase64: "Zm9v", lang: "en" });
  const after = await (await fetch(`${baseUrl}/api/quota?deviceId=${deviceId}`)).json();
  assert.equal(after.remaining, quota.LIMIT - 1);
});
