export const PLANS = {
  free: { key: "free", name: "Free", price: 0, limit: 1 },
  bronze: { key: "bronze", name: "Bronze", price: 100, limit: 3 },
  silver: { key: "silver", name: "Silver", price: 300, limit: 5 },
  gold: { key: "gold", name: "Gold", price: 1000, limit: Infinity },
};

export function planLimitLabel(plan) {
  return plan.limit === Infinity ? "unlimited tweets" : `${plan.limit} tweet${plan.limit === 1 ? "" : "s"}`;
}
