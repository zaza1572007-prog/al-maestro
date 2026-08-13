import { prisma } from '../lib/prisma';

async function testExempt() {
  try {
    console.log('Fetching a sample subscription...');
    const sub = await prisma.subscription.findFirst({
      include: { student: true, group: true },
    });

    if (!sub) {
      console.log('No subscription found in the database!');
      return;
    }

    console.log('Current Subscription details:');
    console.log(`ID: ${sub.id}`);
    console.log(`Student Name: ${sub.student?.name}`);
    console.log(`Price: ${sub.price}`);
    console.log(`Status: ${sub.status}`);
    console.log(`Month/Year: ${sub.month}/${sub.year}`);
    console.log(`End Date: ${sub.endDate}`);

    const now = new Date();
    const baseDate = sub.endDate && new Date(sub.endDate) > now ? new Date(sub.endDate) : now;
    const nextMonthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 2, 0, 23, 59, 59, 999);

    console.log('\n--- Simulating renewExempt update logic ---');
    console.log(`Calculated nextMonthEnd: ${nextMonthEnd}`);

    // Let's run a transaction but roll it back or just update and print, then we can change it back
    await prisma.$transaction(async (tx) => {
      const up = await tx.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'ACTIVE',
          price: 0,
          endDate: nextMonthEnd,
          usedSessions: 0,
        },
      });

      console.log('After update details in DB:');
      console.log(`Price: ${up.price}`);
      console.log(`Status: ${up.status}`);
      console.log(`End Date: ${up.endDate}`);

      // Now let's simulate syncSubscriptionStatuses logic
      console.log('\n--- Simulating syncSubscriptionStatuses logic ---');
      const payments = await tx.payment.findMany({ where: { subscriptionId: sub.id } });
      const totalPaid = payments.reduce((sum, p) => sum + p.paidAmount, 0);
      let expectedStatus = up.status;

      const subMonth = up.month || (new Date(up.startDate).getMonth() + 1);
      const subYear = up.year || new Date(up.startDate).getFullYear();

      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const endOfMonth = new Date(currentYear, currentMonth, 0);
      const totalDays = endOfMonth.getDate();
      const last8DaysStart = totalDays - 7;
      const isLast8Days = now.getDate() >= last8DaysStart;

      const isCurrentMonth = subMonth === currentMonth && subYear === currentYear;
      const isPastMonth = subYear < currentYear || (subYear === currentYear && subMonth < currentMonth);

      if (totalPaid >= up.price) {
        expectedStatus = 'PAID';
      } else if (totalPaid > 0) {
        expectedStatus = 'PARTIALLY_PAID';
      } else {
        if (isCurrentMonth) {
          expectedStatus = isLast8Days ? 'UNPAID' : 'ACTIVE';
        } else if (isPastMonth) {
          expectedStatus = 'OVERDUE';
        }
      }

      console.log(`Expected status: ${expectedStatus}`);
      if (up.status !== expectedStatus) {
        console.log(`-> Oh! syncSubscriptionStatuses would change status from ${up.status} to ${expectedStatus}`);
      }

      // Rollback so we don't actually modify the db during this test run
      throw new Error('ROLLBACK_FOR_TEST');
    });

  } catch (error: any) {
    if (error.message === 'ROLLBACK_FOR_TEST') {
      console.log('\nTransaction rolled back successfully.');
    } else {
      console.error('Error running test:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testExempt();
