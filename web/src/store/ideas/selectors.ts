import type { RootState } from "@/store";

export const selectIdeas = (state: RootState) => state.ideas.items;
export const selectIdeasStatus = (state: RootState) => state.ideas.status;
export const selectIdeasError = (state: RootState) => state.ideas.error;
export const selectIdeaDates = (state: RootState) => state.ideas.availableDates;
