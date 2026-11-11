import { mockApi } from "./mockApi.js";
import { realApi } from "./realApi.js";

// Default mock. Set VITE_USE_MOCK=false kalau backend sudah siap.
export const gameApi =
  import.meta.env.VITE_USE_MOCK === "false" ? realApi : mockApi;
