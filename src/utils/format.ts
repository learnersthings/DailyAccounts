export const formatAmount = (amount: number): string => {
  if (isNaN(amount)) return '0.00';
  const parts = Number(amount).toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};
