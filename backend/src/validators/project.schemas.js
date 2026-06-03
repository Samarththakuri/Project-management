import { z } from "zod";
import { AvialableUserRole } from "../utils/constants.js";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required"),
  description: z.string().trim().optional(),
});

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: "At least one field (name or description) must be provided",
  });

export const addMemberSchema = z.object({
  email: z.string().trim().email("A valid email is required"),
  role: z.enum(AvialableUserRole, {
    errorMap: () => ({ message: "Invalid role" }),
  }),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(AvialableUserRole, {
    errorMap: () => ({ message: "Invalid role" }),
  }),
});
