const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../server");

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  baseUrl = "http://127.0.0.1:" + server.address().port;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
});

test("health endpoint returns Railway-ready JSON", async () => {
  const response = await fetch(baseUrl + "/api/health", {
    headers: { Origin: "https://idkeman.github.io" }
  });

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /application\/json/i);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://idkeman.github.io");

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.service, "BlooketJS Railway API");
  assert.equal(body.version, "0.2.0");
});

test("integration status is explicit that Blooket access is not authorized", async () => {
  const response = await fetch(baseUrl + "/api/integration/status");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.provider, "blooket");
  assert.equal(body.authorized, false);
  assert.equal(body.connected, false);
  assert.deepEqual(body.capabilities, []);
});

test("legacy game and set operations are disabled", async () => {
  for (const path of ["/api/game/join", "/api/game/host", "/api/sets"]) {
    const response = await fetch(baseUrl + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ example: true })
    });
    assert.equal(response.status, 501, path);
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.match(body.error, /disabled/i);
  }
});

test("CORS preflight allows the GitHub Pages dashboard", async () => {
  const response = await fetch(baseUrl + "/api/integration/status", {
    method: "OPTIONS",
    headers: {
      Origin: "https://idkeman.github.io",
      "Access-Control-Request-Method": "GET"
    }
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://idkeman.github.io");
  assert.match(response.headers.get("access-control-allow-methods") || "", /GET/i);
});

test("CORS rejects an unrelated website origin", async () => {
  const response = await fetch(baseUrl + "/api/health", {
    headers: { Origin: "https://example.invalid" }
  });
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.match(body.error, /origin is not allowed/i);
});

test("unknown API routes return JSON 404", async () => {
  const response = await fetch(baseUrl + "/api/not-a-real-route");
  assert.equal(response.status, 404);
  assert.match(response.headers.get("content-type") || "", /application\/json/i);
  const body = await response.json();
  assert.equal(body.error, "API route not found.");
});
