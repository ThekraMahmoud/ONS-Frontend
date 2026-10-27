import { apiRequest } from "./apiClient.js";

const BASE_PATH = "/api/v1/auth";
const idPath = (id) => {
  if (id === undefined || id === null || id === "" || !Number.isInteger(Number(id))) {
    throw new Error("معرّف المستخدم غير صالح.");
  }
  return encodeURIComponent(id);
};

// The current AuthController has no login endpoint; these functions map only its actual routes.
export const getAllUsers = () => apiRequest(`${BASE_PATH}/get/all`);
export const getUserById = (id) => apiRequest(`${BASE_PATH}/get/${idPath(id)}`);
export const activateUser = (id) => apiRequest(`${BASE_PATH}/activate/${idPath(id)}`, { method: "PUT" });
export const deactivateUser = (id) => apiRequest(`${BASE_PATH}/deactivate/${idPath(id)}`, { method: "PUT" });
export const changeUserPassword = (id, credentials) =>
  apiRequest(`${BASE_PATH}/change-password/${idPath(id)}`, { method: "POST", body: credentials });
