const express = require("express");
const Blooket = require("blooket");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";
const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
  "https://idkeman.github.io,http://localhost:5500,http://127.0.0.1:5500")
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);

app.disable("x-powered-by");

// CORS is deliberately explicit: the GitHub Pages frontend needs JSON requests
// and Authorization headers for host/set creation.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const originAllowed = !origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin);

  if (origin && originAllowed) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigins.includes("*") ? "*" : origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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

app.use(express.json({ limit: "12kb" }));

// Small in-memory limiter: prevents accidental rapid retries on this service.
const windows = new Map();
app.use("/api", (req, res, next) => {
  const key = req.ip || "unknown";
  const now = Date.now();
  const current = windows.get(key) || { start: now, count: 0 };

  if (now - current.start > 60_000) {
    current.start = now;
    current.count = 0;
  }

  current.count += 1;
  windows.set(key, current);

  if (current.count > 24) {
    return res.status(429).json({ error: "Rate limit reached. Wait one minute and try again." });
  }

  next();
});

const text = (value, max, label) => {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new Error(label + " is required and must be at most " + max + " characters.");
  }
  return value.trim();
};

const authToken = req => {
  const token = req.get("authorization");
  if (!token || token.length > 5000) {
    throw new Error("Provide your Blooket authorization token in the Authorization header.");
  }
  return token;
};

const run = async (res, fn) => {
  try {
    return res.json(await fn());
  } catch (error) {
    const message = error && error.response && error.response.data
      ? "Blooket rejected the request: " + JSON.stringify(error.response.data).slice(0, 500)
      : (error.message || "Unexpected connector error");

    return res.status(400).json({ error: message });
  }
};

app.get("/", (_req, res) => {
  res.json({ service: "BlooketJS API", health: "/api/health" });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "BlooketJS API",
    version: "0.1.1"
  });
});

app.post("/api/game/join", (req, res) => run(res, async () => {
  const pin = text(String(req.body.pin || ""), 8, "Game PIN");
  if (!/^\d{4,8}$/.test(pin)) {
    throw new Error("Game PIN must contain 4–8 digits.");
  }

  const name = text(req.body.name, 16, "Player name");
  const blook = text(req.body.blook || "Dog", 30, "Blook");
  const client = new Blooket();
  let eventData;

  client.once("Joined", data => {
    eventData = data;
  });

  await client.joinGame(pin, name, blook);

  if (!eventData) {
    throw new Error("The wrapper did not return a join event.");
  }

  return {
    ok: true,
    pin,
    name: eventData.name,
    blook: eventData.blook,
    gameMode: eventData.gameMode,
    gameSet: eventData.gameSet,
    confirmed: false
  };
}));

app.post("/api/game/host", (req, res) => run(res, async () => {
  const token = authToken(req);
  const hostName = text(req.body.hostName, 32, "Host name");
  const setId = text(req.body.setId, 80, "Question set ID");
  const gameMode = text(req.body.gameMode, 40, "Game mode");
  const modeSetting = req.body.modeSetting === "Amount" ? "Amount" : "Time";
  const isPlus = req.body.isPlus === true;
  const client = new Blooket();
  let created;

  client.once("gameCreated", data => {
    created = data;
  });

  await client.createGame(hostName, isPlus, setId, modeSetting, gameMode, token);

  if (!created || !created.gamePin) {
    throw new Error("Blooket did not return a game PIN.");
  }

  return {
    ok: true,
    gamePin: String(created.gamePin),
    confirmed: false,
    note: "The wrapper returned a PIN; verify the lobby in Blooket."
  };
}));

app.post("/api/sets", (req, res) => run(res, async () => {
  const token = authToken(req);
  const author = text(req.body.author, 40, "Author");
  const title = text(req.body.title, 80, "Set title");
  const description = typeof req.body.description === "string"
    ? req.body.description.slice(0, 180)
    : "";
  const isPrivate = req.body.isPrivate === true;
  const client = new Blooket();
  const result = await client.createSet(author, description, isPrivate, title, token);

  return { ok: true, result };
}));

// Unknown API routes always return JSON so the browser can show a useful error.
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found." });
});

// Convert malformed JSON and unexpected Express errors to readable JSON.
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
    console.log("BlooketJS API listening on " + HOST + ":" + PORT);
  });
}

module.exports = app;
