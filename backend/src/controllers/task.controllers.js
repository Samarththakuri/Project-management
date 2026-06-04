import { Task } from "../model/task.model.js";
import { Subtask } from "../model/subtask.models.js";
import { ProjectMember } from "../model/projectmember.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

const getProjectTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const tasks = await Task.find({ project: projectId }).populate(
    "assignedTo",
    "username email avatar",
  );

  return res
    .status(200)
    .json(new ApiResponse(200, tasks, "Tasks fetched successfully"));
});

const createTask = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { title, description, assignedTo, status } = req.body;

  if (assignedTo) {
    const isMember = await ProjectMember.findOne({ project: projectId, user: assignedTo });
    if (!isMember) {
      throw new ApiError(400, "Assigned user is not a member of this project");
    }
  }

  const attachments = (req.files || []).map((file) => ({
    url: `/uploads/tasks/${file.filename}`,
    mimetype: file.mimetype,
    size: file.size,
  }));

  const task = await Task.create({
    title,
    description,
    project: projectId,
    assignedTo,
    assignedBy: req.user._id,
    status,
    attachments,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, task, "Task created successfully"));
});

const getTaskById = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  const task = await Task.findOne({ _id: taskId, project: projectId })
    .populate("assignedTo", "username email avatar")
    .populate("assignedBy", "username email avatar");

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const subtasks = await Subtask.find({ task: taskId }).populate(
    "createdBy",
    "username email avatar",
  );

  return res
    .status(200)
    .json(new ApiResponse(200, { task, subtasks }, "Task fetched successfully"));
});

const updateTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { title, description, assignedTo, status } = req.body;

  if (assignedTo !== undefined) {
    const isMember = await ProjectMember.findOne({ project: projectId, user: assignedTo });
    if (!isMember) {
      throw new ApiError(400, "Assigned user is not a member of this project");
    }
  }

  const updateFields = {};
  if (title !== undefined) updateFields.title = title;
  if (description !== undefined) updateFields.description = description;
  if (assignedTo !== undefined) updateFields.assignedTo = assignedTo;
  if (status !== undefined) updateFields.status = status;

  const task = await Task.findOneAndUpdate(
    { _id: taskId, project: projectId },
    { $set: updateFields },
    { new: true, runValidators: true },
  );

  if (!task) {
    throw new ApiError(404, "Task not found");
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

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Task deleted successfully"));
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
  createSubtask,
  updateSubtask,
  deleteSubtask,
};
