import axios from "axios";
import { auth } from "../context/firebase";

const axiosInstance = axios.create({
  baseURL: process.env.BACKEND_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the signed-in user's Firebase ID token to every request so the
// backend can verify who is calling (see backend/middleware/auth.js).
// getIdToken() returns a cached token and refreshes it automatically when it
// is about to expire.
axiosInstance.interceptors.request.use(async (config) => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;
