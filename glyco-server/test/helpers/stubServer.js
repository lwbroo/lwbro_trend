/* Minimal HTTP stub servers used only by tests — no mocking library, just node:http.
 * Each returns { url, close() }. */
const http = require("node:http");

function listen(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ url: `http://127.0.0.1:${port}`, close: () => new Promise(r => server.close(r)) });
    });
  });
}

/** In-memory stand-in for the Upstash Redis REST API: GET /{CMD}/{arg}/{arg}... */
function startUpstashStub() {
  const store = new Map();
  return listen((req, res) => {
    const parts = decodeURIComponent(req.url.slice(1)).split("/");
    const [cmd, key, ...rest] = parts;
    let result = null;
    if (cmd === "INCR") {
      const next = (Number(store.get(key)) || 0) + 1;
      store.set(key, String(next));
      result = next;
    } else if (cmd === "GET") {
      result = store.has(key) ? store.get(key) : null;
    } else if (cmd === "SET") {
      // SET key value [EX seconds] — TTL is not enforced in this stub (tests don't need real expiry)
      store.set(key, rest[0]);
      result = "OK";
    } else if (cmd === "EXPIRE") {
      result = store.has(key) ? 1 : 0;
    }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ result }));
  });
}

/** Stub for api.anthropic.com's /v1/messages — returns a fixed recognition payload. */
function startAnthropicStub({ foods = [{ name: "White rice", grams: 150, portion_desc: "1 bowl", category: "starch", gi_fallback: 70, carbs100_fallback: 28 }], photoNote = "" } = {}) {
  return listen((req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({
      stop_reason: "end_turn",
      content: [{ type: "text", text: JSON.stringify({ foods, photo_note: photoNote }) }]
    }));
  });
}

/** Stub for RevenueCat's GET /subscribers/{id}. `entitlements` maps id -> {expires_date}. */
function startRevenueCatStub({ entitlements = {} } = {}) {
  return listen((req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ subscriber: { entitlements } }));
  });
}

module.exports = { startUpstashStub, startAnthropicStub, startRevenueCatStub };
