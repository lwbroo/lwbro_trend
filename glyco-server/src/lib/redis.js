/* Thin wrapper over the Upstash Redis REST API — plain fetch, no client library.
 * Each exported function issues one REST call: https://upstash.com/docs/redis/features/restapi */
const BASE_URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function command(parts) {
  const resp = await fetch(`${BASE_URL}/${parts.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  if (!resp.ok) throw new Error(`redis ${parts[0]} failed: ${resp.status}`);
  const body = await resp.json();
  return body.result;
}

function incr(key) {
  return command(["INCR", key]);
}

function expire(key, seconds) {
  return command(["EXPIRE", key, String(seconds)]);
}

function get(key) {
  return command(["GET", key]);
}

function set(key, value, exSeconds) {
  return command(exSeconds ? ["SET", key, value, "EX", String(exSeconds)] : ["SET", key, value]);
}

module.exports = { incr, expire, get, set };
