export const getJobDeadlineString = (daysFromNow: number = 15): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
};
