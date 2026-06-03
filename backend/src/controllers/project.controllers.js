import { Project } from "../model/project.models.js";
import { ProjectMember } from "../model/projectmember.models.js";
import { User } from "../model/user.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { UserRolesEnum } from "../utils/constants.js";

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

  await ProjectMember.deleteMany({ project: projectId });

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
    .json(new ApiResponse(200, members, "Project members fetched successfully"));
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
    role,
  });

  await member.populate(
    "user",
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry",
  );

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
