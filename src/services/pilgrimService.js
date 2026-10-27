import { apiRequest } from "./apiClient.js";

const BASE_PATH = "/api/v1/pilgrims";
const idPath = (id, label) => {
  if (id === undefined || id === null || id === "" || !Number.isInteger(Number(id)) || Number(id) < 1) {
    throw new Error(`معرّف ${label} غير صالح.`);
  }
  return encodeURIComponent(id);
};

export const getPilgrims = () => apiRequest(`${BASE_PATH}/get`);

export const getPilgrimById = (id) => apiRequest(`${BASE_PATH}/${idPath(id, "الحاج")}`);
export const getPilgrimResponseById = (id) =>
  apiRequest(`${BASE_PATH}/etPilgrimResponse/${idPath(id, "الحاج")}`);

export const identifyPilgrimByCardNumber = (cardNumber) => {
  const value = String(cardNumber ?? "").trim();
  if (!value) throw new Error("رقم بطاقة الحاج غير موجود في رمز QR.");
  return apiRequest(`${BASE_PATH}/identify`, {
    method: "POST",
    body: { cardNumber: value },
  });
};

export const createQrIdentificationRequest = (cardNumber) => {
  const value = String(cardNumber ?? "").trim();
  if (!value) throw new Error("رقم بطاقة الحاج غير موجود في رمز QR.");
  return apiRequest("/api/v1/identification/qr/scan", {
    method: "POST",
    body: { cardNumber: value },
  });
};

export const scanPilgrimCardImage = (imageFile) => {
  if (!(imageFile instanceof File)) throw new Error("صورة البطاقة غير متاحة للمسح.");
  const body = new FormData();
  body.append("file", imageFile, imageFile.name || "pilgrim-card.jpg");
  return apiRequest("/api/v1/identification/scan", { method: "POST", body });
};

export const searchCampaignPilgrims = ({ visaNumber, fullName } = {}) => {
  const params = new URLSearchParams();
  if (visaNumber?.trim()) params.set("visaNumber", visaNumber.trim());
  if (fullName?.trim()) params.set("fullName", fullName.trim());
  if (!params.size) throw new Error("أدخل رقم التأشيرة أو اسم الحاج للبحث.");
  return apiRequest(`${BASE_PATH}/search?${params.toString()}`);
};

function withAccommodationReference(pilgrim) {
  if (pilgrim.accommodation == null) return pilgrim;
  const { id, Id, ...details } = pilgrim.accommodation;
  const accommodationId = Number(Id ?? id);
  if (!Number.isInteger(accommodationId) || accommodationId < 1) {
    throw new Error("اختاري سكنًا صالحًا من مساكن الحملة.");
  }
  // The backend Accommodation identifier is serialized/deserialized as `Id`.
  return { ...pilgrim, accommodation: { ...details, Id: accommodationId } };
}

export async function addPilgrim(pilgrim) {
  const result = await apiRequest(`${BASE_PATH}/add`, { method: "POST", body: withAccommodationReference(pilgrim) });
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ons-pilgrim-saved"));
  return result;
}
export async function updatePilgrim(id, pilgrim) {
  const result = await apiRequest(`${BASE_PATH}/update/${idPath(id, "الحاج")}`, { method: "PUT", body: withAccommodationReference(pilgrim) });
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ons-pilgrim-saved"));
  return result;
}
export async function deletePilgrim(id) {
  const result = await apiRequest(`${BASE_PATH}/delete/${idPath(id, "الحاج")}`, { method: "DELETE" });
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ons-pilgrim-saved"));
  return result;
}


export const getPilgrimReports = (id) =>
  apiRequest(`${BASE_PATH}/${idPath(id, "الحاج")}/reports`);
