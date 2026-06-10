import { z } from "zod";
import { AvialableTasksStatus, AvialableTaskPriority } from "../utils/constants.js";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required"),
  description: z.string().trim().optional(),
  assignee: objectIdSchema.optional(),
  status: z
    .enum(AvialableTasksStatus, { errorMap: () => ({ message: "Invalid status" }) })
    .optional(),
  priority: z
    .enum(AvialableTaskPriority, { errorMap: () => ({ message: "Invalid priority" }) })
    .optional(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    assignee: objectIdSchema.optional(),
    status: z
      .enum(AvialableTasksStatus, { errorMap: () => ({ message: "Invalid status" }) })
      .optional(),
    priority: z
      .enum(AvialableTaskPriority, { errorMap: () => ({ message: "Invalid priority" }) })
      .optional(),
    dueDate: z.string().datetime({ offset: true }).optional().nullable(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: "At least one field must be provided" },
  );

export const reorderTasksSchema = z.object({
  tasks: z
    .array(
      z.object({
        taskId: objectIdSchema,
        order: z.number().int(),
      }),
    )
    .min(1, "At least one task is required"),
});

export const createSubtaskSchema = z.object({
  title: z.string().trim().min(1, "Subtask title is required"),
});

export const updateSubtaskSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    isCompleted: z.boolean().optional(),
  })
  .refine(
    (data) => data.title !== undefined || data.isCompleted !== undefined,
    { message: "At least one field must be provided" },
  );
