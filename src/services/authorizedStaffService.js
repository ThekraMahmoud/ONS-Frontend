import { apiRequest } from "./apiClient.js";

const BASE_PATH = "/api/v1/authorized-staff";
const idPath = (value, label) => {
  if (value === undefined || value === null || value === "" || !Number.isInteger(Number(value))) {
    throw new Error(`معرّف ${label} غير صالح.`);
  }
  return encodeURIComponent(value);
};

/** POST body follows AuthorizedStaffDTO: name, email, password, phoneNumber, staffRole, active. */
export function createAuthorizedStaff(campaignId, staff) {
  return apiRequest(`${BASE_PATH}/create/${idPath(campaignId, "الحملة")}`, { method: "POST", body: staff });
}

/** Returns all staff. The backend restricts this controller to AuthorizedStaff. */
export function getAllAuthorizedStaff() {
  return apiRequest(`${BASE_PATH}/get-all`);
}

export function getAuthorizedStaffById(staffId) {
  return apiRequest(`${BASE_PATH}/get/${idPath(staffId, "الموظف")}`);
}

/** PUT body follows AuthorizedStaffDTO. */
export function updateAuthorizedStaff(staffId, staff) {
  return apiRequest(`${BASE_PATH}/update/${idPath(staffId, "الموظف")}`, { method: "PUT", body: staff });
}

export function deleteAuthorizedStaff(staffId) {
  return apiRequest(`${BASE_PATH}/delete/${idPath(staffId, "الموظف")}`, { method: "DELETE" });
}

/** Returns employees for the currently authenticated supervisor. */
export function getEmployeesBySupervisor() {
  return apiRequest(`${BASE_PATH}/get/employees`);
}

/** POST body follows AuthorizedStaffDTO; the service assigns REGULAR_EMPLOYEE. */
export function addEmployee(employee) {
  return apiRequest(`${BASE_PATH}/add/employee`, { method: "POST", body: employee });
}

/** PUT body follows EmployeeUpdateDTO: name, email, phoneNumber, active. */
export function updateEmployee(employeeId, employee) {
  return apiRequest(
    `${BASE_PATH}/update/employee/${idPath(employeeId, "المندوب")}`,
    { method: "PUT", body: employee },
  );
}

export function deleteEmployee(employeeId) {
  return apiRequest(
    `${BASE_PATH}/delete/employee/${idPath(employeeId, "المندوب")}`,
    { method: "DELETE" },
  );
}

export function acceptPilgrimReport(_staffId, pilgrimId, reportId) {
  return apiRequest(
    `${BASE_PATH}/pilgrims/${idPath(pilgrimId, "الحاج")}/reports/${idPath(reportId, "البلاغ")}/accept`,
    { method: "PUT" },
  );
}

export function advanceReportStatus(_staffId, reportId) {
  return apiRequest(
    `${BASE_PATH}/reports/${idPath(reportId, "البلاغ")}/advance-status`,
    { method: "PUT" },
  );
}

/** Reports assigned to this authorized staff member. */
export function getStaffReports() {
  return apiRequest(`${BASE_PATH}/staff`);
}

/** Reports assigned to this staff member, filtered by the backend ReportStatus enum. */
export function getStaffReportsByStatus(status) {
  const allowedStatuses = new Set(["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CANCELLED"]);
  const normalizedStatus = String(status || "").toUpperCase();
  if (!allowedStatuses.has(normalizedStatus)) throw new Error("حالة البلاغ غير صالحة.");
  return apiRequest(`${BASE_PATH}/staff/status/${encodeURIComponent(normalizedStatus)}`);
}

/** Finds open, unassigned reports near the supplied location for the signed-in staff member. */
export function getNearbyStaffReports(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw new Error("تعذر تحديد موقع صالح للبحث عن البلاغات القريبة.");
  }
  const params = new URLSearchParams({ latitude: String(lat), longitude: String(lon) });
  return apiRequest(`${BASE_PATH}/nearby-reports?${params.toString()}`);
}
