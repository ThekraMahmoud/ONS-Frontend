const common = [
  { id: "overview", label: "نظرة عامة", icon: "overview", description: "ملخص الحملة وأولويات العمل في مكان واحد." },
  { id: "pilgrims", label: "حجاج الحملة", icon: "pilgrims", description: "جميع حجاج حملتك؛ ابحث بالاسم أو التأشيرة، وافتح ملف الحاج." },
];
export function workspaceSections(role) {
  if (["CAMPAIGN_OWNER", "CAMPAIGN_ADMIN"].includes(role)) return [...common,
    { id: "accommodations", label: "السكن", icon: "management", description: "إدارة مساكن الحملة المرتبطة بالحجاج وإضافة سكن جديد." },
    { id: "team", label: "فريق الحملة", icon: "team", description: "إدارة المشرفين والمناديب المرتبطين بالحملة." },
    { id: "analytics", label: "إحصاءات الحملة", icon: "overview", description: "راجع أداء الحملة وتوزيع البلاغات ونسبة إنجاز المساعدة." }];
  if (role === "SUPERVISOR") return [...common,
    { id: "team", label: "المناديب", icon: "team", description: "عرض مناديب الحملة وإضافة حسابات الفريق." },
    { id: "accommodations", label: "السكن", icon: "management", description: "مساكن الحملة والحجاج المرتبطون بكل موقع." },
    { id: "reports", label: "بلاغات الحملة", icon: "reports", description: "راجع بلاغات حجاج الحملة وحدّد البلاغات المفتوحة لإسنادها إلى المندوب." },
    { id: "myReports", label: "بلاغاتي المسندة", icon: "reports", description: "استلم البلاغات المسندة إليك وحدّث حالتها بعد تنفيذ كل خطوة." },
    { id: "analytics", label: "إحصاءات الحملة", icon: "overview", description: "مؤشرات الحجاج والبلاغات ونسبة الإنجاز." }];
  if (["REPRESENTATIVE", "REGULAR_EMPLOYEE"].includes(role)) return [...common,
    { id: "reports", label: "بلاغات الحملة", icon: "reports", description: "جميع بلاغات حجاج حملتك وحالاتها، بما فيها البلاغات المفتوحة غير المسندة." },
    { id: "myReports", label: "بلاغاتي المسندة", icon: "reports", description: "متابعة البلاغات التي استلمتها وتحديث حالتها." }];
  return [];
}
