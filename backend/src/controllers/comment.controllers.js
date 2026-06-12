import { Comment } from "../model/comment.models.js";
import { Task } from "../model/task.model.js";
import { User } from "../model/user.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ActivityActionEnum, NotificationTypeEnum, UserRolesEnum } from "../utils/constants.js";
import { logActivity } from "../utils/activity.js";
import { sendNotification } from "../utils/notification.js";

async function resolveMentions(content, senderId, projectId) {
  const handles = [...new Set(content.match(/@(\w+)/g) ?? [])].map((h) => h.slice(1));
  if (!handles.length) return [];

  const users = await User.find({ username: { $in: handles } }).select("_id username");

  for (const user of users) {
    sendNotification(
      user._id,
      senderId,
      projectId,
      NotificationTypeEnum.MENTIONED_IN_COMMENT,
      `You were mentioned in a comment`,
    );
  }

  return users.map((u) => u._id);
}

const getTaskComments = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const comments = await Comment.find({ task: taskId })
    .populate("createdBy", "username fullName email avatar")
    .sort({ createdAt: 1 });

  return res.status(200).json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const createComment = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { content } = req.body;

  const task = await Task.findOne({ _id: taskId, project: projectId });
  if (!task) throw new ApiError(404, "Task not found");

  const mentionedUsers = await resolveMentions(content, req.user._id, projectId);

  const comment = await Comment.create({
    task: taskId,
    createdBy: req.user._id,
    content,
    mentions: mentionedUsers,
  });

  await comment.populate("createdBy", "username fullName email avatar");

  logActivity(req.user._id, ActivityActionEnum.COMMENT_CREATED, projectId, "comment", comment._id, { taskId });

  return res.status(201).json(new ApiResponse(201, comment, "Comment created successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { projectId, taskId, commentId } = req.params;
  const { content } = req.body;

  const comment = await Comment.findOne({ _id: commentId, task: taskId });
  if (!comment) throw new ApiError(404, "Comment not found");

  const isOwner = String(comment.createdBy) === String(req.user._id);
  const isPrivileged = [UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN].includes(req.projectMember?.role);

  if (!isOwner && !isPrivileged) {
    throw new ApiError(403, "You can only edit your own comments");
  }

  comment.content = content;
  comment.mentions = await resolveMentions(content, req.user._id, projectId);
  await comment.save();
  await comment.populate("createdBy", "username fullName email avatar");

  logActivity(req.user._id, ActivityActionEnum.COMMENT_UPDATED, projectId, "comment", comment._id, { taskId });

  return res.status(200).json(new ApiResponse(200, comment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { projectId, taskId, commentId } = req.params;

  const comment = await Comment.findOne({ _id: commentId, task: taskId });
  if (!comment) throw new ApiError(404, "Comment not found");

  const isOwner = String(comment.createdBy) === String(req.user._id);
  const isPrivileged = [UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN].includes(req.projectMember?.role);

  if (!isOwner && !isPrivileged) {
    throw new ApiError(403, "You can only delete your own comments");
  }

  await Comment.findByIdAndDelete(commentId);

  logActivity(req.user._id, ActivityActionEnum.COMMENT_DELETED, projectId, "comment", commentId, { taskId });

  return res.status(200).json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

export { getTaskComments, createComment, updateComment, deleteComment };
