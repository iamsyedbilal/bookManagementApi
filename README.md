# Book Management API

A Node.js and Express REST API for managing a book catalogue. It uses MongoDB with Mongoose, Zod request validation, JWT authentication, and cursor-based pagination.

## Requirements

- Node.js 20 or newer
- npm
- MongoDB locally or a MongoDB Atlas connection string

## Setup

1. Install dependencies:

    ```sh
    npm install
    ```

2. Copy `.env.example` to `.env` and replace the example values. Generate two different token secrets (at least 32 characters each), for example:

    ```sh
    node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
    ```

    Run the command separately for `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`. Do not commit `.env` or use the example admin credentials outside a disposable local environment.

3. Ensure MongoDB is available at the configured URI. `DB_NAME` selects the database.

### Environment variables

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port (1–65535). |
| `MONGO_CONNECTION_STRING` | MongoDB or MongoDB Atlas URI. |
| `DB_NAME` | Database name used by the API. |
| `NODE_ENV` | `development`, `test`, or `production`. |
| `ACCESS_TOKEN_SECRET` | Unique secret for signing access tokens (minimum 32 characters). |
| `REFRESH_TOKEN_SECRET` | Different unique secret for signing refresh tokens (minimum 32 characters). |
| `CORS_ORIGINS` | Optional comma-separated allowlist of exact browser origins. |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Optional as a group; required to run the administrator seed script. |

## Run

Start the API:

```sh
npm start
```

For development with automatic restarts:

```sh
npm run dev
```

The server validates configuration before connecting to MongoDB and exits with the invalid variable names if configuration is incomplete. Swagger UI is available at `http://localhost:<PORT>/api-docs`; the OpenAPI JSON is at `/api-docs/json`.

## Administrator provisioning

Public registration creates regular users only. The request schema rejects a `role` field. To create the initial administrator, configure `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `.env`, then run:

```sh
node scripts/seedAdmin.js
```

This script creates the configured administrator if the email does not already exist. Protect these values as secrets and do not expose the seed script as a public endpoint.

## Authentication

- Register with `POST /api/auth/register` using `name`, `email`, and `password`.
- Log in with `POST /api/auth/login`. The response contains a short-lived access token; the refresh token is stored in an HttpOnly cookie.
- Send the access token as `Authorization: Bearer <accessToken>` to protected endpoints.
- Send the `refreshToken` cookie to `POST /api/auth/refresh` to rotate the session.
- Send the access token and current refresh cookie to `POST /api/auth/logout`.

Refresh tokens are stored as hashes. Reuse of a rotated token revokes active tokens belonging to that login's token family. Other login sessions for the same account remain valid. A separate login creates a separate family.

Example login request:

```sh
curl -i http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"reader@example.com\",\"password\":\"replace-this-password\"}"
```

The JSON response contains `success`, `accessToken`, and a safe `user` object. The `Set-Cookie` response header carries the refresh token; it is HttpOnly and is not included in the JSON body.

Example login JSON response:

```json
{
  "success": true,
  "accessToken": "<access-token>",
  "user": {
    "_id": "<user-id>",
    "name": "Jane Reader",
    "email": "reader@example.com",
    "role": "user",
    "createdAt": "<ISO-8601 timestamp>",
    "updatedAt": "<ISO-8601 timestamp>"
  }
}
```

## Book listing

`GET /api/books` requires authentication. It supports `search`, `genre`, `author`, `availability`, `sortBy`, `sortOrder`, `limit`, and `cursor`. The default page size is 10 and the maximum is 100. Use the `pagination.nextCursor` from a response as the next request's `cursor`:

```sh
curl "http://localhost:3000/api/books?limit=10&cursor=<nextCursor>" \
  -H "Authorization: Bearer <accessToken>"
```

Pagination is cursor-based; page numbers and offsets are not part of the API contract. See Swagger for the full request/response schemas and supported sort fields.

The listing response includes `success`, a `data` array, and `pagination` metadata (`limit`, `hasNextPage`, and `nextCursor`). `nextCursor` is `null` when the final page is reached.

Example response:

```json
{
  "success": true,
  "data": [{ "_id": "<book-id>", "title": "The Great Gatsby", "author": "F. Scott Fitzgerald" }],
  "pagination": {
    "limit": 10,
    "hasNextPage": true,
    "nextCursor": "<opaque-cursor>"
  }
}
```

## CORS and deployment configuration

`CORS_ORIGINS` is a comma-separated allowlist of exact HTTP(S) origins (scheme, hostname, and optional port; no paths). Credentialed cross-origin requests are allowed only for listed origins. Leaving the list empty disables cross-origin browser access. CORS is not an authorization mechanism; protected routes still require authentication.

Production deployments must use unique secret values, set `NODE_ENV=production`, use HTTPS, set trusted frontend origins, and restrict database access. The refresh cookie is `HttpOnly`, `SameSite=Lax`, scoped to `/api/auth`, and marked `Secure` in production.

Mongoose automatically builds schema indexes only in development. Review and apply index changes through a controlled production database migration; do not rely on startup auto-indexing in production.

## Tests

Run tests in watch mode:

```sh
npm test
```

Run the one-shot test suite:

```sh
npm run test:run
```

Integration tests use `mongodb-memory-server` and do not use the configured application database.
