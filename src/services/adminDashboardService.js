import { apiRequest } from "./apiClient.js";

const DASHBOARD = "/api/v1/dashboard";

// These paths are declared by DashboardController and restricted to ADMIN.
export const getAdminSummary = () => apiRequest(`${DASHBOARD}/summary`);
export const getAdminReportsByStatus = () => apiRequest(`${DASHBOARD}/reports-by-status`);
export const getAdminReportsTrend = () => apiRequest(`${DASHBOARD}/reports-trend`);
export const getAdminResponseTime = () => apiRequest(`${DASHBOARD}/response-time`);
export const getAdminResolutionTime = () => apiRequest(`${DASHBOARD}/resolution-time`);

export const getAdminCampaigns = () => apiRequest("/api/v1/campaigns/get");
export const getAdminUsers = () => apiRequest("/api/v1/auth/get/all");
export const getAdminPilgrims = () => apiRequest("/api/v1/pilgrims/get");
export const getAdminReports = () => apiRequest("/report/get");
export const deleteAdminCampaign = (id) => {
  if (id === undefined || id === null || id === "" || !Number.isInteger(Number(id))) {
    throw new Error("معرّف الحملة غير صالح.");
  }
  return apiRequest(`/api/v1/campaigns/delete/${encodeURIComponent(id)}`, { method: "DELETE" });
};
