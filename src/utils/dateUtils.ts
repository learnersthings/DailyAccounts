export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const parseISOYear = (isoString: string): number => {
  if (!isoString) return new Date().getFullYear();
  return parseInt(isoString.substring(0, 4), 10);
};

export const parseISOMonth = (isoString: string): number => {
  if (!isoString) return new Date().getMonth();
  return parseInt(isoString.substring(5, 7), 10) - 1;
};

export const getMonthYearString = (isoString: string): string => {
  if (!isoString) return '';
  const year = isoString.substring(0, 4);
  const monthIdx = parseInt(isoString.substring(5, 7), 10) - 1;
  return `${MONTH_NAMES[monthIdx]} ${year}`;
};
