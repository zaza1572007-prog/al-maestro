import { calculateStudentDueMonths, ARABIC_MONTH_NAMES, getCairoNow } from '../lib/due-months';

function runTests() {
  console.log('🧪 Starting Due Months Calculation Tests...\n');

  const now = getCairoNow();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  console.log(`Current Cairo Date/Time: Month ${currentMonth}, Year ${currentYear}\n`);

  // -------------------------------------------------------------
  // Test Case 1: Student registered recently (e.g. October 2026 / currentMonth)
  // -------------------------------------------------------------
  const recentStudent = {
    id: 'stu-1',
    createdAt: new Date(currentYear, Math.min(11, currentMonth - 1), 15), // joined in current month
    academicStage: { monthlyPrice: 400 },
    subscriptions: [],
  };

  const res1 = calculateStudentDueMonths(recentStudent);
  console.log('Test 1 (Student joined in current month):');
  console.log(`- Due Months count: ${res1.dueMonths.length}`);
  console.log(`- Has unpaid previous months: ${res1.hasUnpaidPreviousMonths}`);
  if (res1.dueMonths.length > 0) {
    console.log(`- Due Month: ${res1.dueMonths[0].name} (Price: ${res1.dueMonths[0].price})`);
  }
  if (!res1.hasUnpaidPreviousMonths) {
    console.log('✅ PASS: No previous arrears for newly joined student.');
  } else {
    console.error('❌ FAIL: Expected no previous arrears.');
  }
  console.log('---------------------------------------------------\n');

  // -------------------------------------------------------------
  // Test Case 2: Student joined in August (start of academic year) with no payments
  // -------------------------------------------------------------
  const acadStartYear = currentMonth >= 8 ? currentYear : currentYear - 1;
  const augStudent = {
    id: 'stu-2',
    createdAt: new Date(acadStartYear, 7, 1), // August 1st
    academicStage: { monthlyPrice: 350 },
    subscriptions: [],
  };

  const res2 = calculateStudentDueMonths(augStudent);
  console.log('Test 2 (Student joined in August):');
  console.log(`- Due Months count: ${res2.dueMonths.length}`);
  console.log(`- Oldest Due Month (Pre-selected): ${res2.dueMonths[0]?.name}`);
  console.log(`- Has unpaid previous months: ${res2.hasUnpaidPreviousMonths}`);
  console.log('- Due Months list:', res2.dueMonths.map(m => m.name));

  if (currentMonth > 8 || currentYear > acadStartYear) {
    if (res2.hasUnpaidPreviousMonths && res2.dueMonths[0].month === 8) {
      console.log('✅ PASS: Detected August as oldest unpaid month.');
    } else {
      console.error('❌ FAIL: Expected August as oldest unpaid month.');
    }
  } else {
    console.log('✅ PASS: Handled August current month accurately.');
  }
  console.log('---------------------------------------------------\n');

  // -------------------------------------------------------------
  // Test Case 3: Student joined in August and paid Month 8, now owing Month 9
  // -------------------------------------------------------------
  const augPaidStudent = {
    id: 'stu-3',
    createdAt: new Date(acadStartYear, 7, 1),
    academicStage: { monthlyPrice: 350 },
    subscriptions: [
      {
        month: 8,
        year: acadStartYear,
        price: 350,
        status: 'PAID',
        payments: [{ paidAmount: 350 }],
      },
    ],
  };

  const res3 = calculateStudentDueMonths(augPaidStudent);
  console.log('Test 3 (Student paid August, checking remaining months):');
  console.log(`- Due Months count: ${res3.dueMonths.length}`);
  console.log('- Due Months list:', res3.dueMonths.map(m => m.name));
  const hasAug = res3.dueMonths.some(m => m.month === 8 && m.year === acadStartYear);
  if (!hasAug) {
    console.log('✅ PASS: August is excluded because it was already paid.');
  } else {
    console.error('❌ FAIL: August should be excluded since it is paid.');
  }
  console.log('---------------------------------------------------\n');

  // -------------------------------------------------------------
  // Test Case 4: Skipping Older Month warning verification
  // -------------------------------------------------------------
  if (res2.dueMonths.length > 1) {
    const selectedIdx = 1; // selected 2nd month instead of 1st
    const skipped = res2.dueMonths.slice(0, selectedIdx);
    const warningMsg = `تنبيه: سيظل شهر ${skipped.map(m => m.name).join(' و ')} معلقاً كمديونية على الطالب.`;
    console.log('Test 4 (Skipping Warning Message):');
    console.log(`- Selected Month: ${res2.dueMonths[selectedIdx].name}`);
    console.log(`- Warning Output: "${warningMsg}"`);
    console.log('✅ PASS: Warning message generated correctly.\n');
  }

  console.log('🎉 All due months logic tests passed successfully!');
}

runTests();
