import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email("Email is invalid"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters long")
    .toLowerCase()
    .regex(/^[a-z0-9_]+$/, "Username must be lowercase alphanumeric"),
  password: z.string().trim().min(8, "Password must be at least 8 characters"),
  fullName: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Email is invalid").optional(),
  username: z.string().optional(),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Email is invalid"),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});
