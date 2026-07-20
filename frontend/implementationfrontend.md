# Frontend Implementation Status

Tracks what is done, what is in progress, and what still needs to be built for the Project Camp frontend.
Design reference: `DESIGN.md` (in this folder). Screenshots of all target screens are in the project root.

---

## Legend
- ✅ Complete
- ⚠️ Partial / in progress
- ❌ Not started

---

## Recent Changes (2026-07-20)

Settings page hardening pass:
- **Live profile sync ✅** — `authStore` gained `refreshUser()` (wraps `GET /auth/current-user`)
  and an `isLoading` flag. Settings re-syncs on mount and on window `focus` /
  `visibilitychange` (throttled to one call per 3s), so verifying in another tab flips the
  page from "Email not verified" to "Email verified" without a logout/login round trip.
- **Resend cooldown ✅** — 60s client countdown (`Resend verification email (52s)`), seeded
  from the server's `retryAfterSeconds` on a 429 so the two never disagree.
- **Password form ✅** — Zod now mirrors the backend (`min(8)`, new ≠ current, confirm
  matches); success banner auto-hides after 5s and clears on the next keystroke; proper
  `autocomplete` values (`current-password` / `new-password` ×2) for password managers.
- **Sign out ✅** — disabled while in flight; clears the auth **and** notification stores and
  redirects to `/login` even when the API call fails.
- **Shared error helper ✅** — `src/utils/errors.js` (`apiErrorMessage`, `retryAfterFromError`)
  replaces the assume-it's-Axios `err.response.data.message` pattern.
- **Accessibility ✅** — `role="status"` + `aria-live` on the verification state, `aria-busy`
  on in-flight buttons, `aria-labelledby` on each section, `aria-hidden` on the decorative
  status dot; native controls kept, so keyboard order is unchanged.
- **Avatar fix ✅** — Settings was passing the raw `{ url, localPath }` object to `<Avatar src>`;
  now uses the existing `avatarUrl()` helper like the dashboard widgets do.

---

## Recent Changes (2026-07-19)

Gap-closure pass (see `docs/project-gaps.md` §0/§0.1):
- **Notes UI removed** — `notes.api.js`, the Create-Note quick action + modal, and the
  Command Palette notes group all deleted.
- **Subtasks UI removed** — `updateSubtask` wrapper, the task-drawer subtask section, the
  KanbanCard subtask badge, and the My-Tasks progress bar all removed.
- **Task edit form ✅** — inline edit mode in the Kanban task drawer (admin/project-admin),
  editing title/description/status/priority/assignee/due-date.
- **Resend verification ✅** — button on the Settings page when the account is unverified.
- **Project edit/delete ✅** — admin-only Edit + Delete actions on the Project Overview page.

Sections below referencing Notes/Subtasks are historical and superseded by the above.

---

## Frontend Reference

Design reference screenshots, HTML mockups, and notes live in `frontend/frontendref/`.
All component styling must follow `frontend/DESIGN.md` tokens (zero border-radius, Obsidian Precision palette, Geist + JetBrains Mono).

---

## Tech Stack Decisions

| Concern | Choice | Status | Notes |
|---|---|---|---|
| Framework | React 19 + Vite | ✅ | Already scaffolded |
| Styling | Tailwind CSS v3 | ✅ | Installed + configured with all DESIGN.md tokens |
| Routing | React Router v7 | ✅ | Installed `react-router-dom` |
| HTTP client | Axios | ✅ | Installed; base URL pointed at `/api/v1/`; useEffect + Axios for data fetching (no React Query) |
| Client state | Zustand | ✅ | Installed |
| Form handling | React Hook Form + Zod | ✅ | Installed (`react-hook-form`, `zod`, `@hookform/resolvers`) |
| Fonts | Geist + JetBrains Mono | ✅ | Loaded via Google Fonts in `index.html` |
| Icons | Material Symbols Outlined | ✅ | Loaded via Google Fonts CDN in `index.html` |

---

## Project Structure (Target)

