// Note: Task schema has a typo — field is `descripton` (missing 'i'), used here exactly as defined.
export const getTasksData = (users, projects) => [
  {
    title: "Set up CI/CD pipeline",
    descripton: "Configure GitHub Actions for automated testing and deployment",
    project: projects[0]._id,
    assignedTo: users[1]._id,
    assignedBy: users[0]._id,
    status: "in_progress",
  },
  {
    title: "Design database schema",
    descripton: "Finalize ERD and create all Mongoose models",
    project: projects[0]._id,
    assignedTo: users[2]._id,
    assignedBy: users[0]._id,
    status: "done",
  },
  {
    title: "Write API documentation",
    descripton: "Document all endpoints with request and response examples",
    project: projects[0]._id,
    assignedTo: users[1]._id,
    assignedBy: users[0]._id,
    status: "todo",
  },
  {
    title: "Homepage wireframes",
    descripton: "Create Figma wireframes for the new homepage layout",
    project: projects[1]._id,
    assignedTo: users[2]._id,
    assignedBy: users[1]._id,
    status: "done",
  },
  {
    title: "SEO audit",
    descripton: "Run Lighthouse and fix critical SEO issues across all pages",
    project: projects[1]._id,
    assignedTo: users[3]._id,
    assignedBy: users[1]._id,
    status: "in_progress",
  },
];

export const getSubtasksData = (users, tasks) => [
  {
    title: "Add lint step to workflow",
    task: tasks[0]._id,
    createdBy: users[0]._id,
    isCompleted: true,
  },
  {
    title: "Add test step to workflow",
    task: tasks[0]._id,
    createdBy: users[0]._id,
    isCompleted: false,
  },
  {
    title: "User model complete",
    task: tasks[1]._id,
    createdBy: users[0]._id,
    isCompleted: true,
  },
  {
    title: "Project model complete",
    task: tasks[1]._id,
    createdBy: users[0]._id,
    isCompleted: true,
  },
  {
    title: "Fix meta tags on blog pages",
    task: tasks[4]._id,
    createdBy: users[1]._id,
    isCompleted: false,
  },
];
