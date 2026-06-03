import { createSlice } from "@reduxjs/toolkit";
import type { ProjectsState } from "@/store/projects/types";
import { createProjectWithPlots, fetchProjects } from "@/store/projects/thunks";

const initialState: ProjectsState = {
  items: [],
  status: "idle",
  error: null,
};

const projectsSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Unable to load projects.";
      })
      .addCase(createProjectWithPlots.fulfilled, (state, action) => {
        state.items = [action.payload, ...state.items.filter((project) => project.id !== action.payload.id)];
      });
  },
});

export default projectsSlice.reducer;
