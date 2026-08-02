# Project Camp

A self-hosted project management workspace for small teams — projects with role-based membership, a drag-and-drop Kanban board, task comments with `@mentions`, in-app notifications, and a single-request analytics dashboard.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.1-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%208-47A248?logo=mongodb&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-blue)

<!-- ![Dashboard](docs/screenshots/dashboard.png) -->

## Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Demo Data](#demo-data)
- [Available Scripts](#available-scripts)
- [API](#api)
- [Design System](#design-system)
- [License](#license)

## Features

### Authentication and accounts

- Registration with email verification. Tokens are generated with `crypto.randomBytes`, stored as SHA-256 hashes, and expire after 20 minutes.
- Login with **either** an email address or a username.
- JWT access and refresh tokens delivered as httpOnly cookies, with rotation on refresh.
- Forgot password and reset password by emailed link.
- Change password from Settings — invalidates other sessions and re-issues cookies for the current browser.
- Resend verification email, rate limited to one request per 60 seconds.

### Projects and permissions

- Three roles — `admin`, `project_admin`, and `member` — enforced per project by the `verifyProjectRole` middleware.
- Add members by email, change their role, or remove them.
- Creating a project automatically enrolls the creator as its `admin`.
- Deleting a project cascades to its memberships and tasks.

### Tasks and the Kanban board

- Four statuses (`todo`, `in_progress`, `review`, `done`) and four priorities (`low`, `medium`, `high`, `critical`).
- Assignee and due date per task; assignees are validated against project membership.
- Drag and drop to reorder within a column or move across columns, persisted through a bulk reorder endpoint.
- Board filter bar with debounced title search, priority chips, and an assignee filter.
- Task detail drawer with inline editing for admins and project admins.

<!-- ![Kanban board](docs/screenshots/kanban.png) -->

### Calendar

- Monthly grid of tasks by due date, with priority-colored chips and a day popover.

### Collaboration

- Threaded comments on any task, with `@username` mentions that resolve to real users and fire notifications.
- Comment authors can edit and delete their own comments; project admins can moderate any of them.
- In-app notification center that polls every 30 seconds and shows an unread badge.
- Per-project activity log recording project, member, and task events.

### Dashboard and search

- One `GET /api/v1/dashboard` request returns every widget: KPI summary, my tasks, recent activity, upcoming deadlines, project progress, team workload, analytics, calendar preview, task distribution, and completion trend.
- Charts rendered with Recharts and themed to the application palette.
- A ⌘K command palette searching across projects, tasks, and members.

## Tech Stack

### Backend

| Package | Version | Role |
| --- | --- | --- |
| `express` | ^5.1.0 | HTTP server and routing |
| `mongoose` | ^8.19.1 | MongoDB ODM |
| `zod` | ^4.4.3 | Request body validation |
| `jsonwebtoken` | ^9.0.2 | Access and refresh tokens |
| `bcrypt` | ^6.0.0 | Password hashing |
| `nodemailer` + `mailgen` | ^7.0.10 / ^2.0.32 | Transactional email |
| `cookie-parser`, `cors`, `morgan` | — | Cookies, CORS, request logging |

### Frontend

| Package | Version | Role |
| --- | --- | --- |
| `react` / `react-dom` | ^19.2.6 | UI runtime |
| `vite` | ^8.0.12 | Dev server and bundler |
| `react-router-dom` | ^7.17.0 | Routing |
| `tailwindcss` | ^3.4.19 | Styling |
| `zustand` | ^5.0.14 | Client state |
| `axios` | ^1.17.0 | HTTP client with refresh interceptor |
| `react-hook-form` + `zod` | ^7.77.0 / ^4.4.3 | Forms and validation |
| `recharts` | ^3.9.2 | Dashboard charts |
| `@dnd-kit/core` + `@dnd-kit/sortable` | ^6.3.1 / ^10.0.0 | Kanban drag and drop |

## Architecture

Two independent packages in one repository. There is no workspace tooling — install and run each one separately.

```text
projectmanagement/
├── backend/
│   ├── scripts/            # seed script and fixture data
│   └── src/
│       ├── app.js          # middleware stack, router mounts, error handler
│       ├── index.js        # entry point: connect to Mongo, then listen
│       ├── controllers/    # request handlers
│       ├── db/             # Mongoose connection
│       ├── middleware/     # auth, validation, logging
│       ├── model/          # Mongoose schemas
│       ├── routes/         # Express routers
│       ├── services/       # dashboard aggregation pipelines
│       ├── utils/          # ApiResponse, ApiError, asyncHandler, mail, constants
│       └── validators/     # Zod schemas
├── frontend/
│   └── src/
│       ├── api/            # axios instance and per-resource API modules
│       ├── components/     # layout, dashboard widgets, UI primitives
│       ├── context/        # quick actions and command palette
│       ├── pages/          # route components
│       ├── router/         # route table and ProtectedRoute
│       ├── store/          # zustand stores
│       └── utils/          # formatting and error helpers
└── docs/
    └── API.md              # full endpoint reference
```

### Request flow

```text
Route → validate(schema) → verifyJWT → verifyProjectRole(...roles) → Controller → Model
```

`validate` runs a Zod `safeParse` on the request body and returns `422` with field errors on failure. `verifyProjectRole` confirms the caller has a `ProjectMember` record for `:projectId` with one of the allowed roles.

### Response envelope

Every handler is wrapped in `asyncHandler`, which forwards rejections to the global error handler in [backend/src/app.js](backend/src/app.js). Successful responses use `ApiResponse`:

```json
{ "statusCode": 200, "data": {}, "message": "Success", "success": true }
```

Failures are thrown as `ApiError` and serialized as:

```json
{ "statusCode": 404, "message": "Project not found", "errors": [], "success": false }
```

### Authentication

The frontend never handles tokens directly. The backend sets `accessToken` and `refreshToken` as httpOnly cookies; the axios instance sends them with `withCredentials: true`. On a `401`, a response interceptor queues concurrent requests, calls `POST /api/v1/auth/refresh-token` once, replays the queue, and redirects to `/login` if the refresh itself fails. `verifyJWT` also accepts an `Authorization: Bearer <token>` header, which is what makes the API usable from curl or Postman.

## Getting Started

### Prerequisites

- Node.js 18 or newer
- A MongoDB instance — local, or a MongoDB Atlas connection string
- An SMTP account for verification and password-reset email (Mailtrap works well for development)

### 1. Clone

```bash
git clone https://github.com/Samarththakuri/Project-management.git
cd Project-management
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set at minimum `MONGO_URI`, `ACCESS_TOKEN_SECRET`, and `REFRESH_TOKEN_SECRET`. Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then start the API:

```bash
npm run dev
```

> **Keep `PORT=8000`.** The frontend dev server proxies `/api` to `http://localhost:8000`, and that target is hard-coded in [frontend/vite.config.js](frontend/vite.config.js). If you change the backend port, change the proxy target to match.

Confirm it is up:

```bash
curl http://localhost:8000/api/v1/healthcheck
```

### 3. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The app is served at <http://localhost:5173>. Make sure `CORS_ORIGIN` in `backend/.env` includes that origin.

## Environment Variables

All of these live in `backend/.env`. The frontend has no environment file — it reaches the API through the relative path `/api/v1`, resolved by the Vite proxy in development and by your reverse proxy in production.

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | Port the API listens on. Defaults to `3000`; set it to `8000` to match the frontend proxy. |
| `NODE_ENV` | No | Set to `production` to enable the `secure` flag on auth cookies (requires HTTPS). |
| `MONGO_URI` | Yes | MongoDB connection string, e.g. `mongodb://127.0.0.1:27017/projectcamp`. |
| `CORS_ORIGIN` | Yes | Comma-separated allowed origins. The **first entry** is also the base URL used to build verification and password-reset links in outgoing email, so it must point at the frontend. |
| `ACCESS_TOKEN_SECRET` | Yes | Signing secret for access tokens. |
| `ACCESS_TOKEN_EXPIRY` | Yes | Access token lifetime, e.g. `15m`. |
| `REFRESH_TOKEN_SECRET` | Yes | Signing secret for refresh tokens. |
| `REFRESH_TOKEN_EXPIRY` | Yes | Refresh token lifetime, e.g. `10d`. |
| `MAILTRAP_SMTP_HOST` | Yes | SMTP host. |
| `MAILTRAP_SMTP_PORT` | Yes | SMTP port. |
| `MAILTRAP_SMTP_USER` | Yes | SMTP username. |
| `MAILTRAP_SMTP_PASS` | Yes | SMTP password. |

## Demo Data

The seed script clears the users, projects, memberships, and tasks collections, then loads two fully populated projects.

```bash
cd backend
npm run seed
```

It creates four accounts, all with the password `Password@123`:

| Email | Role |
| --- | --- |
| `alice@example.com` | `admin` on *Project Camp* |
| `bob@example.com` | `project_admin` on *Project Camp*, `admin` on *Marketing Site Redesign* |
| `carol@example.com` | `member` on both projects |
| `dave@example.com` | `member` on *Marketing Site Redesign* |

Signing in as each one is the quickest way to see how the role checks change the interface.

## Available Scripts

### `backend/`

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API with nodemon and hot reload |
| `npm start` | Start the API with plain node |
| `npm run seed` | Reset the database and load demo data |
| `npx prettier --write src/` | Format the source tree |

### `frontend/`

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server on port 5173 |
| `npm run build` | Build the production bundle into `dist/` |
| `npm run preview` | Serve the built bundle locally |
| `npm run lint` | Run ESLint |

## API

Base path: `/api/v1`. Full request and response details, including query parameters, role requirements, and curl examples, are in **[docs/API.md](docs/API.md)**.

| Area | Base path | Endpoints |
| --- | --- | --- |
| Healthcheck | `/api/v1/healthcheck` | 1 |
| Auth | `/api/v1/auth` | 10 |
| Projects and members | `/api/v1/projects` | 9 |
| Tasks | `/api/v1/projects/:projectId/tasks` | 7 |
| Comments | `/api/v1/projects/:projectId/tasks/:taskId/comments` | 4 |
| Notifications | `/api/v1/notifications` | 3 |
| Search | `/api/v1/search` | 1 |
| Dashboard | `/api/v1/dashboard` | 2 |

## Design System

The interface follows a design system called **Obsidian Precision** — dark-first technical minimalism, aiming for information density without visual noise.

- **Canvas** `#131313`, with elevation expressed through tonal layering (`#1c1b1b` → `#201f1f` → `#2a2a2a`) and 1px borders rather than drop shadows.
- **Accent** a teal spark, `#7df4ff` and `#00dbe9`, reserved for interactive and active states.
- **Typography** Geist for interface text, JetBrains Mono for metadata and status labels — mono labels are always uppercase with widened tracking.
- **Zero border radius** on every surface: buttons, inputs, cards, avatars, and modals all have square corners. The single exception is status dots, which are fully round.
- **4px spacing grid**, a fixed 260px sidebar, and a 1440px maximum content width.

Every token is mirrored into [frontend/tailwind.config.js](frontend/tailwind.config.js), which is the authoritative reference when building new components.

## License

ISC.
