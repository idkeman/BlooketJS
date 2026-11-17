const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../server");

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const address = server.address();
  baseUrl = "http://127.0.0.1:" + address.port;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
});

test("health endpoint returns JSON with ok=true", async () => {
  const response = await fetch(baseUrl + "/api/health", {
    headers: { Origin: "https://idkeman.github.io" }
  });

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /application\/json/i);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://idkeman.github.io");

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.service, "BlooketJS API");
});

test("CORS preflight accepts GitHub Pages and Authorization", async () => {
  const response = await fetch(baseUrl + "/api/game/host", {
    method: "OPTIONS",
    headers: {
      Origin: "https://idkeman.github.io",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type,authorization"
    }
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://idkeman.github.io");
  assert.match(response.headers.get("access-control-allow-headers") || "", /authorization/i);
});

test("unknown API routes return JSON 404", async () => {
  const response = await fetch(baseUrl + "/api/not-a-real-route");
  assert.equal(response.status, 404);
  assert.match(response.headers.get("content-type") || "", /application\/json/i);
  const body = await response.json();
  assert.equal(body.error, "API route not found.");
});
