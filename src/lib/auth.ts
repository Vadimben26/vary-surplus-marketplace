// Simple MVP auth - localStorage based verification
export const isVerified = (): boolean => {
  return localStorage.getItem("vary_verified") === "true";
};

export const setVerified = (): void => {
  localStorage.setItem("vary_verified", "true");
};

export const getUserType = (): "buyer" | "seller" | "both" | null => {
  return localStorage.getItem("vary_user_type") as "buyer" | "seller" | "both" | null;
};

export const setUserType = (type: "buyer" | "seller" | "both"): void => {
  localStorage.setItem("vary_user_type", type);
};

export const canAccessBuyer = (): boolean => {
  const type = getUserType();
  return type === "buyer" || type === "both";
};

export const canAccessSeller = (): boolean => {
  const type = getUserType();
  return type === "seller" || type === "both";
};

export const requestDualRole = (): void => {
  // In MVP, instantly grant dual access
  setUserType("both");
};

export const getSellerVisibility = (): object | null => {
  const stored = localStorage.getItem("vary_seller_visibility");
  return stored ? JSON.parse(stored) : null;
};

export const setSellerVisibility = (config: object): void => {
  localStorage.setItem("vary_seller_visibility", JSON.stringify(config));
};

export const logout = (): void => {
  localStorage.removeItem("vary_verified");
  localStorage.removeItem("vary_user_type");
  localStorage.removeItem("vary_seller_visibility");
};
