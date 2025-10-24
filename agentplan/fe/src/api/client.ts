import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

const timeout = Number(import.meta.env.VITE_API_TIMEOUT ?? 45000);

export const apiClient = axios.create({
  baseURL,
  timeout,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
  },
});
