# Social Media Backend — API Reference

**Base URL:** `http://127.0.0.1:5001` (or your `PORT` from environment)

**JSON APIs:** `Content-Type: application/json` unless noted (multipart for uploads).

**Bearer auth:** `Authorization: Bearer <accessToken>` for routes marked *(Bearer)*.

**Cookie auth (OAuth only):** `POST /api/auth/oAuthPersonal_info` uses `protectAuthRoute` — send `Cookie: jwt=<token>`.

---

## Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|---------------|
| POST | `/signup` | — | Body: `userName`, `email`, `password` (min 6 chars). Returns `accessToken` + `user`. |
| POST | `/login` | — | Body: `email`, `password`. Returns `accessToken` + `user`. |
| POST | `/logout` | — | Clears `token` cookie; returns `{ message }`. |
| POST | `/personal_info` | Bearer | Body: `firstName`, `lastName`, `dob`, optional `gender`. |
| PUT | `/update-profile` | Bearer | Body: `profilePic` as base64 data URL (`data:image/...`). |
| GET | `/user/:id` | — | Public user profile (`-password`). |
| GET | `/me` | Bearer | `{ user }` for current user. |
| GET | `/check` | Bearer | Current user object (from middleware). |
| GET | `/getUserEmail` | Bearer | `{ email, userName }`. |
| GET | `/google` | — | Starts Google OAuth (Passport). |
| GET | `/google/callback` | — | OAuth callback; redirects to frontend. |
| POST | `/oAuthPersonal_info` | Cookie JWT | Body: `firstName`, `lastName`, `dob`, optional `gender`. |

---

## Feeds (posts) — `/api/feeds`

| Method | Path | Auth | Description |
|--------|------|------|---------------|
| POST | `/` | Bearer | `multipart/form-data`: field `file` (image or video), optional `caption`. |
| GET | `/` | Bearer | Query: `page`, `limit` (defaults 1, 10). Returns `{ posts, page, limit }`. |
| GET | `/:id` | Bearer | Single post by ID. |
| PUT | `/:id` | Bearer | JSON: `caption`. Owner only. |
| DELETE | `/:id` | Bearer | Owner only; removes media from Cloudinary. |

---

## Post likes — `/api/likes`

| Method | Path | Auth | Description |
|--------|------|------|---------------|
| POST | `/:id` | Bearer | Toggle like on post `id`. |
| GET | `/:id/count` | — | `{ postId, likes }` count. |
| GET | `/:id/check` | Bearer | `{ liked: boolean }` for current user. |

---

## Post comments — `/api/comments`

| Method | Path | Auth | Description |
|--------|------|------|---------------|
| POST | `/:postId` | Bearer | Body: `text`, optional `parentId` (reply to root comment). |
| GET | `/:postId` | — | `{ comments }` — root comments with nested `replies`. |
| PUT | `/:id` | Bearer | Body: `text`. |
| DELETE | `/:id` | Bearer | Deletes comment and its replies (author or post owner for posts). |

---

## Messages — `/api/messages`

| Method | Path | Auth | Description |
|--------|------|------|---------------|
| GET | `/users` | Bearer | All users except self (`-password`). |
| GET | `/:id` | Bearer | Messages between me and user `id`. |
| POST | `/send/:id` | Bearer | Body: `text`, optional `image` (base64 → Cloudinary). |
| GET | `/check` | Bearer | Same handler as auth `checkAuth` — **see note below**. |

> **Note:** `GET /:id` is registered before `GET /check`. A request to `GET /api/messages/check` is handled as `getMessages` with `id = "check"`, not as auth check. Consider moving `GET /check` above `GET /:id` if you need that route.

---

## Shorts — video `/api/shorts/video`

| Method | Path | Auth | Description |
|--------|------|------|---------------|
| POST | `/createshort` | Bearer | `multipart/form-data`: `video`, optional `caption`, optional `duration`. |
| POST | `/short/:id/viewshort` | Bearer | Increment view count for short `id`. |
| GET | `/getallshorts` | Bearer | `{ videos }` list. |

---

## Shorts — likes `/api/shorts/likes`

| Method | Path | Auth | Description |
|--------|------|------|---------------|
| POST | `/:id/likeshort` | Bearer | Toggle like on short `id`. |
| GET | `/:id/shortlike-status` | Bearer | `{ liked, likeCount }`. |

---

## Shorts — comments `/api/shorts/comments`

| Method | Path | Auth | Description |
|--------|------|------|---------------|
| POST | `/:shortId` | Bearer | Body: `text`, optional `parentId`. |
| GET | `/:shortId` | Bearer | `{ comments }` with `replies`. |
| POST | `/:commentId/reply` | Bearer | Body: `text` — reply to root comment only. |
| PUT | `/:id` | Bearer | Body: `text`. |
| DELETE | `/:id` | Bearer | Deletes comment and replies (author only). |

---

## Quick flat list

```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/personal_info
PUT    /api/auth/update-profile
GET    /api/auth/user/:id
GET    /api/auth/me
GET    /api/auth/check
GET    /api/auth/getUserEmail
GET    /api/auth/google
GET    /api/auth/google/callback
POST   /api/auth/oAuthPersonal_info

POST   /api/feeds/
GET    /api/feeds/
GET    /api/feeds/:id
PUT    /api/feeds/:id
DELETE /api/feeds/:id

POST   /api/likes/:id
GET    /api/likes/:id/count
GET    /api/likes/:id/check

POST   /api/comments/:postId
GET    /api/comments/:postId
PUT    /api/comments/:id
DELETE /api/comments/:id

GET    /api/messages/users
GET    /api/messages/:id
POST   /api/messages/send/:id
GET    /api/messages/check

POST   /api/shorts/video/createshort
POST   /api/shorts/video/short/:id/viewshort
GET    /api/shorts/video/getallshorts

POST   /api/shorts/likes/:id/likeshort
GET    /api/shorts/likes/:id/shortlike-status

POST   /api/shorts/comments/:shortId
GET    /api/shorts/comments/:shortId
POST   /api/shorts/comments/:commentId/reply
PUT    /api/shorts/comments/:id
DELETE /api/shorts/comments/:id
```
