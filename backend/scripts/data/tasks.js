export const getTasksData = (users, projects) => [
  // ── Project Camp ──────────────────────────────────────
  {
    title: "Set up CI/CD pipeline",
    description: "Configure GitHub Actions for automated testing and deployment",
    project: projects[0]._id,
    assignedTo: users[1]._id,
    assignedBy: users[0]._id,
    status: "in_progress",
  },
  {
    title: "Design database schema",
    description: "Finalize ERD and create all Mongoose models",
    project: projects[0]._id,
    assignedTo: users[2]._id,
    assignedBy: users[0]._id,
    status: "done",
  },
  {
    title: "Write API documentation",
    description: "Document all endpoints with request and response examples",
    project: projects[0]._id,
    assignedTo: users[1]._id,
    assignedBy: users[0]._id,
    status: "todo",
  },
  {
    title: "Implement JWT auth",
    description: "Access token + refresh token flow with httpOnly cookies",
    project: projects[0]._id,
    assignedTo: users[0]._id,
    assignedBy: users[0]._id,
    status: "done",
  },
  {
    title: "Role-based access control",
    description: "verifyProjectRole middleware for admin / project_admin / member",
    project: projects[0]._id,
    assignedTo: users[1]._id,
    assignedBy: users[0]._id,
    status: "done",
  },
  {
    title: "Build Kanban board UI",
    description: "Drag-and-drop columns with dnd-kit, task cards, and detail drawer",
    project: projects[0]._id,
    assignedTo: users[2]._id,
    assignedBy: users[0]._id,
    status: "in_progress",
  },
  {
    title: "Email verification flow",
    description: "Send verification link on register, handle token expiry",
    project: projects[0]._id,
    assignedTo: users[0]._id,
    assignedBy: users[0]._id,
    status: "todo",
  },

  // ── Marketing Site Redesign ───────────────────────────
  {
    title: "Homepage wireframes",
    description: "Create Figma wireframes for the new homepage layout",
    project: projects[1]._id,
    assignedTo: users[2]._id,
    assignedBy: users[1]._id,
    status: "done",
  },
  {
    title: "SEO audit",
    description: "Run Lighthouse and fix critical SEO issues across all pages",
    project: projects[1]._id,
    assignedTo: users[3]._id,
    assignedBy: users[1]._id,
    status: "in_progress",
  },
  {
    title: "Migrate blog to new CMS",
    description: "Move all blog posts from WordPress to Contentful",
    project: projects[1]._id,
    assignedTo: users[2]._id,
    assignedBy: users[1]._id,
    status: "todo",
  },
  {
    title: "Update brand color tokens",
    description: "Apply new palette across Tailwind config and all component styles",
    project: projects[1]._id,
    assignedTo: users[3]._id,
    assignedBy: users[1]._id,
    status: "todo",
  },
];

export const getSubtasksData = (users, tasks) => [
  // CI/CD pipeline subtasks
  { title: "Add lint step to workflow", task: tasks[0]._id, createdBy: users[0]._id, isCompleted: true },
  { title: "Add test step to workflow", task: tasks[0]._id, createdBy: users[0]._id, isCompleted: false },
  { title: "Configure deployment to staging", task: tasks[0]._id, createdBy: users[0]._id, isCompleted: false },

  // Database schema subtasks
  { title: "User model complete", task: tasks[1]._id, createdBy: users[0]._id, isCompleted: true },
  { title: "Project + ProjectMember models complete", task: tasks[1]._id, createdBy: users[0]._id, isCompleted: true },
  { title: "Task + Subtask models complete", task: tasks[1]._id, createdBy: users[0]._id, isCompleted: true },

  // Kanban board subtasks
  { title: "Column layout with dnd-kit", task: tasks[5]._id, createdBy: users[1]._id, isCompleted: true },
  { title: "Task card component", task: tasks[5]._id, createdBy: users[1]._id, isCompleted: true },
  { title: "Task detail drawer", task: tasks[5]._id, createdBy: users[1]._id, isCompleted: false },
  { title: "Subtask toggle in drawer", task: tasks[5]._id, createdBy: users[1]._id, isCompleted: false },

  // SEO audit subtasks
  { title: "Fix meta tags on blog pages", task: tasks[8]._id, createdBy: users[1]._id, isCompleted: false },
  { title: "Add structured data to product pages", task: tasks[8]._id, createdBy: users[1]._id, isCompleted: false },
];
