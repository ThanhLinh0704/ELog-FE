export const canUploadOrders = (roles: string[] | string): boolean => {
  const rolesArr = Array.isArray(roles) ? roles : [roles];
  return rolesArr.includes("DISPATCHER");
};

export const canViewImportHistory = (roles: string[] | string): boolean => {
  const rolesArr = Array.isArray(roles) ? roles : [roles];
  const allowed = ["DISPATCHER", "LOGISTICS_MANAGER", "SYSTEM_ADMIN"];
  return rolesArr.some(role => allowed.includes(role));
};

export const canViewTripDrafts = (roles: string[] | string): boolean => {
  const rolesArr = Array.isArray(roles) ? roles : [roles];
  const allowed = ["DISPATCHER", "LOGISTICS_MANAGER", "WAREHOUSE_STAFF", "SYSTEM_ADMIN"];
  return rolesArr.some(role => allowed.includes(role));
};

export const canConsolidate = (roles: string[] | string): boolean => {
  const rolesArr = Array.isArray(roles) ? roles : [roles];
  const allowed = ["DISPATCHER", "SYSTEM_ADMIN"];
  return rolesArr.some(role => allowed.includes(role));
};
