# SwipeBite

SwipeBite is a cross‑platform (iOS + Android) group restaurant swiping app. Users create a session, everyone swipes YES/NO on nearby restaurants, and the app surfaces unanimous matches and partial matches.

This repo contains:

- `mobile/` — Expo React Native app (TypeScript)
- `server/` — NestJS API + WebSocket server (TypeScript)
- `docker/` — local Postgres

## Quick start (local)

### 1) Start Postgres

```bash
cd docker
docker compose up -d
```

### 2) Server

```bash
cd server
cp .env.example .env
npm install
npm run prisma:migrate
npm run dev
```

### 3) Mobile

```bash
cd mobile
cp .env.example .env
npm install
npx expo start
```

## Mobile dev notes

- iOS simulator: run `i` from the Expo terminal.
- Android emulator: run `a` from the Expo terminal.
- Physical device: install Expo Go, then scan the QR code.

### Point the phone to your local API

Set `EXPO_PUBLIC_API_BASE_URL` to your machine’s LAN IP (not `localhost`) in `mobile/.env`:

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.25:3000/api
```

## Places API (backend only)

This app uses Google Places API by default. The mobile app never calls third‑party Places APIs directly.

1. Create a Google Cloud project.
2. Enable Places API.
3. Create an API key.
4. Put it in `server/.env` as `PLACES_API_KEY`.

## Privacy & security

- User location is **never stored** in the database; it is only used per request to fetch nearby places.
- Logs are scrubbed of location fields (`lat`, `lng`) via Pino redaction.
- Tokens are stored in secure storage on device (Expo SecureStore).
- All endpoints enforce session membership authorization.

## Testing

```bash
cd server
npm test
```

## Repo structure

```
/README.md
/docker/compose.yml
/server
  /prisma
  /src
  /test
/mobile
  /screens
  /components
  /services
  /store
```

## Notes

- Magic‑link auth is implemented for MVP. In development, the `/auth/start` endpoint returns a `verificationToken` to simplify local testing.
- Travel time is estimated via Haversine distance and average speeds. Google Distance Matrix is optional for later.

## Security reminders for production

- Require HTTPS in production.
- Rotate JWT secrets.
- Use a transactional email provider for magic links.
- Restrict Places API key to server IP and Places API only.

---

# Local commands

Server

```bash
npm run dev
npm run prisma:studio
npm run prisma:migrate
```

Mobile

```bash
npx expo start
```
