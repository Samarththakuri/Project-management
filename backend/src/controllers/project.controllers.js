import { Project } from "../model/project.models.js";
import { ProjectMember } from "../model/projectmember.models.js";
import { Task } from "../model/task.model.js";
import { Subtask } from "../model/subtask.models.js";
import { Note } from "../model/note.models.js";
import { User } from "../model/user.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  UserRolesEnum,
  ActivityActionEnum,
  NotificationTypeEnum,
} from "../utils/constants.js";
import { logActivity } from "../utils/activity.js";
import { sendNotification } from "../utils/notification.js";

const getProjects = asyncHandler(async (req, res) => {
  const projects = await ProjectMember.aggregate([
    { $match: { user: req.user._id } },
    {
      $lookup: {
        from: "projects",
        localField: "project",
        foreignField: "_id",
        as: "projectDetails",
      },
    },
    { $unwind: "$projectDetails" },
    {
      $lookup: {
        from: "projectmembers",
        localField: "project",
        foreignField: "project",
        as: "allMembers",
      },
    },
    {
      $addFields: {
        "projectDetails.memberCount": { $size: "$allMembers" },
        "projectDetails.role": "$role",
      },
    },
    { $replaceRoot: { newRoot: "$projectDetails" } },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, projects, "Projects fetched successfully"));
});

const createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const project = await Project.create({
    name,
    description,
    createdBy: req.user._id,
  });

  await ProjectMember.create({
    user: req.user._id,
    project: project._id,
    role: UserRolesEnum.ADMIN,
  });

  logActivity(
    req.user._id,
    ActivityActionEnum.PROJECT_CREATED,
    project._id,
    "project",
    project._id,
    { name: project.name },
  );

  return res
    .status(201)
    .json(new ApiResponse(201, project, "Project created successfully"));
});

const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, project, "Project fetched successfully"));
});

const updateProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const project = await Project.findByIdAndUpdate(
    req.params.projectId,
    { $set: { name, description } },
    { new: true, runValidators: true },
  );

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  logActivity(
    req.user._id,
    ActivityActionEnum.PROJECT_UPDATED,
    project._id,
    "project",
    project._id,
    { name: project.name },
  );

  return res
    .status(200)
    .json(new ApiResponse(200, project, "Project updated successfully"));
});

const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findByIdAndDelete(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const projectTasks = await Task.find({ project: projectId }).select("_id");
  const taskIds = projectTasks.map((t) => t._id);

  await Promise.all([
    ProjectMember.deleteMany({ project: projectId }),
    Task.deleteMany({ project: projectId }),
    Subtask.deleteMany({ task: { $in: taskIds } }),
    Note.deleteMany({ project: projectId }),
  ]);

  logActivity(
    req.user._id,
    ActivityActionEnum.PROJECT_DELETED,
    projectId,
    "project",
    projectId,
    { name: project.name },
  );

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Project deleted successfully"));
});

const getProjectMembers = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const members = await ProjectMember.find({ project: projectId }).populate(
    "user",
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry",
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, members, "Project members fetched successfully"),
    );
});

const addProjectMember = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { email, role } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const existingMember = await ProjectMember.findOne({
    project: projectId,
    user: user._id,
  });
  if (existingMember) {
    throw new ApiError(409, "User is already a member of this project");
  }

  const member = await ProjectMember.create({
    user: user._id,
    project: projectId,
    role: role || UserRolesEnum.MEMBER,
  });

  await member.populate(
    "user",
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry",
  );

  logActivity(
    req.user._id,
    ActivityActionEnum.MEMBER_ADDED,
    projectId,
    "member",
    user._id,
    { email: user.email, role },
  );

  const project = await Project.findById(projectId).select("name");
  if (project) {
    sendNotification(
      user._id,
      req.user._id,
      projectId,
      NotificationTypeEnum.ADDED_TO_PROJECT,
      `${req.user.fullName || req.user.username} added you to "${project.name}" as ${role}`,
    );
  }

  return res
    .status(201)
    .json(new ApiResponse(201, member, "Member added successfully"));
});

const updateMemberRole = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;
  const { role } = req.body;

  const member = await ProjectMember.findOneAndUpdate(
    { project: projectId, user: userId },
    { $set: { role } },
    { new: true },
  );

  if (!member) {
    throw new ApiError(404, "Member not found in this project");
  }

  logActivity(
    req.user._id,
    ActivityActionEnum.MEMBER_ROLE_CHANGED,
    projectId,
    "member",
    member.user,
    { role },
  );

  const project = await Project.findById(projectId).select("name");
  if (project) {
    sendNotification(
      userId,
      req.user._id,
      projectId,
      NotificationTypeEnum.ROLE_CHANGED,
      `${req.user.fullName || req.user.username} changed your role in "${project.name}" to ${role}`,
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, member, "Member role updated successfully"));
});

const removeProjectMember = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;

  const member = await ProjectMember.findOneAndDelete({
    project: projectId,
    user: userId,
  });

  if (!member) {
    throw new ApiError(404, "Member not found in this project");
  }

  logActivity(
    req.user._id,
    ActivityActionEnum.MEMBER_REMOVED,
    projectId,
    "member",
    member.user,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Member removed successfully"));
});

export {
  getProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  updateMemberRole,
  removeProjectMember,
};
