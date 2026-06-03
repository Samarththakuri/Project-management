export const getProjectsData = (users) => [
  {
    name: "Project Camp",
    description: "Internal project management tool",
    createdBy: users[0]._id,
  },
  {
    name: "Marketing Site Redesign",
    description: "Revamp the company marketing website",
    createdBy: users[1]._id,
  },
];

export const getMembersData = (users, projects) => [
  { user: users[0]._id, project: projects[0]._id, role: "admin" },
  { user: users[1]._id, project: projects[0]._id, role: "project_admin" },
  { user: users[2]._id, project: projects[0]._id, role: "member" },
  { user: users[1]._id, project: projects[1]._id, role: "admin" },
  { user: users[2]._id, project: projects[1]._id, role: "member" },
  { user: users[3]._id, project: projects[1]._id, role: "member" },
];
