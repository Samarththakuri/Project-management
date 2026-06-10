export const getNotesData = (users, projects) => [
  // Project Camp notes
  {
    project: projects[0]._id,
    createdBy: users[0]._id,
    content: "Sprint 1 goal: finish auth and project CRUD endpoints. Target: end of week.",
  },
  {
    project: projects[0]._id,
    createdBy: users[1]._id,
    content: "Using Zod for all request validation. express-validator has been removed.",
  },
  {
    project: projects[0]._id,
    createdBy: users[0]._id,
    content: "Role model: admin (project creator), project_admin (trusted co-admin), member (read + subtask toggle). Roles are project-scoped — no system-level roles on User.",
  },

  // Marketing Site Redesign notes
  {
    project: projects[1]._id,
    createdBy: users[1]._id,
    content: "Design system: Tailwind CSS with custom token config. Zero border-radius throughout.",
  },
  {
    project: projects[1]._id,
    createdBy: users[1]._id,
    content: "Launch target: Q3. Homepage and product pages must be live before then. Blog migration can follow in Q4.",
  },
];
