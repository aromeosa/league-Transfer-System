import { BusinessRules } from '../config/business-rules.config';

/** First week of the calendar month containing `reference` (§1.3/§1.4 #5): the 1st through the 7th. */
export function firstWeekWindowBounds(reference: Date = new Date()): { opensAt: Date; closesAt: Date } {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const opensAt = new Date(year, month, BusinessRules.WINDOW_OPEN_DAY_OF_MONTH, 0, 0, 0, 0);
  const closesAt = new Date(year, month, BusinessRules.WINDOW_CLOSE_DAY_OF_MONTH, 23, 59, 59, 999);
  return { opensAt, closesAt };
}
