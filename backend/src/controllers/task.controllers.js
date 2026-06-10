import { Task } from "../model/task.model.js";
import { Subtask } from "../model/subtask.models.js";
import { ProjectMember } from "../model/projectmember.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ActivityActionEnum, NotificationTypeEnum } from "../utils/constants.js";
import { logActivity } from "../utils/activity.js";
import { sendNotification } from "../utils/notification.js";

const POPULATE_USER = "username fullName email avatar";

const getProjectTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const tasks = await Task.find({ project: projectId })
    .populate("assignee", POPULATE_USER)
    .sort({ order: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, tasks, "Tasks fetched successfully"));
});

const createTask = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { title, description, assignee, status, priority, dueDate } = req.body;

  if (assignee) {
    const isMember = await ProjectMember.findOne({ project: projectId, user: assignee });
    if (!isMember) {
      throw new ApiError(400, "Assigned user is not a member of this project");
    }
  }

  const taskStatus = status || "todo";
  const order = await Task.countDocuments({ project: projectId, status: taskStatus });

  const attachments = (req.files || []).map((file) => ({
    url: `/uploads/tasks/${file.filename}`,
    mimetype: file.mimetype,
    size: file.size,
  }));

  const task = await Task.create({
    title,
    description,
    project: projectId,
    assignee,
    assigner: req.user._id,
    status: taskStatus,
    priority,
    dueDate: dueDate || null,
    order,
    attachments,
  });

  logActivity(req.user._id, ActivityActionEnum.TASK_CREATED, projectId, "task", task._id, { title: task.title });

  if (assignee) {
    sendNotification(
      assignee,
      req.user._id,
      projectId,
      NotificationTypeEnum.TASK_ASSIGNED,
      `${req.user.fullName || req.user.username} assigned you to "${task.title}"`,
    );
  }

  return res
    .status(201)
    .json(new ApiResponse(201, task, "Task created successfully"));
});

const getTaskById = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  const task = await Task.findOne({ _id: taskId, project: projectId })
    .populate("assignee", POPULATE_USER)
    .populate("assigner", POPULATE_USER);

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const subtasks = await Subtask.find({ task: taskId }).populate(
    "createdBy",
    POPULATE_USER,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, { task, subtasks }, "Task fetched successfully"));
});

const updateTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { title, description, assignee, status, priority, dueDate } = req.body;

  if (assignee !== undefined) {
    const isMember = await ProjectMember.findOne({ project: projectId, user: assignee });
    if (!isMember) {
      throw new ApiError(400, "Assigned user is not a member of this project");
    }
  }

  const existingTask = await Task.findOne({ _id: taskId, project: projectId }).select("assignee");

  const updateFields = {};
  if (title !== undefined) updateFields.title = title;
  if (description !== undefined) updateFields.description = description;
  if (assignee !== undefined) updateFields.assignee = assignee;
  if (status !== undefined) updateFields.status = status;
  if (priority !== undefined) updateFields.priority = priority;
  if (dueDate !== undefined) updateFields.dueDate = dueDate || null;

  const task = await Task.findOneAndUpdate(
    { _id: taskId, project: projectId },
    { $set: updateFields },
    { new: true, runValidators: true },
  );

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  logActivity(req.user._id, ActivityActionEnum.TASK_UPDATED, projectId, "task", task._id, { title: task.title });

  if (assignee !== undefined && String(assignee) !== String(existingTask?.assignee)) {
    sendNotification(
      assignee,
      req.user._id,
      projectId,
      NotificationTypeEnum.TASK_ASSIGNED,
      `${req.user.fullName || req.user.username} assigned you to "${task.title}"`,
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task updated successfully"));
});

const deleteTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  const task = await Task.findOneAndDelete({ _id: taskId, project: projectId });

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  await Subtask.deleteMany({ task: taskId });

  logActivity(req.user._id, ActivityActionEnum.TASK_DELETED, projectId, "task", taskId, { title: task.title });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Task deleted successfully"));
});

const reorderTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { tasks } = req.body;

  await Promise.all(
    tasks.map(({ taskId, order }) =>
      Task.findOneAndUpdate(
        { _id: taskId, project: projectId },
        { $set: { order } },
      ),
    ),
  );

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tasks reordered successfully"));
});

const createSubtask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { title } = req.body;

  const task = await Task.findOne({ _id: taskId, project: projectId });
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const subtask = await Subtask.create({
    title,
    task: taskId,
    createdBy: req.user._id,
  });

  logActivity(req.user._id, ActivityActionEnum.SUBTASK_CREATED, projectId, "subtask", subtask._id, { title: subtask.title });

  return res
    .status(201)
    .json(new ApiResponse(201, subtask, "Subtask created successfully"));
});

const updateSubtask = asyncHandler(async (req, res) => {
  const { projectId, subTaskId } = req.params;
  const { title, isCompleted } = req.body;

  const subtask = await Subtask.findById(subTaskId).populate("task");
  if (!subtask) {
    throw new ApiError(404, "Subtask not found");
  }

  if (!subtask.task.project.equals(projectId)) {
    throw new ApiError(403, "Subtask does not belong to this project");
  }

  const updateFields = {};
  if (title !== undefined) updateFields.title = title;
  if (isCompleted !== undefined) updateFields.isCompleted = isCompleted;

  const updated = await Subtask.findByIdAndUpdate(
    subTaskId,
    { $set: updateFields },
    { new: true },
  );

  if (isCompleted !== undefined) {
    logActivity(req.user._id, ActivityActionEnum.SUBTASK_COMPLETED, projectId, "subtask", updated._id, { isCompleted: updated.isCompleted });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Subtask updated successfully"));
});

const deleteSubtask = asyncHandler(async (req, res) => {
  const { projectId, subTaskId } = req.params;

  const subtask = await Subtask.findById(subTaskId).populate("task");
  if (!subtask) {
    throw new ApiError(404, "Subtask not found");
  }

  if (!subtask.task.project.equals(projectId)) {
    throw new ApiError(403, "Subtask does not belong to this project");
  }

  await Subtask.findByIdAndDelete(subTaskId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Subtask deleted successfully"));
});

export {
  getProjectTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  reorderTasks,
  createSubtask,
  updateSubtask,
  deleteSubtask,
};
