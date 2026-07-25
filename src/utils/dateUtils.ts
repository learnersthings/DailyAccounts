export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const parseISOYear = (isoString: string): number => {
  if (!isoString) return new Date().getFullYear();
  return new Date(isoString).getFullYear();
};

export const parseISOMonth = (isoString: string): number => {
  if (!isoString) return new Date().getMonth();
  return new Date(isoString).getMonth();
};

export const getMonthYearString = (isoString: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
};
