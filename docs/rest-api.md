# sb-statistics REST API

Event tracking service built with NestJS. Clients send tracking events (views, favorites, etc.) that are persisted to PostgreSQL. View events submitted individually are deduplicated per content/session using Redis.

## Base URL

```
http://localhost:3001
```

The server listens on the port defined by the `PORT` environment variable. Default: `3001`.

There is no global route prefix and no API versioning (e.g. no `/v1`).

## Authentication

No authentication is enforced. All endpoints are public.

## Content Type

Request bodies for `POST` endpoints must be JSON with `Content-Type: application/json`.

## Validation

A global validation pipe is applied to all incoming requests:

- **Required fields** must be present and of the correct type.
- **Unknown fields** in the request body are silently stripped (whitelist mode).
- **Invalid payloads** return HTTP `400 Bad Request` with NestJS default validation error messages.

## Endpoints

| Method | Path            | Description                    |
| ------ | --------------- | ------------------------------ |
| `GET`  | `/`             | Health / smoke check           |
| `POST` | `/events`       | Record a single tracking event |
| `POST` | `/events/batch` | Record up to 200 events        |

---

### GET /

Returns a plain-text health check response.

**Response**

- **Status:** `200 OK`
- **Content-Type:** `text/html` (plain text body)
- **Body:** `Hello World!`

**Example**

```bash
curl http://localhost:3001/
```

---

### POST /events

Record a single tracking event.

#### Request body

| Field       | Type     | Required | Description                                      |
| ----------- | -------- | -------- | ------------------------------------------------ |
| `eventType` | `string` | yes      | Event type (e.g. `"view"`, `"favorite"`)         |
| `contentId` | `string` | yes      | Identifier of the tracked content                |
| `sessionId` | `string` | yes      | Client session identifier                        |
| `userId`    | `string` | no       | Authenticated user identifier, if available      |
| `metadata`  | `object` | no       | Arbitrary JSON metadata                          |
| `platform`  | `string` | no       | Client platform (e.g. `"web"`, `"ios"`)          |

#### Response

- **Status:** `200 OK`
- **Content-Type:** `application/json`

| Field      | Type      | Description                                              |
| ---------- | --------- | -------------------------------------------------------- |
| `recorded` | `boolean` | `true` if the event was persisted; `false` if skipped    |

When `recorded` is `false`, the request is still successful (`200 OK`). This happens when a `view` event is deduplicated (see [View deduplication](#view-deduplication)).

#### Example — record a view

```bash
curl -X POST http://localhost:3001/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "view",
    "contentId": "article-123",
    "sessionId": "sess-abc",
    "userId": "user-456",
    "platform": "web",
    "metadata": { "referrer": "homepage" }
  }'
```

**Response:**

```json
{ "recorded": true }
```

#### Example — deduplicated view

Submitting the same `contentId` + `sessionId` view within 15 minutes returns:

```json
{ "recorded": false }
```

#### Example — validation error

Missing required field:

```bash
curl -X POST http://localhost:3001/events \
  -H "Content-Type: application/json" \
  -d '{ "eventType": "view" }'
```

**Response:** `400 Bad Request` with validation error details.

---

### POST /events/batch

Record multiple tracking events in a single request.

#### Request body

| Field    | Type               | Required | Description                    |
| -------- | ------------------ | -------- | ------------------------------ |
| `events` | `CreateEventDto[]` | yes      | Array of 1–200 event objects   |

Each item in `events` follows the same schema as [POST /events](#post-events).

#### Response

- **Status:** `200 OK`
- **Content-Type:** `application/json`

| Field      | Type     | Description                                |
| ---------- | -------- | ------------------------------------------ |
| `recorded` | `number` | Count of events successfully inserted      |

#### Behavior notes

- **No deduplication** is applied in batch mode. All events are inserted directly.
- All events in a batch share the same `createdAt` timestamp.
- The returned `recorded` count may be less than the number of submitted events if the database rejects individual rows.

#### Example

```bash
curl -X POST http://localhost:3001/events/batch \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "eventType": "view",
        "contentId": "article-123",
        "sessionId": "sess-abc"
      },
      {
        "eventType": "favorite",
        "contentId": "article-123",
        "sessionId": "sess-abc",
        "userId": "user-456"
      }
    ]
  }'
```

**Response:**

```json
{ "recorded": 2 }
```

#### Example — batch size validation

Submitting an empty array or more than 200 events returns `400 Bad Request`.

---

## View deduplication

Only **single** `POST /events` requests with `eventType` equal to `"view"` are deduplicated.

| Setting        | Value                                              |
| -------------- | -------------------------------------------------- |
| Scope          | Same `contentId` + `sessionId`                     |
| Window         | 15 minutes                                         |
| Storage        | Redis (`REDIS_URL`, default `redis://localhost:6379`) |
| Duplicate response | `{ "recorded": false }` with HTTP `200 OK`     |

Other event types are always persisted. Batch submissions never trigger deduplication regardless of `eventType`.

The `eventType` field accepts any string at validation time; only the literal value `"view"` triggers deduplication logic.

---

## Error handling

| Condition                         | Status | Notes                                      |
| --------------------------------- | ------ | ------------------------------------------ |
| Invalid or missing request fields | `400`  | NestJS validation pipe error response      |
| Database or runtime failure       | `500`  | NestJS default internal server error       |

There are no custom exception filters or standardized error response schemas.

---

## Data persistence

Events are stored in the `tracking_events` PostgreSQL table (`TrackingEvent` model).

| Request field | DB column     | Type        |
| ------------- | ------------- | ----------- |
| —             | `id`          | UUID (auto) |
| `eventType`   | `event_type`  | varchar(50) |
| `contentId`   | `content_id`  | varchar(100)|
| `sessionId`   | `session_id`  | varchar(100)|
| `userId`      | `user_id`     | varchar(100)|
| `metadata`    | `metadata`    | JSON        |
| `platform`    | `platform`    | varchar(50) |
| —             | `created_at`  | timestamptz |

The `stats` table exists for aggregated counters but is **not exposed** via any REST endpoint.

---

## Environment variables

| Variable       | Required | Default                  | Purpose              |
| -------------- | -------- | ------------------------ | -------------------- |
| `PORT`         | no       | `3001`                   | HTTP listen port     |
| `DATABASE_URL` | yes      | —                        | PostgreSQL connection|
| `REDIS_URL`    | no       | `redis://localhost:6379` | View dedup cache     |

---

## Known limitations

- No OpenAPI / Swagger specification.
- No API versioning prefix.
- No explicit response DTO classes.
- No authentication or authorization.
- Single-event and batch endpoints have different deduplication semantics.
- `eventType` values are not validated against an enum.
