import { createSlice } from "@reduxjs/toolkit";
import type { IdeasState } from "@/store/ideas/types";
import { createIdea, editIdea, fetchIdeas, removeIdea } from "@/store/ideas/thunks";

const initialState: IdeasState = {
  items: [],
  status: "idle",
  error: null,
  currentDate: null,
  availableDates: [],
};

const ideasSlice = createSlice({
  name: "ideas",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIdeas.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchIdeas.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.ideas;
        state.currentDate = action.payload.date || null;
        state.availableDates = action.payload.dates;
      })
      .addCase(fetchIdeas.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Unable to load ideas.";
      })
      .addCase(createIdea.fulfilled, (state, action) => {
        const ideaDate = action.payload.date.split("T")[0];
        if (!state.availableDates.includes(ideaDate)) {
          state.availableDates = [ideaDate, ...state.availableDates].sort((a, b) => b.localeCompare(a));
        }
        if (!state.currentDate || ideaDate === state.currentDate) {
          state.items = [action.payload, ...state.items.filter((idea) => idea.id !== action.payload.id)];
        }
      })
      .addCase(editIdea.fulfilled, (state, action) => {
        state.items = state.items.map((idea) => (idea.id === action.payload.id ? action.payload : idea));
      })
      .addCase(removeIdea.fulfilled, (state, action) => {
        state.items = state.items.filter((idea) => idea.id !== action.payload);
      });
  },
});

export default ideasSlice.reducer;
