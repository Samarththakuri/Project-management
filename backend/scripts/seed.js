import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../src/db/index.js";
import { User } from "../src/model/user.models.js";
import { Project } from "../src/model/project.models.js";
import { ProjectMember } from "../src/model/projectmember.models.js";
import { Task } from "../src/model/task.model.js";
import { Subtask } from "../src/model/subtask.models.js";
import { Note } from "../src/model/note.models.js";
import { usersData } from "./data/users.js";
import { getProjectsData, getMembersData } from "./data/projects.js";
import { getTasksData, getSubtasksData } from "./data/tasks.js";
import { getNotesData } from "./data/notes.js";

dotenv.config({ path: "./.env" });

const seed = async () => {
  await connectDB();
  console.log("Starting seed...");

  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    ProjectMember.deleteMany({}),
    Task.deleteMany({}),
    Subtask.deleteMany({}),
    Note.deleteMany({}),
  ]);
  console.log("Cleared all collections");

  // Use User.create() so the pre('save') bcrypt hook fires and passwords are hashed
  const users = await User.create(usersData);
  console.log(`Seeded ${users.length} users`);

  // No save hooks on remaining models — insertMany is safe and faster
  const projects = await Project.insertMany(getProjectsData(users));
  console.log(`Seeded ${projects.length} projects`);

  const membersData = getMembersData(users, projects);
  await ProjectMember.insertMany(membersData);
  console.log(`Seeded ${membersData.length} project members`);

  const tasks = await Task.insertMany(getTasksData(users, projects));
  console.log(`Seeded ${tasks.length} tasks`);

  const subtasksData = getSubtasksData(users, tasks);
  await Subtask.insertMany(subtasksData);
  console.log(`Seeded ${subtasksData.length} subtasks`);

  const notesData = getNotesData(users, projects);
  await Note.insertMany(notesData);
  console.log(`Seeded ${notesData.length} notes`);

  console.log("\nSeed complete ✓");
  console.log("\n─────────────────────────────────────────────");
  console.log("  TEST CREDENTIALS  (password: Password@123)");
  console.log("─────────────────────────────────────────────");
  console.log("  alice@example.com  →  admin      on 'Project Camp'");
  console.log("  bob@example.com    →  project_admin on 'Project Camp'");
  console.log("                        admin      on 'Marketing Site Redesign'");
  console.log("  carol@example.com  →  member     on both projects");
  console.log("  dave@example.com   →  member     on 'Marketing Site Redesign' only");
  console.log("─────────────────────────────────────────────\n");
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error("Seed failed:", err);
  mongoose.disconnect();
  process.exit(1);
});
