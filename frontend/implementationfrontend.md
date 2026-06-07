# Frontend Implementation Status

Tracks what is done, what is in progress, and what still needs to be built for the Project Camp frontend.
Design reference: `DESIGN.md` (in this folder). Screenshots of all target screens are in the project root.

---

## Legend
- ✅ Complete
- ⚠️ Partial / in progress
- ❌ Not started

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
│   ├── axios.js          # Base Axios instance with interceptors
│   ├── auth.api.js
│   ├── projects.api.js
│   ├── tasks.api.js
│   └── notes.api.js
├── components/
│   ├── layout/
│   │   ├── SideNavBar.jsx
│   │   └── TopNavBar.jsx
│   ├── ui/               # Reusable primitives (Button, Input, Badge, Modal, etc.)
│   └── [feature]/        # Feature-scoped components (TaskCard, KanbanColumn, etc.)
├── pages/
│   ├── auth/
│   │   ├── LoginPage.jsx
│   │   └── RegisterPage.jsx
│   ├── dashboard/
│   │   └── DashboardPage.jsx
│   ├── projects/
│   │   ├── ProjectsPage.jsx       # Projects list / workspace overview
│   │   ├── ProjectOverviewPage.jsx
│   │   └── KanbanBoardPage.jsx
│   └── chat/
│       └── ChatPage.jsx
├── store/
│   ├── authStore.js      # Zustand: current user, isAuthenticated
│   └── uiStore.js        # Zustand: sidebar open, active modal
├── hooks/                # Custom hooks (useAuth, useProject, etc.)
├── router/
│   └── index.jsx         # React Router routes + ProtectedRoute wrapper
├── App.jsx
├── main.jsx
└── index.css             # Tailwind directives + custom scrollbar CSS
```

---

## Pages

### Auth Pages

| Page | Route | Status | Notes |
|---|---|---|---|
| Login | `/login` | ❌ | Split-screen layout: brand left, form right. Email + password fields, "Forgot?" link, corner accent decorations. No OAuth buttons. |
| Register | `/register` | ❌ | Same split-screen layout. Fields: Full Name, Work Email, Password, Terms checkbox. "INITIALIZE SEQUENCE" submit button |
| Forgot Password | `/forgot-password` | ❌ | Simple single-column form; POST to `/api/v1/auth/forgot-password` |
| Reset Password | `/reset-password/:token` | ❌ | New password + confirm; POST to `/api/v1/auth/reset-password/:resetToken` |
| Verify Email | `/verify-email/:token` | ❌ | Auto-calls GET `/api/v1/auth/verify-email/:verificationToken` on mount; shows success/error state |

### App Pages (Protected — require auth)

| Page | Route | Status | Notes |
|---|---|---|---|
| Dashboard | `/dashboard` | ❌ | KPI cards (Active Issues, System Uptime — Project Health and Sprint Velocity removed), Recent Activity feed, Your Queue (tasks), Today's Schedule. Animated number counters on load; layout adjusted to fill removed KPI space. |
| Projects List | `/projects` | ❌ | Grid of project cards with name, description, member count, progress bar. "New Project" modal |
| Project Overview | `/projects/:projectId` | ❌ | Bento grid: Priority Tasks, Files, Team Activity snapshot. Project header with progress bar + team avatars. (Pulse/velocity chart removed.) |
| Kanban Board | `/projects/:projectId/board` | ❌ | Three columns: Todo, In Progress, Done. Task cards with priority badge, ID, subtask count, assignee avatar. Right drawer for task detail (description, subtasks, metadata). "Add Task" button at bottom of Todo column |
| Chat | `/projects/:projectId/chat` | ❌ | Future enhancement — skip for v1. |
| Settings | `/settings` | ❌ | User profile, change password, preferences |

---

## Shared Components

### SideNavBar
| Item | Status | Notes |
|---|---|---|
| Logo + brand name | ✅ | "Project Camp" + "Technical Operations" subtitle |
| "New Project" CTA button | ✅ | Calls `onNewProject` prop; modal placeholder until step 10 |
| Nav links (Dashboard, Projects, Team, Calendar, Reports) | ✅ | Active state via NavLink |
| Footer links (Settings, Help) | ✅ | Same hover behaviour as main nav |
| Fixed 260px width, full height | ✅ | |
| Mobile nav | — | Not in v1 scope |

### TopNavBar
| Item | Status | Notes |
|---|---|---|
| Horizontal sub-nav tabs (Overview / Board / Files / Chat) | ✅ | Only shown when inside `/projects/:projectId/*`; active bottom border |
| Notifications bell | ✅ | Static for now |
| Command palette shortcut button (⌘K) | ✅ | Static display |
| User avatar | ✅ | Reads from Zustand authStore; initials fallback |

### UI Primitives
| Component | Status | Notes |
|---|---|---|
| Button | ✅ | Variants: primary, secondary, ghost. Sizes: sm, md, lg. Zero border-radius |
| Input | ✅ | With icon support, label, error message, focus ring teal, zero radius |
| Textarea | ✅ | Auto-resize via scrollHeight |
| Checkbox | ✅ | Zero radius, teal checked state, peer trick for custom visual |
| Select | ✅ | Styled native select, zero radius, expand_more icon |
| Modal | ✅ | Backdrop blur, corner accent decorations, Escape to close, portal |
| Badge/Status chip | ✅ | Mono font, uppercase, variants: error, warning, primary, default |
| Avatar | ✅ | Square (zero radius), grayscale → color on hover; initials-based fallback with hashed color |
| ProgressBar | ✅ | 2px height, teal fill, clamped 0–100 |
| KanbanCard | ❌ | Hover: `-translate-y-[2px]` + teal border glow |

---

## API Integration Layer

| Module | Endpoints covered | Status | Notes |
|---|---|---|---|
| Axios base | Interceptors: attach cookie automatically (withCredentials), handle 401 → redirect to login | ❌ | |
| `auth.api.js` | register, login, logout, currentUser, verifyEmail, forgotPassword, resetPassword, changePassword, refreshToken | ❌ | |
| `projects.api.js` | getProjects, createProject, getProjectById, updateProject, deleteProject, getMembers, addMember, updateMemberRole, removeMember | ❌ | |
| `tasks.api.js` | getProjectTasks, createTask, getTaskById, updateTask, deleteTask, createSubtask, updateSubtask, deleteSubtask | ❌ | |
| `notes.api.js` | getProjectNotes, createNote, getNoteById, updateNote, deleteNote | ❌ | |

---

## Auth Flow

| Item | Status | Notes |
|---|---|---|
| ProtectedRoute wrapper | ❌ | Reads Zustand auth store; redirects to `/login` if not authenticated |
| Persist auth state | ❌ | On app load, call `GET /api/v1/auth/current-user`; populate store or clear it |
| Axios 401 interceptor | ❌ | Try `POST /api/v1/auth/refresh-token`; on failure clear store + redirect to `/login` |
| Redirect after login | ❌ | Go to `/dashboard` on success |
| Logout | ❌ | POST `/api/v1/auth/logout`, clear Zustand store, redirect to `/login` |

---

## Tailwind Configuration

Tailwind must be configured with all DESIGN.md tokens. Key items:

```js
// tailwind.config.js
theme: {
  extend: {
    colors: { /* all tokens from DESIGN.md */ },
    borderRadius: { DEFAULT: '0px', lg: '0px', xl: '0px', full: '9999px' },
    fontFamily: {
      'headline-sm': ['Geist'], 'headline-md': ['Geist'], 'headline-lg': ['Geist'],
      'body-md': ['Geist'], 'body-lg': ['Geist'], 'mono-label': ['JetBrains Mono']
    },
    fontSize: { /* all tokens from DESIGN.md */ },
    spacing: { 'sidebar-width': '260px', 'gutter': '16px', 'margin-desktop': '32px', 'margin-mobile': '16px' }
  }
}
```

Status: ❌

---

## Create Project Modal

| Item | Status | Notes |
|---|---|---|
| Modal markup + open/close logic | ❌ | Triggered by "New Project" button in sidebar |
| Fields: Project Name, Assign to Member, Description, Subtasks | ❌ | |
| POST to `/api/v1/projects/` | ❌ | |
| Refresh projects list on success | ❌ | Re-fetch via useEffect trigger or state update |

---

## Kanban Board Interactions

| Item | Status | Notes |
|---|---|---|
| Render columns from task status (todo / in_progress / done) | ❌ | |
| Task card click → open right drawer | ❌ | |
| Drawer: task title, assignee, priority, due date, description, subtasks | ❌ | |
| Subtask checkbox toggle → PATCH subtask | ❌ | |
| Drag-and-drop to change task status | ❌ | Use `@dnd-kit/core` in v1 |
| Add Task button → inline form or modal | ❌ | Includes file picker for attachments (multipart upload to backend) |

---

## Decisions (Resolved Questions)

| # | Decision |
|---|---|
| 1 | **DnD:** Use `@dnd-kit/core` in v1 |
| 2 | **OAuth buttons:** Removed — login page has email/password only |
| 3 | **Chat:** Future enhancement — not built in v1 |
| 4 | **File uploads:** File picker wired on task creation form (multipart upload) |
| 5 | **Dashboard KPIs:** "Project Health" and "Sprint Velocity" removed; layout fills space with remaining KPIs |
| 6 | **Mobile nav:** Out of scope for v1 — desktop-only fixed sidebar |
| 7 | **Avatars:** Initials-based fallback when no avatar URL |

---

## What to Build Next (Recommended Order)

1. ✅ Install and configure Tailwind CSS v3 with all design tokens
2. ✅ Install React Router, Axios, Zustand, React Hook Form, @dnd-kit/core
3. ✅ Set up `index.html` with Google Fonts (Geist, JetBrains Mono, Material Symbols)
4. ✅ Build UI primitives: Button, Input, Textarea, Checkbox, Select, Modal, Badge, Avatar, ProgressBar
5. ✅ Build SideNavBar + TopNavBar shared layout
6. ❌ Build Login + Register pages (static, no API yet)
7. ❌ Wire up auth API layer + Zustand auth store
8. ❌ Build ProtectedRoute + app router
9. ❌ Build Dashboard page (static data first, then wire to API)
10. ❌ Build Projects list page + Create Project modal
11. ❌ Build Kanban Board page + Task drawer
12. ❌ Build Settings / Profile page
13. (Future) Chat page — deferred to v2
