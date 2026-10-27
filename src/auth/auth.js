import { getAdminSummary } from "../services/adminDashboardService.js";
import { getMyCampaign } from "../services/campaignService.js";
import { getEmployeesBySupervisor } from "../services/authorizedStaffService.js";
import { getMapMarkers } from "../services/mapService.js";
import { apiRequest, clearApiCredentials, setApiCredentials } from "../services/apiClient.js";

// HTTP Basic credentials live in memory only and go through the same-origin API proxy.
let currentUser = null;

const errorMessage = (error) => String(error?.message || "").trim();
const isSupervisorWithoutEmployees = (error) =>
  /there are no employees in the campaign/i.test(errorMessage(error));
const isRegularEmployee = (error) => /you are not authorized/i.test(errorMessage(error));

function makeUser(email, role, campaign = null, name = email) {
  return {
    id: null,
    userId: null,
    name: name || email,
    email,
    role,
    campaignId: campaign?.id ?? campaign?.Id ?? null,
    campaign,
  };
}

function isAuthenticationFailure(error) {
  return error?.status === 401;
}

/**
 * Checks access using the project's existing protected endpoints. No account
 * directory or password is requested from the API.
 */
export async function login(emailInput, password) {
  const email = String(emailInput || "").trim();
  if (!email || !password) throw new Error("أدخل البريد الإلكتروني وكلمة المرور.");

  clearApiCredentials();
  currentUser = null;
  setApiCredentials(email, password);

  try {
    try {
      await getAdminSummary();
      currentUser = makeUser(email, "ADMIN");
      return currentUser;
    } catch (error) {
      if (isAuthenticationFailure(error)) throw error;
      if (error.status !== 403) throw error;
    }

    // /campaigns/me is available to owners and campaign staff. The owner email
    // distinguishes the account owner; employee/supervisor scope is established
    // by the existing supervisor-only employees endpoint.
    try {
      const campaign = await getMyCampaign();
      const ownerEmail = String(campaign?.user?.email || "").trim().toLowerCase();
      if (ownerEmail && ownerEmail === email.toLowerCase()) {
        currentUser = makeUser(email, "CAMPAIGN_OWNER", campaign,
          campaign?.user?.name || campaign?.campaignName || email);
        return currentUser;
      }

      try {
        await getEmployeesBySupervisor();
        currentUser = makeUser(email, "SUPERVISOR", campaign);
        return currentUser;
      } catch (error) {
        if (isAuthenticationFailure(error)) throw error;
        if (error.status === 400 && (isSupervisorWithoutEmployees(error) || isRegularEmployee(error))) {
          currentUser = makeUser(email, isRegularEmployee(error) ? "REPRESENTATIVE" : "SUPERVISOR", campaign);
          return currentUser;
        }
        throw error;
      }
    } catch (error) {
      if (isAuthenticationFailure(error)) throw error;
      if (error.status !== 403) throw error;
    }

    // Field staff have no campaign profile. A permitted map request is the
    // existing role-specific capability available to identify their account.
    await getMapMarkers();
    currentUser = makeUser(email, "FIELD_STAFF");
    return currentUser;
  } catch (error) {
    clearApiCredentials();
    currentUser = null;
    if (error.status === 0 || (!error.status && error.message?.startsWith("تعذر الاتصال"))) throw error;
    if (isAuthenticationFailure(error)) {
      const failure = new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة. تأكد من بياناتك وحاول مرة أخرى.", { cause: error });
      failure.status = 401;
      throw failure;
    }
    if (error.status === 403) {
      throw new Error("تم التحقق من الحساب، لكن لم يتعرّف النظام على دوره أو لا يملك صلاحية مساحة العمل.", { cause: error });
    }
    throw new Error(error.message || "تعذر تسجيل الدخول إلى الباك إند.", { cause: error });
  }
}

export function getCurrentUser() {
  return currentUser;
}

export function logout() {
  // The backend's configured logout route is kept as the source of truth.
  const request = apiRequest("/api/v1/auth/logout", { method: "POST" }).catch(() => null);
  currentUser = null;
  clearApiCredentials();
  return request;
}