```
frontend/src/
├── api/                  # Axios instance + per-resource API functions
│   ├── axios.js          ✅
│   ├── auth.api.js       ✅
│   ├── projects.api.js   ✅
│   ├── tasks.api.js      ✅
│   ├── notes.api.js      ✅
│   └── comments.api.js   ✅
├── components/
│   ├── layout/
│   │   ├── SideNavBar.jsx   ✅
│   │   ├── TopNavBar.jsx    ✅
│   │   └── AppLayout.jsx    ✅ (includes CreateProjectModal)
│   └── ui/               ✅ All primitives built
├── pages/
│   ├── auth/
│   │   ├── LoginPage.jsx          ✅
│   │   ├── RegisterPage.jsx       ✅
│   │   ├── ForgotPasswordPage.jsx ✅
│   │   ├── ResetPasswordPage.jsx  ✅
│   │   └── VerifyEmailPage.jsx    ✅
│   ├── dashboard/
│   │   └── DashboardPage.jsx      ✅
│   ├── projects/
│   │   ├── ProjectsPage.jsx       ✅
│   │   ├── ProjectOverviewPage.jsx ✅
│   │   └── KanbanBoardPage.jsx    ✅
│   └── settings/
│       └── SettingsPage.jsx       ✅
├── store/
│   ├── authStore.js      ✅
│   └── uiStore.js        ❌ (not needed yet)
├── router/
│   └── index.jsx         ✅ React Router routes + ProtectedRoute wrapper
├── App.jsx               ✅
├── main.jsx              ✅
└── index.css             ✅ Tailwind directives + custom scrollbar CSS
```

---

## Pages

### Auth Pages

| Page | Route | Status | Notes |
|---|---|---|---|
| Login | `/login` | ✅ | Split-screen layout: brand left, form right. Email + password fields, "Forgot?" link, corner accent decorations. |
| Register | `/register` | ✅ | Same split-screen layout. Fields: Full Name, **Username** (lowercase alphanumeric, min 3 — sent separately from Full Name), Work Email, Password (min 8), Terms checkbox. Now sends `fullName` distinctly from `username` (previously the "Full Name" input was wrongly bound to `username`). "INITIALIZE SEQUENCE" submit button. Shows success state with email verification notice. |
| Forgot Password | `/forgot-password` | ✅ | Single-column form; POST to `/api/v1/auth/forgot-password` |
| Reset Password | `/reset-password/:token` | ✅ | New password + confirm; POST to `/api/v1/auth/reset-password/:token` |
| Verify Email | `/verify-email/:token` | ✅ | Auto-calls GET on mount; shows loading / success / error state |

### App Pages (Protected — require auth)

| Page | Route | Status | Notes |
|---|---|---|---|
| Dashboard | `/dashboard` | ✅ | KPI cards (Active Issues, System Uptime), Recent Activity feed, Your Queue, Today's Schedule. Animated number counters on load. |
| Projects List | `/projects` | ✅ | Grid of project cards with name, description, member count, progress bar. Empty state. |
| Project Overview | `/projects/:projectId` | ✅ | Bento grid: Priority Tasks, Team, Task Stats. Project header with progress bar + team avatars. Team panel has role-based member management: add member (admin+project_admin), change role + remove member (admin only). |
| Kanban Board | `/projects/:projectId/board` | ✅ | Four columns: Todo, In Progress, In Review, Done. Filter bar (search, priority chips, assignee). Task cards with priority badge, ID, subtask count, assignee avatar. Right drawer for task detail. dnd-kit drag-and-drop. |
| Calendar View | `/projects/:projectId/calendar` | ✅ | Monthly grid; tasks render as chips on their due date; color by priority; task detail popover on click; prev/next month navigation. |
| Chat | `/projects/:projectId/chat` | ❌ | Future enhancement — skip for v1. |
| Settings | `/settings` | ✅ | User profile (loading skeleton until `/current-user` resolves), live email-verification status with 60s resend cooldown, change password (backend-mirrored rules, auto-hiding success banner), sign out with in-flight lock. ARIA-labelled sections + live regions. |

---

## Shared Components

### SideNavBar
| Item | Status | Notes |
|---|---|---|
| Logo + brand name | ✅ | "Project Camp" + "Technical Operations" subtitle |
| "New Project" CTA button | ✅ | Opens CreateProjectModal in AppLayout |
| Nav links (Dashboard, Projects, Team, Calendar, Reports) | ✅ | Active state via NavLink |
| Footer links (Settings, Help) | ✅ | Same hover behaviour as main nav |
| Fixed 260px width, full height | ✅ | |
| Mobile nav | — | Not in v1 scope |

### TopNavBar
| Item | Status | Notes |
|---|---|---|
| Horizontal sub-nav tabs (Overview / Board / Calendar) | ✅ | Only shown when inside `/projects/:projectId/*`; active bottom border |
| Notifications bell | ✅ | Live — polls every 30s; red dot badge on unread; opens `NotificationPanel` dropdown |
| Command palette shortcut button (⌘K) | ✅ | Static display |
| User avatar | ✅ | Reads from Zustand authStore; initials fallback |

