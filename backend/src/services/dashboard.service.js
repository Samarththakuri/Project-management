import { Task } from "../model/task.model.js";
import { Project } from "../model/project.models.js";
import { ProjectMember } from "../model/projectmember.models.js";
import { Notification } from "../model/notification.models.js";
import { Comment } from "../model/comment.models.js";
import { Activity } from "../model/activity.models.js";

const POPULATE_USER = "username fullName email avatar";
const DAY_MS = 24 * 60 * 60 * 1000;

const PRIORITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };
const RANK_PRIORITY = {
  4: "critical",
  3: "high",
  2: "medium",
  1: "low",
  0: "medium",
};

/**
 * Compute the day-boundary anchors used across every dashboard aggregation
 * so all sections share a single, consistent "now".
 */
export function buildDateWindows(now = new Date()) {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday.getTime() + DAY_MS - 1);
  const startOfTomorrow = new Date(startOfToday.getTime() + DAY_MS);
  const endOfTomorrow = new Date(endOfToday.getTime() + DAY_MS);
  const next7Days = new Date(startOfToday.getTime() + 7 * DAY_MS);
  const endOfWeek = new Date(next7Days.getTime() - 1);
  const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * DAY_MS);
  const eightWeeksAgo = new Date(startOfToday.getTime() - 56 * DAY_MS);
  return {
    now,
    startOfToday,
    endOfToday,
    startOfTomorrow,
    endOfTomorrow,
    next7Days,
    endOfWeek,
    sevenDaysAgo,
    eightWeeksAgo,
  };
}

const countOf = (arr) => arr[0]?.n ?? 0;

/**
 * Top-of-dashboard KPI counters, rolled up across every project the user
 * belongs to.
 */
export async function getSummary(userId, projectIds, w) {
  const { startOfToday, endOfToday, next7Days, sevenDaysAgo } = w;

  const [taskFacet] = await Task.aggregate([
    { $match: { project: { $in: projectIds } } },
    {
      $facet: {
        open: [{ $match: { status: { $ne: "done" } } }, { $count: "n" }],
        completed: [{ $match: { status: "done" } }, { $count: "n" }],
        dueToday: [
          {
            $match: {
              status: { $ne: "done" },
              dueDate: { $gte: startOfToday, $lte: endOfToday },
            },
          },
          { $count: "n" },
        ],
        upcoming: [
          {
            $match: {
              status: { $ne: "done" },
              dueDate: { $gt: endOfToday, $lte: next7Days },
            },
          },
          { $count: "n" },
        ],
        overdue: [
          {
            $match: {
              status: { $ne: "done" },
              dueDate: { $ne: null, $lt: startOfToday },
            },
          },
          { $count: "n" },
        ],
        inReview: [{ $match: { status: "review" } }, { $count: "n" }],
        high: [
          { $match: { status: { $ne: "done" }, priority: "high" } },
          { $count: "n" },
        ],
        critical: [
          { $match: { status: { $ne: "done" }, priority: "critical" } },
          { $count: "n" },
        ],
      },
    },
  ]);

  const byProject = await Task.aggregate([
    { $match: { project: { $in: projectIds } } },
    {
      $group: {
        _id: "$project",
        total: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
      },
    },
  ]);
  const projectsCompleted = byProject.filter(
    (p) => p.total > 0 && p.done === p.total,
  ).length;

  const [unreadNotifications, recentComments, distinctMembers] =
    await Promise.all([
      Notification.countDocuments({ recipient: userId, isRead: false }),
      Comment.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $lookup: {
            from: "tasks",
            localField: "task",
            foreignField: "_id",
            as: "t",
          },
        },
        { $unwind: "$t" },
        { $match: { "t.project": { $in: projectIds } } },
        { $count: "n" },
      ]),
      ProjectMember.distinct("user", { project: { $in: projectIds } }),
    ]);

  return {
    activeProjects: projectIds.length - projectsCompleted,
    projectsCompleted,
    openTasks: countOf(taskFacet.open),
    completedTasks: countOf(taskFacet.completed),
    tasksDueToday: countOf(taskFacet.dueToday),
    upcomingTasks: countOf(taskFacet.upcoming),
    overdueTasks: countOf(taskFacet.overdue),
    tasksInReview: countOf(taskFacet.inReview),
    highPriorityTasks: countOf(taskFacet.high),
    criticalTasks: countOf(taskFacet.critical),
    unreadNotifications,
    recentComments: countOf(recentComments),
    totalMembers: distinctMembers.length,
  };
}

