import { apiRequest } from "./apiClient.js";

export const getMapMarkers = () => apiRequest("/api/v1/map/markers");

export function getNearestPlace(kioskId, type) {
  const id = Number(kioskId);
  if (!Number.isInteger(id) || id < 1) throw new Error("معرّف الجهاز غير صالح.");
  if (!["BATHROOM", "GATE"].includes(type)) throw new Error("نوع المكان غير صالح.");
  return apiRequest(`/api/v1/map/kiosks/${id}/nearest-place?${new URLSearchParams({ type })}`);
}
