export interface DueMonth {
  month: number;
  year: number;
  name: string;
  monthLabel: string;
  price: number;
  isPast: boolean;
  isCurrent: boolean;
  status: 'OVERDUE' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'EXEMPT';
  paidAmount: number;
  remainingAmount: number;
  subscriptionId?: string;
}

export const ARABIC_MONTH_NAMES: Record<number, string> = {
  1: 'يناير',
  2: 'فبراير',
  3: 'مارس',
  4: 'أبريل',
  5: 'مايو',
  6: 'يونيو',
  7: 'يوليو',
  8: 'أغسطس',
  9: 'سبتمبر',
  10: 'أكتوبر',
  11: 'نوفمبر',
  12: 'ديسمبر',
};

export function getCairoNow(): Date {
  const timeStr = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
  return new Date(timeStr);
}

export function calculateStudentDueMonths(student: {
  id?: string;
  createdAt: Date | string;
  academicStage?: { monthlyPrice?: number | null } | null;
  subscriptions?: Array<{
    id?: string;
    month?: number | null;
    year?: number | null;
    startDate?: Date | string;
    price?: number | null;
    status?: string;
    isExempt?: boolean;
    payments?: Array<{ paidAmount?: number | null }>;
  }>;
}): {
  dueMonths: DueMonth[];
  hasUnpaidPreviousMonths: boolean;
  currentMonthDue: DueMonth | null;
  effectiveStartDate: Date;
  academicYearStart: Date;
} {
  const now = getCairoNow();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Academic year in Egypt starts in Month 8 (August)
  // If current month is >= 8, start year is currentYear. If < 8, start year is currentYear - 1.
  const acadStartYear = currentMonth >= 8 ? currentYear : currentYear - 1;
  const academicYearStart = new Date(acadStartYear, 7, 1); // Month index 7 = August

  const joinDate = student.createdAt ? new Date(student.createdAt) : academicYearStart;
  const effectiveStartDate = joinDate.getTime() > academicYearStart.getTime() ? joinDate : academicYearStart;

  const startYear = effectiveStartDate.getFullYear();
  const startMonth = effectiveStartDate.getMonth() + 1;

  const monthsToCheck: { month: number; year: number }[] = [];
  let y = startYear;
  let m = startMonth;

  while (y < currentYear || (y === currentYear && m <= currentMonth)) {
    monthsToCheck.push({ month: m, year: y });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  const defaultPrice = student.academicStage?.monthlyPrice ?? 350;
  const dueMonths: DueMonth[] = [];
  let currentMonthDue: DueMonth | null = null;

  for (const item of monthsToCheck) {
    const isCurrent = item.month === currentMonth && item.year === currentYear;
    const isPast = item.year < currentYear || (item.year === currentYear && item.month < currentMonth);

    // Find matching subscription if any
    const sub = (student.subscriptions || []).find((s) => {
      if (s.month === item.month && s.year === item.year) return true;
      if (s.startDate) {
        const sd = new Date(s.startDate);
        if (sd.getMonth() + 1 === item.month && sd.getFullYear() === item.year) return true;
      }
      return false;
    });

    const price = typeof sub?.price === 'number' ? sub.price : defaultPrice;
    const isExempt = sub?.isExempt ?? false;

    let paidAmount = 0;
    if (sub?.payments && Array.isArray(sub.payments)) {
      paidAmount = sub.payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    }
    const remainingAmount = Math.max(0, price - paidAmount);

    let isPaid = false;
    let status: 'OVERDUE' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'EXEMPT' = 'UNPAID';

    if (isExempt) {
      isPaid = true;
      status = 'EXEMPT';
    } else if (sub?.status === 'PAID' || paidAmount >= price) {
      isPaid = true;
      status = 'PAID';
    } else if (paidAmount > 0) {
      status = 'PARTIALLY_PAID';
    } else if (isPast) {
      status = 'OVERDUE';
    } else {
      status = 'UNPAID';
    }

    if (!isPaid) {
      const monthObj: DueMonth = {
        month: item.month,
        year: item.year,
        name: `${ARABIC_MONTH_NAMES[item.month] || `شهر ${item.month}`} ${item.year} (شهر ${item.month})`,
        monthLabel: `شهر ${item.month} (${ARABIC_MONTH_NAMES[item.month] || ''})`,
        price: remainingAmount > 0 ? remainingAmount : price,
        isPast,
        isCurrent,
        status,
        paidAmount,
        remainingAmount,
        subscriptionId: sub?.id,
      };
      dueMonths.push(monthObj);

      if (isCurrent) {
        currentMonthDue = monthObj;
      }
    }
  }

  const hasUnpaidPreviousMonths = dueMonths.some((m) => m.isPast);

  return {
    dueMonths,
    hasUnpaidPreviousMonths,
    currentMonthDue,
    effectiveStartDate,
    academicYearStart,
  };
}
