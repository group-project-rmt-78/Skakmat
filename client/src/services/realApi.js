import axios from "axios";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 15000,
});

http.interceptors.response.use(
  (res) => res,
  (err) =>
    Promise.reject(new Error(err.response?.data?.error?.message || err.message))
);

export const realApi = {
  createGame: (payload) => http.post("/games", payload).then((r) => r.data),
  getGame: (id) => http.get(`/games/${id}`).then((r) => r.data),
  makeMove: (id, move) => http.post(`/games/${id}/move`, move).then((r) => r.data),
  resign: (id) => http.post(`/games/${id}/resign`).then((r) => r.data),
  restart: (id) => http.post(`/games/${id}/restart`).then((r) => r.data),
};
