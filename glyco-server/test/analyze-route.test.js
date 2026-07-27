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
  // High enough that the quota-focused tests below never trip the IP throttle; the
  // throttle's own gating is covered by the dedicated test at the bottom of this file.
  process.env.IP_DAILY_LIMIT = "1000";

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

function analyze(body, forwardedFor) {
  return fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {})
    },
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

test("the per-IP daily throttle blocks deviceId cycling from one address", async () => {
  // Simulates the abuse this guards against: clearing localStorage to get a fresh
  // deviceId (and a fresh weekly quota) over and over from the same network.
  const ip = "203.0.113.77";
  const limit = 4;
  const restore = process.env.IP_DAILY_LIMIT;
  process.env.IP_DAILY_LIMIT = String(limit);
  delete require.cache[require.resolve("../src/lib/ipThrottle")];
  delete require.cache[require.resolve("../src/routes/analyze")];
  delete require.cache[require.resolve("../src/index")];
  const { createApp } = require("../src/index");
  const tmp = require("node:http").createServer(createApp());
  await new Promise(r => tmp.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${tmp.address().port}/api/analyze`;

  const call = () => fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    // A brand-new deviceId each time — per-device quota can never be the limiting factor.
    body: JSON.stringify({ deviceId: `cycled-${Math.random()}`, imageBase64: "Zm9v", lang: "en" })
  });

  for (let i = 0; i < limit; i++) {
    assert.equal((await call()).status, 200, `call ${i + 1} should still be allowed`);
  }
  const blocked = await call();
  assert.equal(blocked.status, 429);
  assert.equal((await blocked.json()).error, "ip_rate_limited");

  await new Promise(r => tmp.close(r));
  process.env.IP_DAILY_LIMIT = restore;
  delete require.cache[require.resolve("../src/lib/ipThrottle")];
  delete require.cache[require.resolve("../src/routes/analyze")];
  delete require.cache[require.resolve("../src/index")];
});

test("GET /api/quota reports remaining without consuming it", async () => {
  const deviceId = `dev-${Math.random()}`;
  const before = await (await fetch(`${baseUrl}/api/quota?deviceId=${deviceId}`)).json();
  assert.equal(before.remaining, quota.LIMIT);
  await analyze({ deviceId, imageBase64: "Zm9v", lang: "en" });
  const after = await (await fetch(`${baseUrl}/api/quota?deviceId=${deviceId}`)).json();
  assert.equal(after.remaining, quota.LIMIT - 1);
});
