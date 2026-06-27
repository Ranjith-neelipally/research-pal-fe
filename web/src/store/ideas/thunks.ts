import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  addIdeaService,
  deleteIdeaService,
  getIdeasService,
  updateIdeaService,
} from "@/services/ideas";
import { mapIdea } from "@/store/ideas/mappers";
import type { IdeaEntity } from "@/store/ideas/types";

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const fetchIdeas = createAsyncThunk<
  { ideas: IdeaEntity[]; dates: string[]; date?: string },
  { date?: string; limit?: number; page?: number } | undefined,
  { rejectValue: string }
>("ideas/fetchIdeas", async (params, { rejectWithValue }) => {
  try {
    const data = await getIdeasService(params);
    return { ideas: data.ideas.map(mapIdea), dates: data.dates, date: params?.date };
  } catch (error) {
    return rejectWithValue(message(error));
  }
});

export const createIdea = createAsyncThunk<
  IdeaEntity,
  { content: string; date: string },
  { rejectValue: string }
>("ideas/createIdea", async ({ content, date }, { rejectWithValue }) => {
  try {
    return mapIdea(await addIdeaService({ idea: content, date }));
  } catch (error) {
    return rejectWithValue(message(error));
  }
});

export const editIdea = createAsyncThunk<
  IdeaEntity,
  { id: string; content: string; date?: string },
  { rejectValue: string }
>("ideas/editIdea", async ({ id, content, date }, { rejectWithValue }) => {
  try {
    return mapIdea(await updateIdeaService({ _id: id, idea: content, date }));
  } catch (error) {
    return rejectWithValue(message(error));
  }
});

export const removeIdea = createAsyncThunk<string, string, { rejectValue: string }>(
  "ideas/removeIdea",
  async (id, { rejectWithValue }) => {
    try {
      return await deleteIdeaService(id);
    } catch (error) {
      return rejectWithValue(message(error));
    }
  },
);
