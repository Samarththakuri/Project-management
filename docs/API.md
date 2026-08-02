# Project Camp — API Reference

Complete reference for the Project Camp REST API. For setup and architecture, see the [root README](../README.md).

- [Conventions](#conventions)
- [Middleware legend](#middleware-legend)
- [Healthcheck](#healthcheck)
- [Auth](#auth)
- [Projects and members](#projects-and-members)
- [Tasks](#tasks)
- [Comments](#comments)
- [Notifications](#notifications)
- [Search](#search)
- [Dashboard](#dashboard)
- [Enums](#enums)
- [Worked example](#worked-example)

## Conventions

**Base path** — every endpoint below is prefixed with `/api/v1`. In development that resolves to `http://localhost:8000/api/v1`.

**Authentication** — the API issues an `accessToken` and a `refreshToken` as httpOnly cookies on login. Browser clients send them automatically with `credentials: "include"`. Non-browser clients can instead send the access token as a header:

```
Authorization: Bearer <accessToken>
```

**Success envelope**

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Success",
  "success": true
}
```

**Error envelope**

```json
{
  "statusCode": 404,
  "message": "Project not found",
  "errors": [],
  "success": false
}
```

**Status codes**

| Code | Meaning |
| --- | --- |
| `200` | Success |
| `201` | Resource created |
| `400` | Malformed request or a failed business rule (for example, assigning a task to a non-member) |
| `401` | Missing, invalid, or expired access token |
| `403` | Authenticated, but the role on this project is insufficient |
| `404` | Resource does not exist, or is not visible to the caller |
| `409` | Conflict — duplicate email or username, member already on the project, email already verified |
| `422` | Zod validation failed. `errors` holds the per-field messages |
| `429` | Rate limited. The body carries `retryAfterSeconds` |

**Content type** — send `Content-Type: application/json`. Request bodies are capped at 16kb.

## Middleware legend

| Marker | Meaning |
| --- | --- |
| **Public** | No authentication required |
| **Auth** | `verifyJWT` — a valid access token is required |
| **Optional auth** | `optionalJWT` — attaches the user when a token is present, but never rejects |
| **Role: …** | `verifyProjectRole(...)` — the caller must have a `ProjectMember` record for `:projectId` with one of the listed roles |
| **Validated** | The body is checked by a Zod schema; failures return `422` |

Where a table says **Role: any member**, the accepted roles are `admin`, `project_admin`, and `member`.

---

## Healthcheck

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/healthcheck` | Public | Confirms the API is reachable. Responds with the standard envelope wrapping `data: { "message": "Server is running" }`. |

---

## Auth

Mounted at `/api/v1/auth`.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public, validated | Create an account and send a verification email. Returns the sanitized user with `201`. `409` if the email or username is taken. |
| `POST` | `/auth/login` | Public, validated | Sign in with email **or** username plus password. Sets both auth cookies. Always returns a generic `401` on failure so accounts cannot be enumerated. |
| `POST` | `/auth/logout` | Optional auth | Clear both cookies and blank the stored refresh token. Idempotent — succeeds even with an expired or missing token. |
| `GET` | `/auth/current-user` | Auth | Return the signed-in user. The frontend calls this on load to restore a session from the cookie. |
| `POST` | `/auth/change-password` | Auth, validated | Change the password, invalidate other sessions, and re-issue cookies for the current browser. Rejects reusing the current password. |
| `POST` | `/auth/refresh-token` | Public | Rotate the token pair. Reads the refresh token from the cookie, or from `refreshToken` in the body. |
| `GET` | `/auth/verify-email/:verificationToken` | Public | Consume an email verification token and mark the account verified. |
| `POST` | `/auth/forgot-password` | Public, validated | Email a password reset link. Always returns the same `200` message whether or not the account exists. |
| `POST` | `/auth/reset-password/:resetToken` | Public, validated | Set a new password using the emailed token. Clears the stored refresh token, ending existing sessions. |
| `POST` | `/auth/resend-email-verification` | Auth | Resend the verification email. `409` if already verified, `429` with `retryAfterSeconds` inside the 60 second cooldown. |

### Request bodies

`POST /auth/register`

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `email` | string | Yes | Must be a valid email |
| `username` | string | Yes | At least 3 characters, lowercase alphanumeric and underscores only |
| `password` | string | Yes | At least 8 characters |
| `fullName` | string | No | — |

`POST /auth/login` — `password` is required, plus at least one of `email` or `username`.

`POST /auth/change-password` — `oldPassword` and `newPassword` (at least 8 characters, and different from the old one).

`POST /auth/forgot-password` — `email`.

`POST /auth/reset-password/:resetToken` — `newPassword` (at least 8 characters).

> Verification and reset tokens are single-use, hashed with SHA-256 before storage, and expire 20 minutes after they are issued.

---

## Projects and members

Mounted at `/api/v1/projects`.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/projects` | Auth | List every project the caller belongs to, each with `memberCount` and the caller's own `role`. |
| `POST` | `/projects` | Auth, validated | Create a project. The creator is automatically enrolled as its `admin`. Returns `201`. |
| `GET` | `/projects/:projectId` | Role: any member | Fetch a single project. |
| `PATCH` | `/projects/:projectId` | Role: `admin`, validated | Update the name or description. |
| `DELETE` | `/projects/:projectId` | Role: `admin` | Delete the project and cascade to its memberships and tasks. |
| `GET` | `/projects/:projectId/members` | Role: any member | List members with their user details. |
| `POST` | `/projects/:projectId/members` | Role: `admin`, `project_admin`, validated | Add an existing user by email. `404` if no such user, `409` if already a member. Returns `201` and notifies the new member. |
| `PATCH` | `/projects/:projectId/members/:userId` | Role: `admin`, validated | Change a member's role and notify them. |
| `DELETE` | `/projects/:projectId/members/:userId` | Role: `admin` | Remove a member from the project. |

### Request bodies

`POST /projects` — `name` (required, non-empty) and `description` (optional).

`PATCH /projects/:projectId` — `name` and/or `description`. At least one must be present.

`POST /projects/:projectId/members` — `email` (must belong to a registered user) and `role` (one of the [role values](#enums)).

`PATCH /projects/:projectId/members/:userId` — `role`.

> Members must already have an account. There is no invitation flow for unregistered email addresses.

---

## Tasks

Mounted at `/api/v1/projects`, so every path is scoped to a project.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/projects/:projectId/tasks` | Role: any member | All tasks in the project with the assignee populated, sorted by `order`. |
| `POST` | `/projects/:projectId/tasks` | Role: `admin`, `project_admin`, validated | Create a task. Returns `201` and notifies the assignee. |
| `GET` | `/projects/:projectId/tasks/calendar` | Role: any member | Tasks with a due date inside a window, sorted by due date. |
| `PATCH` | `/projects/:projectId/tasks/reorder` | Role: `admin`, `project_admin`, validated | Persist board positions after a drag and drop. |
| `GET` | `/projects/:projectId/tasks/:taskId` | Role: any member | A single task with assignee and assigner populated. |
| `PATCH` | `/projects/:projectId/tasks/:taskId` | Role: `admin`, `project_admin`, validated | Partially update a task. Notifies the new assignee when it changes. |
| `DELETE` | `/projects/:projectId/tasks/:taskId` | Role: `admin`, `project_admin` | Delete a task. |

### Query parameters

`GET /projects/:projectId/tasks/calendar`

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `from` | date string | First day of the current month | Start of the window |
| `to` | date string | Last day of the current month | End of the window |

### Request bodies

`POST /projects/:projectId/tasks`

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `title` | string | Yes | Non-empty |
| `description` | string | No | — |
| `assignee` | string | No | A 24-character ObjectId. Must belong to a member of this project, otherwise `400` |
| `status` | string | No | A [task status](#enums). Defaults to `todo` |
| `priority` | string | No | A [task priority](#enums). Defaults to `medium` |
| `dueDate` | date string | No | Nullable |

`PATCH /projects/:projectId/tasks/:taskId` — the same fields, all optional, but at least one must be present.

`PATCH /projects/:projectId/tasks/reorder`

```json
{
  "tasks": [
    { "taskId": "652f1a0000000000000000aa", "order": 0 },
    { "taskId": "652f1b0000000000000000bb", "order": 1 }
  ]
}
```

> `order` positions a task within its status column. `completedAt` is managed by the server: it is stamped when a task moves into `done` and cleared when it moves back out.

---

## Comments

Mounted at `/api/v1/projects`. Every project member can comment.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/projects/:projectId/tasks/:taskId/comments` | Role: any member | Comments on a task with authors populated, oldest first. |
| `POST` | `/projects/:projectId/tasks/:taskId/comments` | Role: any member, validated | Post a comment. Returns `201`. |
| `PATCH` | `/projects/:projectId/tasks/:taskId/comments/:commentId` | Role: any member, validated | Edit a comment and re-resolve its mentions. |
| `DELETE` | `/projects/:projectId/tasks/:taskId/comments/:commentId` | Role: any member | Delete a comment. |

Both `PATCH` and `DELETE` apply a second ownership check inside the controller: the caller must be the comment's author, or an `admin` or `project_admin` on the project. Anyone else receives `403`.

### Request body

`content` (required, non-empty) for both create and update.

Any `@username` in `content` that matches a real user is stored in the comment's `mentions` array and triggers a `mentioned_in_comment` notification for that user.

---

## Notifications

Mounted at `/api/v1`. All notifications are scoped to the authenticated recipient.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/notifications` | Auth | The 50 most recent notifications, unread first, then newest first. |
| `PATCH` | `/notifications/read-all` | Auth | Mark every unread notification as read. |
| `PATCH` | `/notifications/:id/read` | Auth | Mark a single notification as read. `404` if it does not belong to the caller. |

Notifications are generated when a task is assigned, a member is added to a project, a member's role changes, or a user is mentioned in a comment. See [notification types](#enums).

---

## Search

Mounted at `/api/v1/search`. Backs the ⌘K command palette.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/search` | Auth | Search projects, tasks, and members across every project the caller belongs to. |

### Query parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `q` | string | — | Required. A blank or missing value returns `400` |
| `type` | string | `all` | One of `all`, `project`, `task`, `member` |

Projects and members are matched with a case-insensitive regex; tasks use the MongoDB text index on title and description. Each category returns at most 10 results, and members are de-duplicated across projects.

---

## Dashboard

Mounted at `/api/v1/dashboard`. Scoped to the authenticated user across all of their projects.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/dashboard` | Auth | Every dashboard widget in a single response. |
| `GET` | `/dashboard/activity` | Auth | Paginated activity feed, used by the "Load more" control. |

### `GET /dashboard` response keys

| Key | Contents |
| --- | --- |
| `summary` | Headline KPI counters |
| `myTasks` | Tasks assigned to the caller |
| `recentActivity` | Latest activity log entries |
| `notifications` | The 8 most recent notifications |
| `upcomingDeadlines` | Tasks due soon |
| `projectProgress` | Per-project completion figures |
| `teamWorkload` | Open task counts per assignee |
| `analytics` | Priority and status breakdowns for the charts |
| `calendarPreview` | Condensed upcoming calendar entries |
| `taskDistribution` | Task counts by status |
| `completionTrend` | Completions over time |

When the caller belongs to no projects, the same shape is returned with every value zeroed or empty, so clients never need to null-check.

### `GET /dashboard/activity` query parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `page` | integer | `1` | 1-indexed page number |
| `limit` | integer | `12` | Items per page, clamped to 1–50 |

Responds with `activities`, `total`, `page`, `limit`, and `hasMore`.

---

## Enums

Defined in [backend/src/utils/constants.js](../backend/src/utils/constants.js).

| Set | Values |
| --- | --- |
| Roles | `admin`, `project_admin`, `member` |
| Task status | `todo`, `in_progress`, `review`, `done` |
| Task priority | `low`, `medium`, `high`, `critical` |
| Notification type | `task_assigned`, `added_to_project`, `role_changed`, `mentioned_in_comment` |
| Activity action | `project.created`, `project.updated`, `project.deleted`, `member.added`, `member.removed`, `member.role_changed`, `task.created`, `task.updated`, `task.deleted`, `comment.created`, `comment.updated`, `comment.deleted` |

---

## Worked example

A full run from an empty database to a task on the board, using a cookie jar so the auth cookies persist between calls.

```bash
BASE=http://localhost:8000/api/v1

# 1. Register. Check your SMTP inbox for the verification link.
curl -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com","username":"ada","password":"Password@123","fullName":"Ada Lovelace"}'

# 2. Verify the email using the token from that link.
curl "$BASE/auth/verify-email/<verificationToken>"

# 3. Log in, saving the auth cookies to a jar.
curl -X POST "$BASE/auth/login" -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com","password":"Password@123"}'

# 4. Create a project. The response data contains its _id.
curl -X POST "$BASE/projects" -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"Apollo","description":"Guidance software"}'

# 5. Add a task to it.
curl -X POST "$BASE/projects/<projectId>/tasks" -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"title":"Write the rope memory routine","priority":"high","status":"todo"}'

# 6. Read the board back.
curl "$BASE/projects/<projectId>/tasks" -b cookies.txt
```

To add a teammate, register their account first, then:

```bash
curl -X POST "$BASE/projects/<projectId>/members" -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"grace@example.com","role":"member"}'
```
