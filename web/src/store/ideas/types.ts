export interface IdeaEntity {
  id: string;
  content: string;
  date: string;
  createdAt: string;
  updatedAt?: string;
}

export interface IdeasState {
  items: IdeaEntity[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  currentDate: string | null;
  availableDates: string[];
}
