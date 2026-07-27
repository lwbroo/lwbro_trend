const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startUpstashStub } = require("./helpers/stubServer");

let stub;
let ipThrottle;

before(async () => {
  stub = await startUpstashStub();
  process.env.UPSTASH_REDIS_REST_URL = stub.url;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  process.env.IP_DAILY_LIMIT = "3"; // small limit keeps the test fast
  ipThrottle = require("../src/lib/ipThrottle");
});

after(() => stub.close());

test("allows requests up to the daily limit, then blocks", async () => {
  const ip = `1.2.3.${Math.floor(Math.random() * 250)}`;
  const now = new Date("2026-07-11T12:00:00Z");
  for (let i = 1; i <= ipThrottle.DAILY_IP_LIMIT; i++) {
    const r = await ipThrottle.consume(ip, now);
    assert.equal(r.allowed, true, `call ${i} should be allowed`);
  }
  const over = await ipThrottle.consume(ip, now);
  assert.equal(over.allowed, false);
  assert.equal(over.count, ipThrottle.DAILY_IP_LIMIT + 1);
});

test("buckets are isolated per day", async () => {
  const ip = `5.6.7.${Math.floor(Math.random() * 250)}`;
  const day1 = new Date("2026-07-11T23:59:00Z");
  const day2 = new Date("2026-07-12T00:01:00Z");
  for (let i = 0; i < ipThrottle.DAILY_IP_LIMIT; i++) await ipThrottle.consume(ip, day1);
  assert.equal((await ipThrottle.consume(ip, day1)).allowed, false); // exhausted on day 1
  assert.equal((await ipThrottle.consume(ip, day2)).allowed, true);  // fresh bucket next day
});

test("buckets are isolated per IP", async () => {
  const now = new Date("2026-07-11T12:00:00Z");
  const ipA = `9.9.9.${Math.floor(Math.random() * 250)}`;
  const ipB = `9.9.8.${Math.floor(Math.random() * 250)}`;
  for (let i = 0; i < ipThrottle.DAILY_IP_LIMIT; i++) await ipThrottle.consume(ipA, now);
  assert.equal((await ipThrottle.consume(ipA, now)).allowed, false);
  assert.equal((await ipThrottle.consume(ipB, now)).allowed, true);
});

test("a missing IP is allowed through rather than blocking the request", async () => {
  const r = await ipThrottle.consume(undefined);
  assert.equal(r.allowed, true);
});

test("fails open when Redis is unreachable", async () => {
  const saved = process.env.UPSTASH_REDIS_REST_URL;
  process.env.UPSTASH_REDIS_REST_URL = "http://127.0.0.1:1"; // nothing listening
  // redis.js reads the env var at require time, so exercise the failure path through a
  // fresh module instance rather than mutating the already-loaded one.
  delete require.cache[require.resolve("../src/lib/redis")];
  delete require.cache[require.resolve("../src/lib/ipThrottle")];
  const isolated = require("../src/lib/ipThrottle");
  const r = await isolated.consume("1.1.1.1");
  assert.equal(r.allowed, true, "Redis being down must not block analyses");
  process.env.UPSTASH_REDIS_REST_URL = saved;
  delete require.cache[require.resolve("../src/lib/redis")];
  delete require.cache[require.resolve("../src/lib/ipThrottle")];
});
