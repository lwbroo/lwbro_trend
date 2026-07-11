const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startUpstashStub } = require("./helpers/stubServer");

let stub;
let quota;

before(async () => {
  stub = await startUpstashStub();
  process.env.UPSTASH_REDIS_REST_URL = stub.url;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  quota = require("../src/lib/quota");
});

after(() => stub.close());

test("isoWeek assigns Monday and the following Sunday to the same ISO week", () => {
  const monday = new Date("2026-07-06T00:00:00Z"); // a Monday
  const sunday = new Date("2026-07-12T23:59:59Z"); // the following Sunday
  assert.equal(quota.isoWeek(monday), quota.isoWeek(sunday));
});

test("isoWeek rolls over across a week boundary", () => {
  const sunday = new Date("2026-07-12T23:59:59Z");
  const nextMonday = new Date("2026-07-13T00:00:01Z");
  assert.notEqual(quota.isoWeek(sunday), quota.isoWeek(nextMonday));
});

test("nextMondayUtc is always strictly in the future and lands on a Monday", () => {
  const now = new Date("2026-07-09T15:30:00Z"); // a Thursday
  const next = quota.nextMondayUtc(now);
  assert.ok(next > now);
  assert.equal(next.getUTCDay(), 1);
});

test("increment decrements remaining across repeated calls and caps at the limit", async () => {
  const deviceId = `dev-${Math.random()}`;
  const now = new Date("2026-07-09T12:00:00Z");
  for (let i = 1; i <= quota.LIMIT; i++) {
    const count = await quota.increment(deviceId, now);
    assert.equal(count, i);
    const s = await quota.status(deviceId, now);
    assert.equal(s.remaining, quota.LIMIT - i);
  }
  // One more increment goes over the limit — status.remaining floors at 0, never negative.
  await quota.increment(deviceId, now);
  const s = await quota.status(deviceId, now);
  assert.equal(s.remaining, 0);
});

test("status for a fresh deviceId reports the full limit", async () => {
  const s = await quota.status(`dev-${Math.random()}`, new Date("2026-07-09T12:00:00Z"));
  assert.equal(s.remaining, quota.LIMIT);
  assert.equal(s.limit, quota.LIMIT);
});

test("quota buckets are isolated per ISO week", async () => {
  const deviceId = `dev-${Math.random()}`;
  const week1 = new Date("2026-07-09T12:00:00Z");
  const week2 = new Date("2026-07-16T12:00:00Z");
  await quota.increment(deviceId, week1);
  await quota.increment(deviceId, week1);
  const week1Status = await quota.status(deviceId, week1);
  const week2Status = await quota.status(deviceId, week2);
  assert.equal(week1Status.remaining, quota.LIMIT - 2);
  assert.equal(week2Status.remaining, quota.LIMIT); // fresh bucket, unaffected by week1's usage
});
