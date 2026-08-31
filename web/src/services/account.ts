import { api } from "@/services/api";

export const requestAccountDeletion = () => api.post("/auth/account/delete/request");
export const confirmAccountDeletion = (otp: string) =>
  api.post("/auth/account/delete/confirm", { otp });
