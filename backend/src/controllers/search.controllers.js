import { Task } from "../model/task.model.js";
import { Note } from "../model/note.models.js";
import { ProjectMember } from "../model/projectmember.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

const POPULATE_USER = "username fullName email avatar";

const searchProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { q, type = "all", status, priority } = req.query;

  if (!q || !q.trim()) {
    throw new ApiError(400, "Search query is required");
  }

  const isMember = await ProjectMember.findOne({
    project: projectId,
    user: req.user._id,
  });
  if (!isMember) {
    throw new ApiError(403, "You are not a member of this project");
  }

  const searchTerm = q.trim();
  const results = { tasks: [], notes: [] };

  if (type === "task" || type === "all") {
    const taskFilter = {
      project: projectId,
      $text: { $search: searchTerm },
    };
    if (status) taskFilter.status = status;
    if (priority) taskFilter.priority = priority;

    results.tasks = await Task.find(taskFilter, { score: { $meta: "textScore" } })
      .populate("assignee", POPULATE_USER)
      .populate("assigner", POPULATE_USER)
      .sort({ score: { $meta: "textScore" } });
  }

  if (type === "note" || type === "all") {
    results.notes = await Note.find(
      { project: projectId, $text: { $search: searchTerm } },
      { score: { $meta: "textScore" } },
    )
      .populate("createdBy", POPULATE_USER)
      .sort({ score: { $meta: "textScore" } });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, results, "Search results fetched successfully"));
});

export { searchProject };
