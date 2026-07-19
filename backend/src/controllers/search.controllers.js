import { Task } from "../model/task.model.js";
import { Project } from "../model/project.models.js";
import { ProjectMember } from "../model/projectmember.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

/**
 * Escape a user-supplied string so it can be safely used inside a RegExp.
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Global search across every project the user belongs to. Powers the ⌘K
 * command palette. Searches projects, tasks, and members.
 */
const searchAll = asyncHandler(async (req, res) => {
  const { q, type = "all" } = req.query;

  if (!q || !q.trim()) {
    throw new ApiError(400, "Search query is required");
  }

  const term = q.trim();
  const regex = new RegExp(escapeRegex(term), "i");

  const memberships = await ProjectMember.find({ user: req.user._id })
    .select("project")
    .lean();
  const projectIds = memberships.map((m) => m.project);

  const results = { projects: [], tasks: [], members: [] };

  if (!projectIds.length) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, results, "Search results fetched successfully"),
      );
  }

  const wants = (t) => type === "all" || type === t;

  const [projects, tasks, memberDocs] = await Promise.all([
    wants("project")
      ? Project.find({
          _id: { $in: projectIds },
          $or: [{ name: regex }, { description: regex }],
        })
          .select("name description")
          .limit(10)
          .lean()
      : [],
    wants("task")
      ? Task.find({ project: { $in: projectIds }, $text: { $search: term } })
          .select("title status priority project")
          .populate("project", "name")
          .limit(10)
          .lean()
      : [],
    wants("member")
      ? ProjectMember.find({ project: { $in: projectIds } })
          .populate({
            path: "user",
            match: {
              $or: [{ fullName: regex }, { username: regex }, { email: regex }],
            },
            select: "fullName username email avatar",
          })
          .lean()
      : [],
  ]);

  results.projects = projects;
  results.tasks = tasks;
  // De-duplicate members (a user may belong to several projects) and drop
  // memberships whose populated user did not match the regex.
  const seen = new Set();
  results.members = (memberDocs || [])
    .map((m) => m.user)
    .filter((u) => {
      if (!u) return false;
      const id = String(u._id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, 10);

  return res
    .status(200)
    .json(new ApiResponse(200, results, "Search results fetched successfully"));
});

export { searchAll };
