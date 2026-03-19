import { useAuthStore } from "../store/authStore";

export function useAuth() {
  const { isAuthenticated } = useAuthStore();

  return { isAuthenticated };
}
