import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { tokenStorage } from "../utils/tokenStorage";
import { useAuthStore } from "../store/authStore";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

const api = axios.create({
  baseURL,
  withCredentials: true,
});

const refreshApi = axios.create({
  baseURL,
  withCredentials: true,
});

let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

async function refreshAccessToken() {
  const refreshToken = tokenStorage.getRefreshToken();
  const response = await refreshApi.post("/auth/refresh", { refreshToken });
  const { accessToken, refreshToken: newRefreshToken } = response.data ?? {};

  if (!accessToken) {
    throw new Error("Failed to refresh access token");
  }

  useAuthStore.getState().setTokens(accessToken, newRefreshToken);
  return accessToken as string;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const response = error.response;
    const originalConfig = error.config as RetryConfig | undefined;

    if (!response || !originalConfig) {
      return Promise.reject(error);
    }

    if (response.status !== 401 || originalConfig._retry) {
      return Promise.reject(error);
    }

    originalConfig._retry = true;

    if (isRefreshing) {
      return new Promise((resolve) => {
        pendingRequests.push((token: string) => {
          originalConfig.headers = originalConfig.headers ?? {};
          originalConfig.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalConfig));
        });
      });
    }

    isRefreshing = true;

    try {
      const newToken = await refreshAccessToken();
      pendingRequests.forEach((callback) => callback(newToken));
      pendingRequests = [];
      originalConfig.headers = originalConfig.headers ?? {};
      originalConfig.headers.Authorization = `Bearer ${newToken}`;
      return api(originalConfig);
    } catch (refreshError) {
      pendingRequests = [];
      useAuthStore.getState().clearAuth();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