### UI Primitives
| Component | Status | Notes |
|---|---|---|
| Button | ✅ | Variants: primary, secondary, ghost. Sizes: sm, md, lg. Zero border-radius |
| Input | ✅ | With icon support, label, error message, focus ring teal, zero radius |
| Textarea | ✅ | Auto-resize via scrollHeight |
| Checkbox | ✅ | Zero radius, teal checked state, error prop support added |
| Select | ✅ | Styled native select, zero radius, expand_more icon |
| Modal | ✅ | Backdrop blur, corner accent decorations, Escape to close, portal |
| Badge/Status chip | ✅ | Mono font, uppercase, variants: error, warning, primary, default |
| Avatar | ✅ | Square (zero radius), grayscale → color on hover; initials-based fallback with hashed color |
| ProgressBar | ✅ | 2px height, teal fill, clamped 0–100 |
| KanbanCard | ✅ | Hover: `-translate-y-[2px]` + teal border glow; supports drag listeners |

---

## API Integration Layer

| Module | Endpoints covered | Status | Notes |
|---|---|---|---|
| Axios base | withCredentials, 401 → refresh → retry or redirect to login | ✅ | Queue-based refresh to avoid parallel refresh calls |
| `auth.api.js` | register, login, logout, currentUser, verifyEmail, forgotPassword, resetPassword, changePassword, refreshToken | ✅ | |
| `projects.api.js` | getProjects, createProject, getProjectById, updateProject, deleteProject, getMembers, addMember, updateMemberRole, removeMember | ✅ | |
| `tasks.api.js` | getProjectTasks, createTask, getTaskById, updateTask, deleteTask, reorderTasks, createSubtask, updateSubtask, deleteSubtask, getProjectCalendar, searchProject | ✅ | |
| `notes.api.js` | getProjectNotes, createNote, getNoteById, updateNote, deleteNote | ✅ | |
| `comments.api.js` | getTaskComments, createComment, updateComment, deleteComment | ✅ | |

---

## Auth Flow

| Item | Status | Notes |
|---|---|---|
| ProtectedRoute wrapper | ✅ | Reads Zustand auth store; redirects to `/login` if not authenticated |
| Persist auth state | ✅ | On app load, call `GET /api/v1/auth/current-user`; populate store or clear it |
| Axios 401 interceptor | ✅ | Try `POST /api/v1/auth/refresh-token`; on failure redirect to `/login` |
| Redirect after login | ✅ | Go to original `from` location or `/dashboard` on success |
| Logout | ✅ | POST `/api/v1/auth/logout`, clear Zustand store, redirect to `/login` |

---

## Tailwind Configuration

Status: ✅ (all DESIGN.md tokens configured in `tailwind.config.js`)

---

## Create Project Modal

| Item | Status | Notes |
|---|---|---|
| Modal markup + open/close logic | ✅ | Triggered by "New Project" button in sidebar via AppLayout |
| Fields: Project Name, Description | ✅ | RHF + Zod validation |
| POST to `/api/v1/projects/` | ✅ | |
| Refresh on success | ✅ | refreshKey increments → child Outlet rerenders |

---

## Kanban Board Interactions

| Item | Status | Notes |
|---|---|---|
| Render columns from task status (todo / in_progress / review / done) | ✅ | 4th "In Review" column added |
| Task card click → open right drawer | ✅ | |
| Drawer: task title, status badge, assignee, priority, due date, description, subtasks | ✅ | Avatar shape fixed (handles `{url,localPath}` object) |
| Subtask checkbox toggle → PATCH subtask | ✅ | |
| Drag-and-drop to change task status | ✅ | `@dnd-kit/core` + sortable |
| Drag-and-drop within column → reorder API call | ✅ | PATCH `/tasks/reorder` with `[{ taskId, order }]` |
| Add Task button → inline form (Todo column) with priority + dueDate + assignee | ✅ | Priority select + date picker + assignee select (reuses loaded `members`, no extra API); assignee defaults to current user so quick-added tasks reach My Tasks / Upcoming Deadlines / dashboard and fire the assignment notification; gated to `admin` + `project_admin` only |
| Role-based UI — member management (Project Overview) | ✅ | Add member button (admin+project_admin); role-change select + remove button per row (admin only) |
| Task drawer — Comments section | ✅ | Loads comments on drawer open; inline add (Ctrl+Enter or button); edit/delete own comments (pencil+trash icons); @mention displayed in content |

