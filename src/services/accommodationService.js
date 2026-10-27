import { apiRequest } from "./apiClient.js";

const BASE_PATH = "/api/v1/accommodations";
const idPath = (id) => {
  if (id === undefined || id === null || id === "" || !Number.isInteger(Number(id))) {
    throw new Error("معرّف السكن غير صالح.");
  }
  return encodeURIComponent(id);
};

export const getAccommodations = () => apiRequest(`${BASE_PATH}/get`);
export const getAccommodationById = (id) => apiRequest(`${BASE_PATH}/${idPath(id)}`);
export const getMyCampaignAccommodations = () => apiRequest(`${BASE_PATH}/my-campaign`);
export const addAccommodation = (accommodation) =>
  apiRequest(`${BASE_PATH}/add`, { method: "POST", body: accommodation });
export const updateAccommodation = (id, accommodation) =>
  apiRequest(`${BASE_PATH}/update/${idPath(id)}`, { method: "PUT", body: accommodation });
export const deleteAccommodation = (id) =>
  apiRequest(`${BASE_PATH}/delete/${idPath(id)}`, { method: "DELETE" });

export const updateAccommodationStatus = (id, status) =>
  apiRequest(`${BASE_PATH}/${idPath(id)}/status`, { method: "PATCH", body: { status } });
