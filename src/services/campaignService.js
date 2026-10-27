import { apiRequest } from "./apiClient.js";

const BASE_PATH = "/api/v1/campaigns";
const idPath = (id) => {
  if (id === undefined || id === null || id === "" || !Number.isInteger(Number(id))) {
    throw new Error("معرّف الحملة غير صالح.");
  }
  return encodeURIComponent(id);
};

export const getCampaigns = () => apiRequest(`${BASE_PATH}/get`);

export function toCampaignRegistrationPayload({
  campaignName,
  contactNumber,
  startDate,
  endDate,
  email,
  password,
}) {
  return {
    campaignName: String(campaignName || "").trim(),
    startDate,
    endDate,
    user: {
      name: String(campaignName || "").trim(),
      email,
      password,
      phoneNumber: contactNumber,
      active: false,
    },
  };
}

export const createCampaign = (campaign) =>
  apiRequest(`${BASE_PATH}/register`, { method: "POST", body: campaign });
export const getMyCampaign = () => apiRequest(`${BASE_PATH}/me`);
export const getCampaignAnalytics = () => apiRequest(`${BASE_PATH}/analytics`);
export const emailCampaignAnalytics = () =>
  apiRequest(`${BASE_PATH}/analytics/email`, { method: "POST" });
export const updateMyCampaign = (campaign) =>
  apiRequest(`${BASE_PATH}/update`, { method: "PUT", body: campaign });
export const deleteCampaign = (id) =>
  apiRequest(`${BASE_PATH}/delete/${idPath(id)}`, { method: "DELETE" });

export const createCampaignPayment = (campaignId) =>
  apiRequest(`/api/v1/payments/campaign/${idPath(campaignId)}`, { method: "POST" });

export const verifyCampaignPayment = (campaignId, paymentId) =>
  apiRequest(`/api/v1/payments/campaign/${idPath(campaignId)}/${idPath(paymentId)}/verify`, { method: "POST" });
