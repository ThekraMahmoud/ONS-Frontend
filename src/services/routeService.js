import { apiRequest } from "./apiClient.js";

export function getRoute({ startLon, startLat, endLon, endLat }) {
  const params = new URLSearchParams({ startLon, startLat, endLon, endLat });
  return apiRequest(`/api/v1/routes?${params.toString()}`);
}
