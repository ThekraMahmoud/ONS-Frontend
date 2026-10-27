const normalizeDigits = (value) => value.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776));
const fields = {
  fullName: ["fullName", "full_name", "name", "الاسم", "الاسم الكامل", "اسم الحاج"],
  nationality: ["nationality", "الجنسية"],
  phoneNumber: ["phoneNumber", "phone_number", "phone", "mobile", "رقم الجوال", "الجوال", "رقم الهاتف"],
  visaNumber: ["visaNumber", "visa_number", "visa", "رقم التأشيرة", "التأشيرة"],
};
const keyOf = (value) => value.toLowerCase().replace(/[\s_-]/g, "");
function textOf(value, max = 255) {
  const text = typeof value === "string" ? value.trim() : Number.isSafeInteger(value) ? String(value) : "";
  if (text.length > max) throw new Error("بعض بيانات الرمز أطول من المسموح. استخدم الإدخال اليدوي.");
  return text;
}
export function readPilgrimQr(payload) {
  const raw = String(payload ?? "").trim();
  if (!raw || raw.length > 10000) throw new Error("رمز QR غير صالح لقراءة بيانات الحاج.");
  const draft = {}; const card = {};
  function pick(record, aliases, max) {
    const entries = new Map(Object.entries(record).map(([key,value]) => [keyOf(key),value]));
    for (const alias of aliases) { const value = textOf(entries.get(keyOf(alias)), max); if (value) return value; }
    return "";
  }
  function read(record, depth = 0, cardContext = false) {
    if (typeof record === "string" && depth < 4) { let nested; try { nested = JSON.parse(record); } catch { return; } read(nested, depth + 1, cardContext); return; }
    if (!record || typeof record !== "object" || Array.isArray(record) || depth > 4) return;
    if (!cardContext) for (const [field, aliases] of Object.entries(fields)) {
      const value = pick(record, aliases, field === "fullName" ? 120 : field === "nationality" ? 60 : 255);
      if (value && !draft[field]) draft[field] = ["phoneNumber", "visaNumber"].includes(field) ? normalizeDigits(value) : value;
    }
    const number = pick(record, ["cardNumber", "card_number", "cardNo", "hid", "hidNumber", "رقم البطاقة", ...(cardContext ? ["number"] : [])], 50);
    if (number && !card.cardNumber) card.cardNumber = normalizeDigits(number);
    const type = pick(record, ["cardType", "نوع البطاقة", ...(cardContext ? ["type"] : [])], 30);
    if (type && !card.cardType) card.cardType = type;
    const status = pick(record, ["cardStatus", ...(cardContext || number ? ["status"] : [])], 20).toUpperCase();
    if (["ACTIVE", "INACTIVE", "EXPIRED"].includes(status) && !card.status) card.status = status;
    const image = pick(record, ["imageReference", "image_reference"], 255);
    if (image && !card.imageReference) card.imageReference = image;
    for (const key of ["pilgrim", "data", "record", "holder", "result", "details"]) read(record[key], depth + 1);
    for (const key of ["card", "pilgrimCard", "cardDetails"]) read(record[key], depth + 1, true);
  }
  let parsed;
  try { parsed = JSON.parse(raw); } catch { /* Plain identifiers and URLs are supported too. */ }
  read(parsed);
  if (!parsed) {
    let url; try { url = new URL(raw); } catch { /* Plain QR value. */ }
    if (url && ["https:", "http:"].includes(url.protocol)) read(Object.fromEntries(url.searchParams));
  }
  if (!card.cardNumber) {
    const value = normalizeDigits(typeof parsed === "string" ? parsed : raw);
    card.cardNumber = value.match(/\b447\d{12}\b/)?.[0] || (/^[A-Za-z0-9][A-Za-z0-9_-]{2,49}$/.test(value) ? value : "");
  }
  const cardNumber = card.cardNumber;
  return { draft, cardNumber, card: cardNumber ? { cardNumber, cardType: card.cardType || "NUSUK", status: card.status || "ACTIVE", imageReference: card.imageReference || "" } : null, hasDetails: Object.keys(draft).length > 0, missingFields: Object.keys(fields).filter((key) => !draft[key]) };
}
