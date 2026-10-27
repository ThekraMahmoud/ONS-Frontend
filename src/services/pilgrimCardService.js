import { apiRequest } from "./apiClient.js";

const BASE_PATH = "/api/v1/pilgrim-cards";
const idPath = (id, label = "البطاقة") => {
  if (id === undefined || id === null || id === "" || !Number.isInteger(Number(id))) {
    throw new Error(`معرّف ${label} غير صالح.`);
  }
  return encodeURIComponent(id);
};

function cardPayload(card) {
  // Creation uses the database-generated ID; update targets its ID in the URL.
  const details = { ...card };
  delete details.id;
  delete details.Id;
  return details;
}

export const getPilgrimCards = () => apiRequest(`${BASE_PATH}/get`);
export const getPilgrimCardById = (id) => apiRequest(`${BASE_PATH}/me?cardId=${encodeURIComponent(idPath(id))}`);
export const addPilgrimCard = (pilgrimId, card) =>
  apiRequest(`${BASE_PATH}/add?pilgrimId=${encodeURIComponent(idPath(pilgrimId, "الحاج"))}`, { method: "POST", body: cardPayload(card) });
export const updatePilgrimCard = (id, card) =>
  apiRequest(`${BASE_PATH}/update?cardId=${encodeURIComponent(idPath(id))}`, { method: "PUT", body: cardPayload(card) });
export const deletePilgrimCard = (id) =>
  apiRequest(`${BASE_PATH}/delete?cardId=${encodeURIComponent(idPath(id))}`, { method: "DELETE" });

export const getPilgrimCardForPilgrim = (pilgrimId) =>
  apiRequest(`${BASE_PATH}/pilgrim/${idPath(pilgrimId, "الحاج")}`);
