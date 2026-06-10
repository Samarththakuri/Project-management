export const UserRolesEnum = {
  ADMIN: "admin",
  PROJECT_ADMIN: "project_admin",
  MEMBER: "member",
};
export const AvialableUserRole = Object.values(UserRolesEnum);
export const TasksStatusEnum = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  REVIEW: "review",
  DONE: "done",
};
export const AvialableTasksStatus = Object.values(TasksStatusEnum);

export const TaskPriorityEnum = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};
export const AvialableTaskPriority = Object.values(TaskPriorityEnum);

export const NotificationTypeEnum = {
  TASK_ASSIGNED: "task_assigned",
  ADDED_TO_PROJECT: "added_to_project",
  ROLE_CHANGED: "role_changed",
  MENTIONED_IN_NOTE: "mentioned_in_note",
};
export const AvailableNotificationTypes = Object.values(NotificationTypeEnum);

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
