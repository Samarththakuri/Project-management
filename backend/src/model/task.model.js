import mongoose, { Schema } from "mongoose";
import {
  TasksStatusEnum,
  AvialableTasksStatus,
  TaskPriorityEnum,
  AvialableTaskPriority,
} from "../utils/constants.js";
const taskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assigner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: AvialableTasksStatus,
      default: TasksStatusEnum.TODO,
    },
    priority: {
      type: String,
      enum: AvialableTaskPriority,
      default: TaskPriorityEnum.MEDIUM,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);
taskSchema.index({ title: "text", description: "text" });
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignee: 1, status: 1 });
taskSchema.index({ project: 1, dueDate: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
export const Task = mongoose.model("Task", taskSchema);
