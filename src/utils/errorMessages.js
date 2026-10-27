function rawErrorText(error) {
  const value = error?.data?.message
    ?? error?.data?.Message
    ?? error?.data?.error
    ?? error?.message
    ?? "";
  if (typeof value === "string") return value.trim();
  try { return JSON.stringify(value); }
  catch { return ""; }
}

export function presentApiError(error, fallback = "تعذر إكمال الطلب. حاولي مرة أخرى.") {
  const details = rawErrorText(error);
  const status = error?.status ?? error?.cause?.status;
  const text = details.toLowerCase();
  let message = details;

  if (/campaign name is required/.test(text)) {
    message = "أدخل اسم الحملة ثم حاول مجددًا.";
  } else if (/campaign owner is required/.test(text)) {
    message = "بيانات مالك الحملة لم تصل كاملة إلى الخادم. تحققي من بيانات التسجيل ثم أعيدي المحاولة.";
  } else if (/campaign_name.*doesn't have a default value|column 'campaign_name'/.test(text)) {
    message = "تعذر حفظ الحملة بسبب مشكلة في تخزين اسم الحملة على الخادم. لم يُحفظ التسجيل.";
  } else if (/phone number must start with 05/.test(text) || /phoneNumber.*05\\d\{8\}/i.test(details)) {
    message = "رقم الجوال يجب أن يبدأ بـ05 ويتكوّن من 10 أرقام.";
  } else if (/email is already registered/.test(text)) {
    message = "هذا البريد الإلكتروني مسجّل من قبل. سجّلي الدخول أو استخدمي بريدًا آخر.";
  } else if (/cannot map `null` into type `boolean`|cannot deserialize.*boolean/.test(text)) {
    message = "تعذر قراءة حالة الحساب المرسلة. حدّثي الصفحة ثم حاولي مرة أخرى.";
  } else if (/moyasar invoice creation failed:\s*http\s*401/i.test(details)) {
    message = "رفض ميسر إنشاء الفاتورة. تحققي من إعدادات الربط في الخادم.";
  } else if (status === 401) {
    message = "البريد الإلكتروني أو كلمة المرور غير صحيحة. تأكد من بياناتك وحاول مرة أخرى.";
  } else if (status === 403) {
    message = "حسابك لا يملك صلاحية تنفيذ هذا الطلب.";
  } else if (status === 404) {
    message = "البيانات المطلوبة غير موجودة. راجع الرقم وحاول مرة أخرى.";
  } else if (/could not execute statement|constraintviolationimpl|sql \[|json parse error|validation failed for classes/i.test(text)) {
    message = fallback;
  } else if (!message || message.length > 220) {
    message = fallback;
  }

  if (status >= 500 || /exception|stacktrace|java\.|org\.|sql|jdbc|hibernate|backend|الباك|باك إند|HTTP\s*\d|localhost|\/api\//i.test(message)) message = fallback;
  if (!/[\u0600-\u06ff]/.test(message)) {
    if (/not found|no .* found/i.test(text)) message = "لم يتم العثور على السجل المطلوب. راجع الرقم وحاول مجددًا.";
    else if (/already|duplicate|unique/i.test(text)) message = "هذه البيانات مسجلة مسبقًا. راجع السجلات قبل الإضافة.";
    else if (/required|must not be blank|must not be null/i.test(text)) message = "أكمل الحقول المطلوبة ثم حاول مجددًا.";
    else if (/invalid|must|size|length/i.test(text)) message = "راجع البيانات المدخلة وتأكد من صحة القيم.";
    else message = fallback;
  }
  message = message.replace(/\s*\((?:HTTP\s*)?[45]\d{2}\)/gi, "").trim();
  return { message: message || fallback, details: "" };
}
