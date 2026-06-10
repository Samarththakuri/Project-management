import { Task } from "../model/task.model.js";
import { ProjectMember } from "../model/projectmember.models.js";
import { Note } from "../model/note.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

const getProjectDashboard = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const now = new Date();

  const [
    totalTasks,
    completedTasks,
    inProgressTasks,
    todoTasks,
    overdueTasks,
    totalMembers,
    totalNotes,
  ] = await Promise.all([
    Task.countDocuments({ project: projectId }),
    Task.countDocuments({ project: projectId, status: "done" }),
    Task.countDocuments({ project: projectId, status: "in_progress" }),
    Task.countDocuments({ project: projectId, status: "todo" }),
    Task.countDocuments({
      project: projectId,
      dueDate: { $lt: now },
      status: { $ne: "done" },
    }),
    ProjectMember.countDocuments({ project: projectId }),
    Note.countDocuments({ project: projectId }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalTasks,
        completedTasks,
        inProgressTasks,
        todoTasks,
        overdueTasks,
        totalMembers,
        totalNotes,
      },
      "Dashboard fetched successfully",
    ),
  );
});

export { getProjectDashboard };
