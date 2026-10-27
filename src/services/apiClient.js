/** Shared fetch wrapper for the Vite /api proxy (currently http://localhost:8080). */
let basicAuthorization = "";

export function setApiCredentials(email, password) {
  const bytes = new TextEncoder().encode(`${email}:${password}`);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  basicAuthorization = `Basic ${btoa(binary)}`;
}

export function clearApiCredentials() {
  basicAuthorization = "";
}

export async function apiRequest(path, { method = "GET", body, rawBody = false, headers = {}, ...options } = {}) {
  let response;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  try {
    response = await fetch(path, {
      ...options,
      method,
      // Registration/payment endpoints share a server session through the same-origin Vite proxy.
      credentials: "include",
      headers: {
        ...(body === undefined || isFormData ? {} : { "Content-Type": "application/json" }),
        ...(basicAuthorization ? { Authorization: basicAuthorization } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: isFormData || rawBody ? body : JSON.stringify(body) }),
    });
  } catch {
    throw new Error("تعذر الاتصال بالـBackend. تحقق من تشغيل الخادم ثم حاول مرة أخرى.");
  }

  const responseText = await response.text();
  let data = null;
  if (responseText) {
    try { data = JSON.parse(responseText); }
    catch { data = responseText; }
  }

  if (!response.ok) {
    const responseMessage = data?.message || data?.Message || data?.error;
    if (response.status === 401) {
      const error = new Error(typeof responseMessage === "string"
        ? responseMessage
        : "رفض الباك إند الطلب (401). تحقق من بيانات المصادقة لهذا المسار.");
      error.status = response.status;
      error.data = data;
      error.path = path;
      error.method = method;
      throw error;
    }
    if (response.status === 403) {
      const error = new Error(typeof responseMessage === "string"
        ? responseMessage
        : `رفض الباك إند الطلب (403) للمسار ${path}.`);
      error.status = response.status;
      error.data = data;
      error.path = path;
      error.method = method;
      throw error;
    }
    const message = data?.message || data?.Message || data?.error || data;
    const error = new Error(typeof message === "string" ? message : `تعذر إكمال الطلب (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
