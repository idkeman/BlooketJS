# BlooketJS Connector

A static browser UI plus a Node.js API service for the unofficial
[phuc3asu/blooket-wrapper](https://github.com/phuc3asu/blooket-wrapper) library.

## Implemented API

- `GET /api/health` — JSON health check.
- `POST /api/game/join` — submits one player join request.
- `POST /api/game/host` — requests a hosted game using an authorization token.
- `POST /api/sets` — requests creation of a question-set shell.

The API is a Node.js Express service. The GitHub Pages site is static and must
point to the public URL of this separate API service.

## Replit setup

This repository includes a `.replit` configuration that runs the Express API
for both the workspace Run command and the published deployment:

- Build command: `npm install`
- Run command: `npm start`
- Server entrypoint: `server.js`

To use this repository on Replit, import **this GitHub repository**
(`idkeman/BlooketJS`) as a Replit App. Do not publish a separate React starter
project: that project does not contain this repository's API routes. After
importing, publish the imported project and set the GitHub Pages site's API URL
to the resulting Replit deployment URL.

The server listens on `0.0.0.0` and uses Replit's assigned `PORT` environment
variable. The `.replit` deployment run command explicitly starts
`npm start`, which runs `node server.js`.

Set `ALLOWED_ORIGINS` in Replit Secrets to a comma-separated list of exact
origins when you need to change the defaults. The default includes
`https://idkeman.github.io`.

## Local development

Requires Node.js 20+.

```sh
npm install
npm start
```

The API listens on port 3000 locally. Open `index.html` using a static web
server, then set the API URL to `http://localhost:3000` in the Connection tab.

Run validation and smoke tests with:

```sh
npm run check
npm test
```

## Compatibility limits

The upstream wrapper is old and unofficial. It uses undocumented Blooket
endpoints. Its join event can fire before the game server confirms entry, and
its host method can return a PIN before the lobby is confirmed. The connector
therefore reports a request as unconfirmed until the player or host is visible
in Blooket itself.

The upstream library does not provide a complete live host controller, player
roster/event feed, full question editor, or reliable session state. Mass
joining/flooding, answer extraction, reward manipulation, and game interference
methods are intentionally not exposed.

## Credentials

- Never enter your Blooket password.
- Host and set creation use an authorization token for that request only.
- The browser does not save account tokens in local storage.
- The backend operator can technically observe incoming requests. Only send
  tokens to a backend deployment you control.
- Never commit tokens, passwords, or `.env` files.

## Attribution

The `blooket` dependency comes from
[phuc3asu/blooket-wrapper](https://github.com/phuc3asu/blooket-wrapper), an
unofficial community project distributed under its MIT License. This connector
is independent and is not affiliated with or endorsed by Blooket.
