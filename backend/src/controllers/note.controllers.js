import { Note } from "../model/note.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ActivityActionEnum } from "../utils/constants.js";
import { logActivity } from "../utils/activity.js";

const getProjectNotes = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const notes = await Note.find({ project: projectId })
    .populate("createdBy", "username email avatar")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, notes, "Notes fetched successfully"));
});

const createNote = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { content } = req.body;

  const note = await Note.create({
    project: projectId,
    createdBy: req.user._id,
    content,
  });

  logActivity(req.user._id, ActivityActionEnum.NOTE_CREATED, projectId, "note", note._id);

  return res
    .status(201)
    .json(new ApiResponse(201, note, "Note created successfully"));
});

const getNoteById = asyncHandler(async (req, res) => {
  const { projectId, noteId } = req.params;

  const note = await Note.findOne({ _id: noteId, project: projectId }).populate(
    "createdBy",
    "username email avatar",
  );

  if (!note) {
    throw new ApiError(404, "Note not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, note, "Note fetched successfully"));
});

const updateNote = asyncHandler(async (req, res) => {
  const { projectId, noteId } = req.params;
  const { content } = req.body;

  const note = await Note.findOne({ _id: noteId, project: projectId });

  if (!note) {
    throw new ApiError(404, "Note not found");
  }

  note.content = content;
  await note.save();

  logActivity(req.user._id, ActivityActionEnum.NOTE_UPDATED, projectId, "note", note._id);

  return res
    .status(200)
    .json(new ApiResponse(200, note, "Note updated successfully"));
});

const deleteNote = asyncHandler(async (req, res) => {
  const { projectId, noteId } = req.params;

  const note = await Note.findOne({ _id: noteId, project: projectId });

  if (!note) {
    throw new ApiError(404, "Note not found");
  }

  await Note.findByIdAndDelete(noteId);

  logActivity(req.user._id, ActivityActionEnum.NOTE_DELETED, projectId, "note", note._id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Note deleted successfully"));
});

export { getProjectNotes, createNote, getNoteById, updateNote, deleteNote };
