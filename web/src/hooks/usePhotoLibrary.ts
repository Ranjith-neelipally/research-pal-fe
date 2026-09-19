import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getPhotoLibrary, registerWebPhotoDevice, subscribePhotoManifestChanges } from "@/services/photoStreaming";

export const photoLibraryQueryKey = ["photo-library"] as const;

export function usePhotoLibrary({ enabled = true }: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled) return undefined;
    return subscribePhotoManifestChanges(() => {
      void queryClient.invalidateQueries({ queryKey: photoLibraryQueryKey });
    });
  }, [enabled, queryClient]);

  return useQuery({
    queryKey: photoLibraryQueryKey,
    queryFn: async () => {
      await registerWebPhotoDevice();
      return getPhotoLibrary();
    },
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchInterval: false,
    enabled,
  });
}
