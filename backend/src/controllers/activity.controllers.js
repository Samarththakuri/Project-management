import { Activity } from "../model/activity.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

const getProjectActivity = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [activities, total] = await Promise.all([
    Activity.find({ project: projectId })
      .populate("actor", "username email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Activity.countDocuments({ project: projectId }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, { activities, total, page, limit }, "Activity fetched successfully"),
  );
});

export { getProjectActivity };
