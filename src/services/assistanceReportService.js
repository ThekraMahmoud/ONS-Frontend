import { apiRequest } from "./apiClient.js";

const BASE_PATH = "/report";
const idPath = (id) => {
  if (id === undefined || id === null || id === "" || !Number.isInteger(Number(id)) || Number(id) < 1) {
    throw new Error("معرّف البلاغ غير صالح.");
  }
  return encodeURIComponent(id);
};

export const getAssistanceReports = () => apiRequest(`${BASE_PATH}/get`);
export const getAssistanceReportById = (id) => apiRequest(`${BASE_PATH}/get/${idPath(id)}`);
export const addAssistanceReport = (report) => apiRequest(`${BASE_PATH}/add`, { method: "POST", body: report });
export const updateAssistanceReport = (id, report) =>
  apiRequest(`${BASE_PATH}/update/${idPath(id)}`, { method: "PUT", body: report });
export const deleteAssistanceReport = (id) =>
  apiRequest(`${BASE_PATH}/delete/${idPath(id)}`, { method: "DELETE" });

export const createSelfServiceReport = ({ cardNumber, kioskId }) =>
  apiRequest(`${BASE_PATH}/self-service`, { method: "POST", body: { cardNumber, kioskId } });

export const getReportTrackingHistory = (id) =>
  apiRequest(`/api/v1/reports/${idPath(id)}/history`);

export const mergeCampaignReports = (reportId, details) =>
  apiRequest(`${BASE_PATH}/${idPath(reportId)}/merge`, { method: "POST", body: details });

// Existing controller contracts: campaign groups use staffId; field assignment
// and reassignment use fieldStaffId and are restricted to ADMIN by the backend.
export function assignCampaignReportGroup(reportIds, staffId) {
  const ids = [...new Set(reportIds.map(Number))];
  if (ids.length < 2 || ids.some((id) => !Number.isInteger(id) || id < 1)) throw new Error("حدد بلاغين مختلفين وصالحين على الأقل.");
  const employeeId = Number(staffId);
  if (!Number.isInteger(employeeId) || employeeId < 1) throw new Error("اختر مندوبًا صالحًا.");
  return mergeCampaignReports(ids[0], { staffId: employeeId, reportIds: ids.slice(1) });
}

export function assignReportToFieldStaff(reportId, fieldStaffId, reassign = false) {
  const employeeId = Number(fieldStaffId);
  if (!Number.isInteger(employeeId) || employeeId < 1) throw new Error("اختر موظفًا ميدانيًا صالحًا.");
  return apiRequest(`/api/v1/reports/${idPath(reportId)}/${reassign ? "reassign" : "assign"}`, {
    method: "POST", body: { fieldStaffId: employeeId },
  });
}

// These actions enforce the authenticated assignee in AssistanceReportController.
export const startFieldReport = (id) => apiRequest(`/api/v1/reports/${idPath(id)}/start`, { method: "POST" });
export const resolveFieldReport = (id) => apiRequest(`/api/v1/reports/${idPath(id)}/resolve`, { method: "POST" });
