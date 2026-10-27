import { apiRequest } from "./apiClient.js";

const BASE_PATH = "/api/v1/field-staff";
const idPath = (id) => {
  if (id === undefined || id === null || id === "" || !Number.isInteger(Number(id))) {
    throw new Error("معرّف الموظف الميداني غير صالح.");
  }
  return encodeURIComponent(id);
};

export const createFieldStaff = (staff) => apiRequest(`${BASE_PATH}/create`, { method: "POST", body: staff });
export async function getAllFieldStaff() {
  try { return await apiRequest(`${BASE_PATH}/get-all`); }
  catch (error) { if (error.status === 400 && /^there is no field staff in the system$/i.test(error.message?.trim() || "")) return []; throw error; }
}
export const getFieldStaffById = (id) => apiRequest(`${BASE_PATH}/get/${idPath(id)}`);
export const updateFieldStaff = (id, staff) =>
  apiRequest(`${BASE_PATH}/update/${idPath(id)}`, { method: "PUT", body: staff });
export const deleteFieldStaff = (id) =>
  apiRequest(`${BASE_PATH}/delete/${idPath(id)}`, { method: "DELETE" });
