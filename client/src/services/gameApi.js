import { mockApi } from "./mockApi.js";
import { realApi } from "./realApi.js";

export const gameApi =
  import.meta.env.VITE_USE_MOCK === "true" ? mockApi : realApi;