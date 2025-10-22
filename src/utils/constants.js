export const UserRolesEnum = {
  ADMIN: "admin",
  PROJECT_ADMIN: "project_admin",
  MEMBER: "member",
};
export const AvialableUserRole = Object.values(UserRolesEnum);
export const TasksStatusEnum = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
};
// The Object.values() method takes all values from an object and returns them as an array.
// This means we are exporting a constant variable called AvailableTasksStatus that holds this array of valid statuses.

export const AvialableTasksStatus = Object.values(TasksStatusEnum);