/**
 * Tasks assigned to the current user (personal-first framing) with a derived
 * comment count.
 */
export async function getMyTasks(userId) {
  return Task.aggregate([
    { $match: { assignee: userId, status: { $ne: "done" } } },
    {
      $lookup: {
        from: "projects",
        localField: "project",
        foreignField: "_id",
        as: "projectDoc",
      },
    },
    { $unwind: { path: "$projectDoc", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "task",
        as: "comments",
      },
    },
    {
      $addFields: {
        commentsCount: { $size: "$comments" },
        project: { _id: "$projectDoc._id", name: "$projectDoc.name" },
      },
    },
    {
      $project: {
        title: 1,
        status: 1,
        priority: 1,
        dueDate: 1,
        commentsCount: 1,
        project: 1,
      },
    },
    { $sort: { dueDate: 1, createdAt: -1 } },
    { $limit: 15 },
  ]);
}

/**
 * Paginated activity feed across the user's projects. Used both for the
 * dashboard's first page and the "Load More" endpoint.
 */
export async function getRecentActivity(projectIds, page = 1, limit = 12) {
  const skip = (page - 1) * limit;
  const [activities, total] = await Promise.all([
    Activity.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "actor",
          foreignField: "_id",
          as: "actor",
        },
      },
      { $unwind: { path: "$actor", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "projects",
          localField: "project",
          foreignField: "_id",
          as: "project",
        },
      },
      { $unwind: { path: "$project", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          action: 1,
          resourceType: 1,
          resourceId: 1,
          metadata: 1,
          createdAt: 1,
          "actor.fullName": 1,
          "actor.username": 1,
          "actor.avatar": 1,
          "project._id": 1,
          "project.name": 1,
        },
      },
    ]),
    Activity.countDocuments({ project: { $in: projectIds } }),
  ]);

  return {
    activities,
    total,
    page,
    limit,
    hasMore: skip + activities.length < total,
  };
}

/**
 * The user's next deadlines (assigned to them), soonest first.
 */
export async function getUpcomingDeadlines(userId, w) {
  const { startOfToday } = w;
  const tasks = await Task.find({
    assignee: userId,
    status: { $ne: "done" },
    dueDate: { $ne: null, $gte: startOfToday },
  })
    .populate("project", "name")
    .sort({ dueDate: 1 })
    .limit(8)
    .lean();

  return tasks.map((t) => ({
    _id: t._id,
    title: t.title,
    project: t.project,
    priority: t.priority,
    dueDate: t.dueDate,
    daysRemaining: Math.max(
      0,
      Math.ceil(
        (new Date(t.dueDate).getTime() - startOfToday.getTime()) / DAY_MS,
      ),
    ),
  }));
}

function deriveHealth(open, overdue, completionPct, nextDue, startOfToday) {
  const overduePct = open > 0 ? overdue / open : 0;
  // nextDue is always >= startOfToday (upcoming), so "passed" is captured by
  // the overdue count, not by nextDue.
  const daysToDeadline = nextDue
    ? (new Date(nextDue).getTime() - startOfToday.getTime()) / DAY_MS
    : null;

  if (overduePct >= 0.4) return "red";
  if (
    overdue > 0 ||
    (daysToDeadline !== null && daysToDeadline <= 3 && completionPct < 0.75)
  )
    return "yellow";
  return "green";
}

/**
 * Rich per-project cards: progress, counts, derived deadline/priority/health,
 * member avatars, and latest activity. Includes projects that have no tasks.
 */