---

## Decisions (Resolved Questions)

| # | Decision |
|---|---|
| 1 | **DnD:** Use `@dnd-kit/core` in v1 ✅ |
| 2 | **OAuth buttons:** Removed — login page has email/password only ✅ |
| 3 | **Chat:** Future enhancement — not built in v1 ✅ |
| 4 | **File uploads:** Deferred — not in initial kanban inline form |
| 5 | **Dashboard KPIs:** "Project Health" and "Sprint Velocity" removed; Active Issues + System Uptime ✅ |
| 6 | **Mobile nav:** Out of scope for v1 — desktop-only fixed sidebar ✅ |
| 7 | **Avatars:** Initials-based fallback when no avatar URL ✅ |

---

## What to Build Next (Recommended Order)

1. ✅ Install and configure Tailwind CSS v3 with all design tokens
2. ✅ Install React Router, Axios, Zustand, React Hook Form, @dnd-kit/core
3. ✅ Set up `index.html` with Google Fonts (Geist, JetBrains Mono, Material Symbols)
4. ✅ Build UI primitives: Button, Input, Textarea, Checkbox, Select, Modal, Badge, Avatar, ProgressBar, KanbanCard
5. ✅ Build SideNavBar + TopNavBar + AppLayout shared layout
6. ✅ Build Login + Register + ForgotPassword + ResetPassword + VerifyEmail pages
7. ✅ Wire up auth API layer + Zustand auth store
8. ✅ Build ProtectedRoute + app router
9. ✅ Build Dashboard page (animated KPI counters, Recent Activity, Your Queue, Today's Schedule)
10. ✅ Build Projects list page + Create Project modal (wired in AppLayout)
11. ✅ Build Project Overview page (bento grid: Priority Tasks, Team, Task Stats)
12. ✅ Build Kanban Board page + KanbanCard + task drawer + dnd-kit drag-and-drop
13. ✅ Build Settings / Profile page (change password, sign out) — hardened 2026-07-20: focus-based
    profile re-sync, resend cooldown, mirrored password rules, resilient logout, ARIA pass
14. ❌ (Future) Chat page — deferred to v2
15. ❌ (Future) File attachments on tasks
16. ✅ Add member to project from UI — invite form in Team panel (Project Overview), visible to admin+project_admin
17. ✅ Task filters / search on board — `BoardFilterBar` component: debounced title search, priority chip filters, assignee dropdown; client-side filtering of task list
18. ✅ Dashboard KPIs — wired to real backend; 4-col KPI row (Open Tasks, In Progress, Overdue, Completed) aggregated across all user projects via `GET /projects/:id/dashboard`
19. ✅ Notifications — bell polls every 30s, unread badge, `NotificationPanel` dropdown with mark-read; store: `notificationStore.js`; API: `notifications.api.js`
20. ✅ Task Comments — per-task comment threads in drawer; `comments.api.js`; @mention support triggers backend notifications; owner/privileged edit+delete
21. ✅ Calendar View — `CalendarView.jsx`; monthly grid; task chips by due date colored by priority; task detail popover; prev/next navigation; "Calendar" tab in TopNavBar sub-nav
22. ✅ Quick Add Task — assignee selector added to the Todo-column inline form; defaults to the current user (zero-click), reuses already-loaded `members` (no extra API call, no board refetch), sends `assignee` in the `createTask` payload so quick-added tasks flow into My Tasks / Upcoming Deadlines / personal dashboard and fire the backend assignment notification. Empty `catch {}` in `handleAddTask` replaced with `console.error`.
23. ✅ **Unified Dashboard redesign** — `DashboardPage` rewritten as a thin orchestrator making **one** `GET /api/v1/dashboard` call (N+1 loop and all mock data removed). Modular widgets in `components/dashboard/` (SummaryGrid, MyTasksList, RecentActivityFeed w/ Load More, UpcomingDeadlines, ProjectProgressGrid w/ health dots, TeamWorkload, AnalyticsSection, CalendarPreview, NotificationsWidget, QuickActions), each with its own Skeleton + empty state. Analytics via **Recharts** (`components/dashboard/charts/`, themed to the palette). New `ui/Skeleton` + `ui/CommandPalette` (real ⌘K global search + quick actions). Quick-action modals (Create Project/Task/Invite/Note) in `context/QuickActionsContext.jsx`, reusing existing endpoints. `search.api.js` + `dashboard.api.js` added. Dead nav links removed from `SideNavBar`. See `docs/dashboardchanges.md`.
