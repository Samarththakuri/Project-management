import { ProjectMember } from "../model/projectmember.models.js";
import { Notification } from "../model/notification.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  buildDateWindows,
  getSummary,
  getMyTasks,
  getRecentActivity,
  getUpcomingDeadlines,
  getProjectProgress,
  getTeamWorkload,
  getAnalytics,
  getCalendarPreview,
} from "../services/dashboard.service.js";

const emptyDashboard = () => ({
  summary: {
    activeProjects: 0,
    projectsCompleted: 0,
    openTasks: 0,
    completedTasks: 0,
    tasksDueToday: 0,
    upcomingTasks: 0,
    overdueTasks: 0,
    tasksInReview: 0,
    highPriorityTasks: 0,
    criticalTasks: 0,
    unreadNotifications: 0,
    recentComments: 0,
    totalMembers: 0,
  },
  myTasks: [],
  recentActivity: {
    activities: [],
    total: 0,
    page: 1,
    limit: 12,
    hasMore: false,
  },
  notifications: [],
  upcomingDeadlines: [],
  projectProgress: [],
  teamWorkload: {
    topContributors: [],
    mostBusy: [],
    tasksPerMember: [],
    blockedTasks: 0,
  },
  analytics: {
    tasksByStatus: [],
    tasksByPriority: [],
    weeklyCompletion: [],
    completionTrend: [],
    personalProductivity: [],
    overdueTrend: [],
    projectsProgress: [],
  },
  calendarPreview: { today: [], tomorrow: [], thisWeek: [] },
  taskDistribution: { byStatus: [], byPriority: [] },
  completionTrend: [],
});

/**
 * Unified dashboard: aggregates every widget's data for the current user in a
 * single request. Scoped to the projects the user is a member of.
 */
const getUserDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const w = buildDateWindows(new Date());

  const memberships = await ProjectMember.find({ user: userId })
    .select("project")
    .lean();
  const projectIds = memberships.map((m) => m.project);

  if (!projectIds.length) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          emptyDashboard(),
          "Dashboard fetched successfully",
        ),
      );
  }

  const [
    summary,
    myTasks,
    recentActivity,
    notifications,
    upcomingDeadlines,
    projectProgress,
    teamWorkload,
    analytics,
    calendarPreview,
  ] = await Promise.all([
    getSummary(userId, projectIds, w),
    getMyTasks(userId),
    getRecentActivity(projectIds, 1, 12),
    Notification.find({ recipient: userId })
      .sort({ isRead: 1, createdAt: -1 })
      .limit(8)
      .populate("sender", "username fullName avatar")
      .lean(),
    getUpcomingDeadlines(userId, w),
    getProjectProgress(projectIds, w),
    getTeamWorkload(projectIds, w),
    getAnalytics(userId, projectIds, w),
    getCalendarPreview(userId, w),
  ]);

  // Cross-derive: projects progress chart reuses the project cards.
  analytics.projectsProgress = projectProgress.map((p) => ({
    name: p.name,
    progress: p.progress,
  }));

  const data = {
    summary,
    myTasks,
    recentActivity,
    notifications,
    upcomingDeadlines,
    projectProgress,
    teamWorkload,
    analytics,
    calendarPreview,
    taskDistribution: {
      byStatus: analytics.tasksByStatus,
      byPriority: analytics.tasksByPriority,
    },
    completionTrend: analytics.completionTrend,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, data, "Dashboard fetched successfully"));
});

/**
 * Paginated global activity feed for the dashboard "Load More" control.
 */
const getUserActivity = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));

  const memberships = await ProjectMember.find({ user: userId })
    .select("project")
    .lean();
  const projectIds = memberships.map((m) => m.project);

  if (!projectIds.length) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { activities: [], total: 0, page, limit, hasMore: false },
          "Activity fetched successfully",
        ),
      );
  }

  const result = await getRecentActivity(projectIds, page, limit);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Activity fetched successfully"));
});

export { getUserDashboard, getUserActivity };
