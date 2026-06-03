import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/store/auth";
import ideasReducer from "@/store/ideas";
import projectsReducer from "@/store/projects";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ideas: ideasReducer,
    projects: projectsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
