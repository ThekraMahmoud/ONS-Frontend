import { getPilgrims, getPilgrimReports } from "./pilgrimService.js";

// Both reads enforce membership in the authenticated staff member's campaign.
// Start from all campaign pilgrims, including those without accommodation.
export async function getCampaignStaffReports() {
  const pilgrims = await getPilgrims();
  if (!Array.isArray(pilgrims)) throw new Error("تعذر قراءة قائمة حجاج الحملة.");
  const ids = [...new Set(pilgrims.map((row) => row.id ?? row.Id ?? row.pilgrimId))];
  const reports = []; const failures = [];
  for (let index = 0; index < ids.length; index += 6) {
    const results = await Promise.allSettled(ids.slice(index, index + 6).map(getPilgrimReports));
    results.forEach((result) => {
      if (result.status === "fulfilled" && Array.isArray(result.value)) reports.push(...result.value);
      else if (result.status === "rejected" && !/there (?:are|is) no reports|no reports found/i.test(result.reason?.message || "")) failures.push(result.reason);
      else if (result.status === "fulfilled") failures.push(new Error("تعذر قراءة بعض البلاغات."));
    });
  }
  if (ids.length && failures.length === ids.length) throw failures[0];
  return {
    reports: [...new Map(reports.map((report) => [report.reportId, report])).values()].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))),
    failedCount: failures.length,
  };
}
