import { apiRequest } from "./apiClient.js";

const BASE_PATH = "/api/v1/kiosks";
const idPath = (id, label = "الجهاز") => {
  if (id === undefined || id === null || id === "" || !Number.isInteger(Number(id))) {
    throw new Error(`معرّف ${label} غير صالح.`);
  }
  return encodeURIComponent(id);
};

export const getKiosks = () => apiRequest(`${BASE_PATH}/get`);
export const getKioskById = (id) => apiRequest(`${BASE_PATH}/get/${idPath(id)}`);
export const addKiosk = (kiosk) => apiRequest(`${BASE_PATH}/add`, { method: "POST", body: kiosk });
export const updateKiosk = (id, kiosk) =>
  apiRequest(`${BASE_PATH}/update/${idPath(id)}`, { method: "PUT", body: kiosk });
export const deleteKiosk = (id) => apiRequest(`${BASE_PATH}/delete/${idPath(id)}`, { method: "DELETE" });

// Spring's String request body expects the unquoted status text.
export const updateKioskStatus = (id, status) => {
  if (!["ACTIVE", "INACTIVE", "MAINTENANCE"].includes(status)) throw new Error("اختاري حالة جهاز صحيحة.");
  return apiRequest(`${BASE_PATH}/update-status/${idPath(id)}`, {
    method: "PATCH", body: status, rawBody: true,
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
  });
};
export const updateKioskLocation = (id, location) =>
  apiRequest(`${BASE_PATH}/update-location/${idPath(id)}`, { method: "PATCH", body: location });
export const updateAllKioskHeartbeats = () =>
  apiRequest(`${BASE_PATH}/heartbeat/all`, { method: "PATCH" });
export const getKioskReports = (id) => apiRequest(`${BASE_PATH}/${idPath(id)}/reports`);
export const getKioskActivity = () => apiRequest(`${BASE_PATH}/activity`);
