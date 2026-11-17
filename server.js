const express = require("express");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";

const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
  "https://idkeman.github.io,http://localhost:5500,http://127.0.0.1:5500")
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);

app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");

  const origin = req.headers.origin;
  const originAllowed = !origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin);

  if (origin && originAllowed) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigins.includes("*") ? "*" : origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  }

  if (req.method === "OPTIONS") {
    if (origin && !originAllowed) {
      return res.status(403).json({ error: "Origin is not allowed by this API." });
    }
    return res.sendStatus(204);
  }

  if (origin && !originAllowed) {
    return res.status(403).json({ error: "Origin is not allowed by this API." });
  }

  next();
});

app.use(express.json({ limit: "8kb" }));

app.get("/", (_req, res) => {
  res.json({
    service: "BlooketJS Railway API",
    health: "/api/health",
    integrationStatus: "/api/integration/status"
  });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "BlooketJS Railway API",
    version: "0.2.0",
    platform: process.env.RAILWAY_ENVIRONMENT_NAME ? "railway" : "self-hosted"
  });
});

app.get("/api/integration/status", (_req, res) => {
  res.status(200).json({
    provider: "blooket",
    authorized: false,
    connected: false,
    capabilities: [],
    message: "No Blooket-authorized developer integration is configured. Live-game endpoints remain disabled."
  });
});

function disabledIntegration(_req, res) {
  return res.status(501).json({
    ok: false,
    error: "This operation is disabled. The connector does not use undocumented Blooket endpoints or automate gameplay. An integration must be explicitly authorized by Blooket before live-game operations can be implemented."
  });
}

// Preserve clear responses for old frontend clients without forwarding requests to Blooket.
app.post("/api/game/join", disabledIntegration);
app.post("/api/game/host", disabledIntegration);
app.post("/api/sets", disabledIntegration);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found." });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

app.use((error, _req, res, _next) => {
  const status = Number(error.status) >= 400 && Number(error.status) < 600
    ? Number(error.status)
    : 500;

  res.status(status).json({
    error: status === 400 ? "Request body contains invalid JSON." : "Unexpected API server error."
  });
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log("BlooketJS Railway API listening on " + HOST + ":" + PORT);
  });
}

module.exports = app;