export async function getProjectProgress(projectIds, w) {
  const { startOfToday } = w;
  const rows = await Project.aggregate([
    { $match: { _id: { $in: projectIds } } },
    {
      $lookup: {
        from: "tasks",
        localField: "_id",
        foreignField: "project",
        as: "tasks",
      },
    },
    {
      $lookup: {
        from: "projectmembers",
        let: { pid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$project", "$$pid"] } } },
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "u",
            },
          },
          { $unwind: "$u" },
          {
            $project: {
              _id: "$u._id",
              fullName: "$u.fullName",
              username: "$u.username",
              avatar: "$u.avatar",
            },
          },
        ],
        as: "memberUsers",
      },
    },
    {
      $lookup: {
        from: "activities",
        let: { pid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$project", "$$pid"] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
          { $project: { action: 1, createdAt: 1, metadata: 1 } },
        ],
        as: "latestActivityArr",
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        tasks: {
          status: 1,
          priority: 1,
          dueDate: 1,
        },
        memberUsers: 1,
        latestActivity: { $arrayElemAt: ["$latestActivityArr", 0] },
      },
    },
  ]);

  return rows.map((p) => {
    const tasks = p.tasks || [];
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const open = total - done;
    const overdue = tasks.filter(
      (t) =>
        t.status !== "done" && t.dueDate && new Date(t.dueDate) < startOfToday,
    ).length;

    const upcoming = tasks
      .filter(
        (t) =>
          t.status !== "done" &&
          t.dueDate &&
          new Date(t.dueDate) >= startOfToday,
      )
      .map((t) => new Date(t.dueDate).getTime());
    const nextDue = upcoming.length ? new Date(Math.min(...upcoming)) : null;

    const maxRank = tasks
      .filter((t) => t.status !== "done")
      .reduce((max, t) => Math.max(max, PRIORITY_RANK[t.priority] || 0), 0);

    const completionPct = total > 0 ? done / total : 0;
    const progress = Math.round(completionPct * 100);

    return {
      _id: p._id,
      name: p.name,
      description: p.description || "",
      progress,
      totalTasks: total,
      completedTasks: done,
      remainingTasks: open,
      memberCount: p.memberUsers.length,
      members: p.memberUsers.slice(0, 5),
      dueDate: nextDue,
      priority: RANK_PRIORITY[maxRank] || "medium",
      risk: deriveHealth(open, overdue, completionPct, nextDue, startOfToday),
      health: deriveHealth(open, overdue, completionPct, nextDue, startOfToday),
      overdueTasks: overdue,
      latestActivity: p.latestActivity || null,
    };
  });
}

/**
 * Team workload rollup: contributions, busiest members, per-member load, and
 * blocked (overdue) task count across the user's projects.
 */
export async function getTeamWorkload(projectIds, w) {
  const { startOfToday } = w;
  const rows = await Task.aggregate([
    { $match: { project: { $in: projectIds }, assignee: { $ne: null } } },
    {
      $group: {
        _id: "$assignee",
        open: { $sum: { $cond: [{ $ne: ["$status", "done"] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$status", "done"] },
                  { $ne: ["$dueDate", null] },
                  { $lt: ["$dueDate", startOfToday] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        _id: 1,
        open: 1,
        completed: 1,
        overdue: 1,
        "user.fullName": 1,
        "user.username": 1,
        "user.avatar": 1,
      },
    },
  ]);

  const blockedTasks = rows.reduce((sum, r) => sum + r.overdue, 0);

  return {
    tasksPerMember: [...rows].sort((a, b) => b.open - a.open),
    mostBusy: [...rows].sort((a, b) => b.open - a.open).slice(0, 5),
    topContributors: [...rows]
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 5),
    blockedTasks,
  };
}

function bucketDailyIntoWeeks(daily, weeks, startOfToday) {
  // daily: [{ _id: "YYYY-MM-DD", count }]. Build `weeks` weekly buckets ending today.
  const map = new Map(daily.map((d) => [d._id, d.count]));
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(startOfToday.getTime() - (i * 7 + 6) * DAY_MS);
    let completed = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart.getTime() + d * DAY_MS);
      const key = day.toISOString().slice(0, 10);
      completed += map.get(key) || 0;
    }
    out.push({ week: weekStart.toISOString().slice(0, 10), completed });
  }
  return out;
}

function fillDailyLast7(daily, startOfToday) {
  const map = new Map(daily.map((d) => [d._id, d.count]));
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(startOfToday.getTime() - i * DAY_MS);
    const key = day.toISOString().slice(0, 10);
    out.push({ date: key, count: map.get(key) || 0 });
  }
  return out;
}

