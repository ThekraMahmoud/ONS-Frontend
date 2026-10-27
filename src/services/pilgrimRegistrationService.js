import { addPilgrim, getPilgrims } from "./pilgrimService.js";
import { addPilgrimCard, getPilgrimCardForPilgrim } from "./pilgrimCardService.js";

// A checkpoint survives a failed card request so retry never creates a second pilgrim.
export async function savePilgrimRegistration({ pilgrim, card, checkpoint, onCheckpoint }) {
  let progress = checkpoint || null;
  if (!progress?.pilgrimSaved) {
    await addPilgrim(pilgrim);
    progress = { pilgrimSaved: true, visaNumber: pilgrim.visaNumber, pilgrimId: null };
    onCheckpoint?.(progress);
  }
  if (!card?.cardNumber?.trim()) return progress;
  if (!progress.pilgrimId) {
    const response = await getPilgrims();
    const own = Array.isArray(response) ? response : response?.data || [];
    const saved = own.find((row) => row.visaNumber === progress.visaNumber);
    const id = Number(saved?.id ?? saved?.Id ?? saved?.pilgrimId);
    if (!Number.isInteger(id) || id < 1) throw new Error("تم حفظ الحاج، وتعذر استرجاع رقمه لربط البطاقة. أعد المحاولة لإكمال الربط فقط.");
    progress = { ...progress, pilgrimId: id }; onCheckpoint?.(progress);
  }
  const existing = await getPilgrimCardForPilgrim(progress.pilgrimId);
  if (existing.hasCard) {
    if (String(existing.card?.cardNumber) !== card.cardNumber.trim()) throw new Error("الحاج محفوظ ولديه بطاقة أخرى بالفعل. راجع بطاقته من ملف الحاج.");
    return { ...progress, cardSaved: true };
  }
  await addPilgrimCard(progress.pilgrimId, { cardNumber: card.cardNumber.trim(), cardType: card.cardType.trim(), status: card.status, imageReference: card.imageReference?.trim() || null });
  progress = { ...progress, cardSaved: true }; onCheckpoint?.(progress); return progress;
}
