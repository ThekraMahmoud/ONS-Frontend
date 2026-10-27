export function normalizedRole(value) {
  return ({ADMIN:"ADMIN",CAMPAIGNOWNER:"CAMPAIGN_OWNER",AUTHORIZEDSTAFF:"AUTHORIZED_STAFF",SUPERVISOR:"SUPERVISOR",REGULAREMPLOYEE:"REPRESENTATIVE",REPRESENTATIVE:"REPRESENTATIVE",FIELDSTAFF:"FIELD_STAFF"})[String(value||"").toUpperCase().replace(/[^A-Z]/g,"")] || "OTHER";
}
export const peopleRoleLabels={ADMIN:"أدمن",CAMPAIGN_OWNER:"مالك حملة",SUPERVISOR:"مشرف",REPRESENTATIVE:"مندوب",FIELD_STAFF:"موظف ميداني",AUTHORIZED_STAFF:"موظف حملة",OTHER:"دور آخر"};
export function mergeAdminPeople(users,staff,fieldStaff){
  const records=new Map();
  for(const user of users){const key=String(user.id??user.Id??user.userId??user.email);records.set(key,{...user,personId:user.id??user.Id??user.userId,classification:normalizedRole(user.role)});}
  for(const item of [...staff,...fieldStaff]){const user=item.user;if(!user)continue;const id=user.id??user.Id??item.id??item.Id;const key=String(id??user.email);const current=records.get(key)||{};const isField=fieldStaff.includes(item);records.set(key,{...current,...user,personId:id,classification:isField?"FIELD_STAFF":normalizedRole(item.staffRole)||"AUTHORIZED_STAFF",staffRecord:item,campaignName:item.campaign?.user?.name||item.campaign?.campaignName||""});}
  return [...records.values()];
}
