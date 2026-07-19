import mongoose, { Schema } from "mongoose";

const activitySchema = new Schema(
  {
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    resourceType: {
      type: String,
      enum: ["project", "task", "member"],
      default: null,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true },
);

activitySchema.index({ project: 1, createdAt: -1 });

export const Activity = mongoose.model("Activity", activitySchema);