/**
 * Analytics facet feeding all charts. weeklyCompletion / completionTrend /
 * personalProductivity are derived in JS from daily completion buckets so the
 * pipeline stays portable (no $isoWeek grouping).
 */
export async function getAnalytics(userId, projectIds, w) {
  const { startOfToday, eightWeeksAgo } = w;

  const [facet] = await Task.aggregate([
    { $match: { project: { $in: projectIds } } },
    {
      $facet: {
        byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        byPriority: [{ $group: { _id: "$priority", count: { $sum: 1 } } }],
        completionsDaily: [
          { $match: { status: "done" } },
          { $addFields: { c: { $ifNull: ["$completedAt", "$updatedAt"] } } },
          { $match: { c: { $gte: eightWeeksAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$c" } },
              count: { $sum: 1 },
            },
          },
        ],
        personalDaily: [
          { $match: { status: "done", assignee: userId } },
          { $addFields: { c: { $ifNull: ["$completedAt", "$updatedAt"] } } },
          { $match: { c: { $gte: eightWeeksAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$c" } },
              count: { $sum: 1 },
            },
          },
        ],
        overdueBuckets: [
          {
            $match: {
              status: { $ne: "done" },
              dueDate: { $ne: null, $lt: startOfToday },
            },
          },
          {
            $project: {
              ageDays: {
                $floor: {
                  $divide: [{ $subtract: [startOfToday, "$dueDate"] }, DAY_MS],
                },
              },
            },
          },
          {
            $bucket: {
              groupBy: "$ageDays",
              boundaries: [0, 4, 8],
              default: "8+",
              output: { count: { $sum: 1 } },
            },
          },
        ],
      },
    },
  ]);

  const overdueLabels = { 0: "1-3d", 4: "4-7d", "8+": ">7d" };
  const overdueTrend = ["1-3d", "4-7d", ">7d"].map((label) => {
    const match = facet.overdueBuckets.find(
      (b) => overdueLabels[b._id] === label,
    );
    return { bucket: label, count: match?.count || 0 };
  });

  return {
    tasksByStatus: facet.byStatus.map((s) => ({
      status: s._id,
      count: s.count,
    })),
    tasksByPriority: facet.byPriority.map((p) => ({
      priority: p._id,
      count: p.count,
    })),
    weeklyCompletion: fillDailyLast7(facet.completionsDaily, startOfToday),
    completionTrend: bucketDailyIntoWeeks(
      facet.completionsDaily,
      8,
      startOfToday,
    ),
    personalProductivity: bucketDailyIntoWeeks(
      facet.personalDaily,
      8,
      startOfToday,
    ),
    overdueTrend,
  };
}

/**
 * The user's tasks due today / tomorrow / rest of this week.
 */
export async function getCalendarPreview(userId, w) {
  const {
    startOfToday,
    endOfToday,
    startOfTomorrow,
    endOfTomorrow,
    endOfWeek,
  } = w;

  const tasks = await Task.find({
    assignee: userId,
    status: { $ne: "done" },
    dueDate: { $ne: null, $gte: startOfToday, $lte: endOfWeek },
  })
    .populate("project", "name")
    .sort({ dueDate: 1 })
    .lean();

  const shape = (t) => ({
    _id: t._id,
    title: t.title,
    project: t.project,
    priority: t.priority,
    dueDate: t.dueDate,
  });

  return {
    today: tasks
      .filter((t) => t.dueDate >= startOfToday && t.dueDate <= endOfToday)
      .map(shape),
    tomorrow: tasks
      .filter((t) => t.dueDate >= startOfTomorrow && t.dueDate <= endOfTomorrow)
      .map(shape),
    thisWeek: tasks.filter((t) => t.dueDate > endOfTomorrow).map(shape),
  };
}

export { POPULATE_USER };
