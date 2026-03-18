// Simple MVP auth - localStorage based verification
export const isVerified = (): boolean => {
  return localStorage.getItem("vary_verified") === "true";
};

export const setVerified = (): void => {
  localStorage.setItem("vary_verified", "true");
};

export const getUserType = (): string | null => {
  return localStorage.getItem("vary_user_type");
};

export const setUserType = (type: "buyer" | "seller"): void => {
  localStorage.setItem("vary_user_type", type);
};

export const logout = (): void => {
  localStorage.removeItem("vary_verified");
  localStorage.removeItem("vary_user_type");
};
