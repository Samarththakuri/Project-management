import api from "./axios.js";

export const getProjectDashboard = (projectId) =>
  api.get(`/projects/${projectId}/dashboard`);
