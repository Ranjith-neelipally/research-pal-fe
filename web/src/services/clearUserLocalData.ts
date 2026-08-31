import { clearStoredSession } from "@/store/auth/storage";
import { queryClient } from "@/lib/queryClient";

const RESEARCHPAL_PREFIXES = ["researchpal_", "research_pal_", "rp_"];
const RESEARCHPAL_KEYS = ["refresh_token", "access_token", "session_id"];

const clearOwnedStorage = (storage: Storage) => {
  const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter(Boolean) as string[];
  keys.forEach(key => {
    if (RESEARCHPAL_KEYS.includes(key) || RESEARCHPAL_PREFIXES.some(prefix => key.startsWith(prefix))) {
      storage.removeItem(key);
    }
  });
};

export function clearUserLocalData() {
  queryClient.clear();
  clearStoredSession();
  clearOwnedStorage(localStorage);
  clearOwnedStorage(sessionStorage);
}
