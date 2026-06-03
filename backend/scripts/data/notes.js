export const getNotesData = (users, projects) => [
  {
    project: projects[0]._id,
    createdBy: users[0]._id,
    content: "Sprint 1 goal: finish auth and project CRUD endpoints.",
  },
  {
    project: projects[0]._id,
    createdBy: users[1]._id,
    content: "Using Zod for all request validation going forward.",
  },
  {
    project: projects[1]._id,
    createdBy: users[1]._id,
    content: "Design system: use Tailwind + shadcn/ui components.",
  },
];
