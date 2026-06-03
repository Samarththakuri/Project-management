import { z } from "zod";
import { AvialableTasksStatus } from "../utils/constants.js";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required"),
  description: z.string().trim().optional(),
  assignedTo: objectIdSchema.optional(),
  status: z
    .enum(AvialableTasksStatus, { errorMap: () => ({ message: "Invalid status" }) })
    .optional(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    assignedTo: objectIdSchema.optional(),
    status: z
      .enum(AvialableTasksStatus, { errorMap: () => ({ message: "Invalid status" }) })
      .optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: "At least one field must be provided" },
  );

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
