// src/api.js
import axios from "axios";

const api = axios.create({
  // Use env variable from Vercel or fallback to local
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  withCredentials: false,
});

// Attach token automatically
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Central 401 handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      // Clear stale creds and bounce to login
      localStorage.removeItem("token");
      localStorage.removeItem("name");
      localStorage.removeItem("role");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
