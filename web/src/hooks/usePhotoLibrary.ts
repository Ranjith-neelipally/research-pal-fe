import { useQuery } from "@tanstack/react-query";
import { getPhotoLibrary } from "@/services/photos";

export const photoLibraryQueryKey = ["photo-library"] as const;

export function usePhotoLibrary({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: photoLibraryQueryKey,
    queryFn: async () => {
      return getPhotoLibrary();
    },
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: false,
    enabled,
  });
}
