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

export const ActivityActionEnum = {
  PROJECT_CREATED: "project.created",
  PROJECT_UPDATED: "project.updated",
  PROJECT_DELETED: "project.deleted",
  MEMBER_ADDED: "member.added",
  MEMBER_REMOVED: "member.removed",
  MEMBER_ROLE_CHANGED: "member.role_changed",
  TASK_CREATED: "task.created",
  TASK_UPDATED: "task.updated",
  TASK_DELETED: "task.deleted",
  SUBTASK_CREATED: "subtask.created",
  SUBTASK_COMPLETED: "subtask.completed",
  NOTE_CREATED: "note.created",
  NOTE_UPDATED: "note.updated",
  NOTE_DELETED: "note.deleted",
};
