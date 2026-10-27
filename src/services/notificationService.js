import { apiRequest } from "./apiClient.js";

const BASE_PATH = "/notification";
const idPath = (id) => {
  if (id === undefined || id === null || id === "" || !Number.isInteger(Number(id))) {
    throw new Error("معرّف الإشعار غير صالح.");
  }
  return encodeURIComponent(id);
};

export const getNotifications = () => apiRequest(`${BASE_PATH}/get`);
export const getNotificationById = (id) => apiRequest(`${BASE_PATH}/get/${idPath(id)}`);
export const addNotification = (notification) =>
  apiRequest(`${BASE_PATH}/add`, { method: "POST", body: notification });
export const updateNotification = (id, notification) =>
  apiRequest(`${BASE_PATH}/update/${idPath(id)}`, { method: "PUT", body: notification });
export const deleteNotification = (id) =>
  apiRequest(`${BASE_PATH}/delete/${idPath(id)}`, { method: "DELETE" });
