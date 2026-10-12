import { API_BASE } from "./config.js";

export class ApiError extends Error {
  constructor(message, code = "error", status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new ApiError("Cannot reach the server. Check your internet connection and try again.", "network");
  }
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON response */ }
  if (!res.ok) {
    const e = data?.error;
    throw new ApiError(e?.message || "The server returned an unexpected error.", e?.code || "server_error", res.status);
  }
  return data;
}

export const predict = (text) =>
  request("/predict", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });

export const modelInfo = () => request("/model-info");
