# BlooketJS Connector

A browser UI plus a Node.js API service that adapts the community [phuc3asu/blooket-wrapper](https://github.com/phuc3asu/blooket-wrapper) library.

## What is implemented

- **Player join request:** submits one player name and selected Blook to a live game.
- **Host creation request:** calls the upstream wrapper's game-creation method using a Blooket authorization token supplied for that request.
- **Question set creation:** creates a set shell through the wrapper.
- **Backend health check:** verifies that the separate Node service is reachable.

## Important compatibility limits

The upstream wrapper is an old, unofficial library using undocumented Blooket endpoints. Its join event is emitted before the WebSocket server confirms the join, and its host method returns a PIN before the host WebSocket setup is confirmed. The UI therefore labels these as requests, not confirmed live sessions. Current Blooket compatibility must be tested against a real account and game.

The upstream library does not implement a full live host controller, player roster/event feed, question editor, or reliable session state. This repository does not pretend those features exist.

Mass joining/flooding, answer extraction, reward manipulation, and game interference methods are intentionally not exposed.

## Run locally

Requires Node.js 20+.

```sh
npm install
npm start
```

The API listens on port 3000. Open `index.html` with a local static server (for example, VS Code Live Server) and set the API URL to `http://localhost:3000` in **Connection**.

## Deploy the backend

This repository includes `render.yaml` for Render Blueprint deployment:

1. Push this repository to GitHub.
2. In Render, create a new Blueprint and select this repository.
3. Deploy the `blooketjs-api` service.
4. Copy its public service URL.
5. Open the GitHub Pages site, go to **Connection**, paste the URL, and test it.

The API allows the GitHub Pages origin by default. If your Pages URL changes, update `ALLOWED_ORIGINS` in Render to include the exact origin.

## Credentials

- Never enter your Blooket password into this project.
- Host and set creation accept an authorization token only for the current request.
- The browser does not store account tokens in local storage.
- Use only a backend deployment you control. The backend operator can technically observe incoming requests; do not send tokens to a third-party service.
- Do not commit tokens, passwords, or `.env` files.

## Upstream attribution

The `blooket` dependency is sourced from [phuc3asu/blooket-wrapper](https://github.com/phuc3asu/blooket-wrapper), distributed under the MIT License (Copyright 2021 glizzz_y). The original license is available in that repository. This connector is independent and is not endorsed by Blooket.