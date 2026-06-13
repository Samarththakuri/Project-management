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
    order: {
      type: Number,
      default: 0,
    },
    attachments: {
      type: [
        {
          url: String,
          mimetype: String,
          size: Number,
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);
taskSchema.index({ title: "text", description: "text" });
export const Task = mongoose.model("Task", taskSchema);
