const express = require("express");
const cors = require("cors");

const analyzeRoute = require("./routes/analyze");
const quotaRoute = require("./routes/quota");
const entitlementRoute = require("./routes/entitlement");
const webhookRoute = require("./routes/webhook");

function createApp() {
  const app = express();
  app.use(express.json({ limit: "12mb" })); // headroom over the client's 1344px/0.85 JPEG uploads

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  app.use(cors({
    origin(origin, callback) {
      // Same-origin/non-browser requests (curl, health checks) send no Origin header.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("origin not allowed"));
    }
  }));

  app.get("/healthz", (req, res) => res.send("ok"));
  app.use("/api", analyzeRoute);
  app.use("/api", quotaRoute);
  app.use("/api", entitlementRoute);
  app.use("/api", webhookRoute);

  return app;
}

if (require.main === module) {
  const port = process.env.PORT || 8080;
  createApp().listen(port, () => console.log(`glyco-server listening on :${port}`));
}

module.exports = { createApp };
