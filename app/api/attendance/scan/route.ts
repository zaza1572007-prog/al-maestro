import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/error-handler';
import { syncTodaySessionsState } from '@/lib/session-sync';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { verifyStaff } from '@/lib/auth';
import { verifyStudentQR, extractCodeCandidates } from '@/lib/qr-signer';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logAuditAction } from '@/lib/audit-logger';
import { calculateStudentDueMonths, ARABIC_MONTH_NAMES, getCairoNow } from '@/lib/due-months';

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
  }
  return result;
}

async function tryDispatchWA(to: string, body: string) {
  try {
    if (!to || !body) return;

    // 1. HTTP Gateway priority (Vercel)
    const settings = await prisma.systemSettings.findFirst({
      select: {
        enableWhatsApp: true,
        waGatewayUrl: true,
        waApiToken: true,
      }
    });
    if (settings && settings.enableWhatsApp === false) {
      return;
    }

    if (settings?.waGatewayUrl && settings?.waApiToken) {
      const res = await fetch(settings.waGatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.waApiToken}`,
          'bypass-tunnel-reminder': 'true',
        },
        body: JSON.stringify({ token: settings.waApiToken, to, body }),
      });
      if (res.ok) return;
    }

    // 2. Direct Baileys fallback
    const directResult = await sendWhatsAppMessage(to, body);
    if (directResult.success) return;
  } catch { /* fire-and-forget */ }
}

function parseTimeToMinutes(timeStr: string): number {
  let time = timeStr.trim();
  let isPM = false;
  if (time.toLowerCase().endsWith('pm')) {
    isPM = true;
    time = time.slice(0, -2).trim();
  } else if (time.toLowerCase().endsWith('am')) {
    time = time.slice(0, -2).trim();
  }
  const parts = time.split(':');
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] ? parseInt(parts[1], 10) : 0;
  if (isPM && hours < 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export async function POST(req: Request) {
  try {
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = checkRateLimit(clientIp, 'attendance_scan', 'TURBO');
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: `تم تجاوز حد المسح السريع، يرجى الانتظار ${rateLimit.resetSeconds} ثانية` },
        { status: 429 }
      );
    }

    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const {
      studentCode,
      status,
      homeworkStatus,
      forceDuplicate,
      forceDifferentGroup,
      payMonth,
      scanMode,
      selectedMonth,
      selectedYear,
      skipPayment,
    } = await req.json();

    const actualPayMonth = (payMonth || scanMode === 'PAY_ONLY' || scanMode === 'BOTH') && !skipPayment;

    if (!studentCode) {
      return NextResponse.json({ success: false, error: 'الرجاء تمرير كود الطالب أو الباركود' }, { status: 400 });
    }

    // Dynamic HMAC-SHA256 QR Verification
    const qrVerification = verifyStudentQR(studentCode);
    if (!qrVerification.valid) {
      return NextResponse.json({ success: false, error: qrVerification.reason || 'كود الـ QR غير صالح' }, { status: 400 });
    }
    const resolvedCode = qrVerification.studentId;

    // Maintain session states matching Cairo timezone
    await syncTodaySessionsState();

    // Extract all candidate codes (handles URLs like /qr-login?token=..., Arabic keyboard translations, prefixes QR-, etc.)
    const searchCodes = extractCodeCandidates(resolvedCode || studentCode);

    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { code: { in: searchCodes } },
          { qrCode: { in: searchCodes } },
          { id: { in: searchCodes } },
          { phone: { in: searchCodes } },
          { name: { in: searchCodes } },
          { name: studentCode.trim() },
          { parent: { qrCode: { in: searchCodes } } },
          { parent: { phone: { in: searchCodes } } },
        ],
      },
      include: {
        group: {
          include: { academicStage: true }
        },
        academicStage: true,
        parent: true,
        subscriptions: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'لم يتم العثور على الطالب بهذا الباركود أو الاسم' }, { status: 404 });
    }

    const now = getCairoNow();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const hasActiveSub = student.subscriptions.some(
      (s) =>
        (s.month === currentMonth && s.year === currentYear && (s.status === 'PAID' || s.status === 'ACTIVE' || s.isExempt)) ||
        (s.status === 'ACTIVE' && s.endDate >= now)
    );
    
    // Maintain timezone date boundaries in Egypt local time
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // ─────────────────────────────────────────────────────────────────
    // CHECK UNPAID PREVIOUS MONTHS INTERCEPTOR (Rule 1, 2, 3, 4)
    // ─────────────────────────────────────────────────────────────────
    if (actualPayMonth && (!selectedMonth || !selectedYear)) {
      const dueInfo = calculateStudentDueMonths(student);
      if (dueInfo.hasUnpaidPreviousMonths) {
        return NextResponse.json({
          success: false,
          warningType: 'UNPAID_PREVIOUS_MONTHS',
          error: 'توجد متأخرات سابقة على الطالب لم تسدد بعد',
          student: {
            id: student.id,
            name: student.name,
            code: student.code,
            groupName: student.group?.name || 'بدون مجموعة',
            stageName: student.academicStage?.name,
            monthlyPrice: student.academicStage?.monthlyPrice ?? 350,
            phone: student.phone || student.parent?.phone,
            hasActiveSub,
          },
          dueMonths: dueInfo.dueMonths,
          scanMode,
          status: status || 'PRESENT',
          homeworkStatus,
          targetGroupId: student.groupId,
        }, { status: 200 });
      }
    }

    // Determine target month and year for payment
    const targetMonth = selectedMonth ? parseInt(selectedMonth, 10) : currentMonth;
    const targetYear = selectedYear ? parseInt(selectedYear, 10) : currentYear;
    const targetMonthName = ARABIC_MONTH_NAMES[targetMonth] || `شهر ${targetMonth}`;

    // ─────────────────────────────────────────────────────────────────
    // PAY_ONLY INTERCEPTOR
    // ─────────────────────────────────────────────────────────────────
    if (scanMode === 'PAY_ONLY') {
      try {
        const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
        const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

        let subscription = await prisma.subscription.findFirst({
          where: {
            studentId: student.id,
            month: targetMonth,
            year: targetYear,
          },
        });

        const price = student.academicStage?.monthlyPrice ?? 350;
        if (!subscription) {
          subscription = await prisma.subscription.create({
            data: {
              studentId: student.id,
              groupId: student.groupId,
              startDate: startOfMonth,
              endDate: endOfMonth,
              totalSessions: 8,
              price: price,
              status: 'PAID',
              month: targetMonth,
              year: targetYear,
              paidAt: now,
            },
          });
        } else {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'PAID',
              paidAt: now,
            },
          });
        }

        const owner = await prisma.user.findFirst();
        const recorderId = owner?.id || staff.userId || '';

        const existingPayment = await prisma.payment.findFirst({
          where: { subscriptionId: subscription.id },
        });

        if (existingPayment) {
          await prisma.payment.update({
            where: { id: existingPayment.id },
            data: {
              paidAmount: subscription.price,
              remainingAmount: 0,
              month: targetMonth,
              year: targetYear,
              paidAt: now,
            },
          });
        } else {
          await prisma.payment.create({
            data: {
              studentId: student.id,
              subscriptionId: subscription.id,
              totalAmount: subscription.price,
              paidAmount: subscription.price,
              remainingAmount: 0,
              recordedById: recorderId,
              notes: `دفع اشتراك (${targetMonthName} ${targetYear}) فقط من مسح الباركود`,
              month: targetMonth,
              year: targetYear,
              paidAt: now,
            },
          });
        }

        // WhatsApp notification to parent
        const parentPhone = student.parent?.phone || student.phone;
        const parentName = student.parent?.name || 'ولي الأمر';
        const messageBody = `👨‍👩‍👦 أهلاً ${parentName}،\nتم دفع اشتراك (${targetMonthName} ${targetYear}) للطالب: ${student.name} بنجاح 🟢💵\nمنصة المايسترو 🏫`;
        
        if (parentPhone) {
          tryDispatchWA(parentPhone, messageBody);
        }

        return NextResponse.json({
          success: true,
          student: {
            id: student.id,
            name: student.name,
            code: student.code,
            groupName: student.group?.name || 'بدون مجموعة',
            hasActiveSub: true,
            stageName: student.academicStage?.name,
            monthlyPrice: student.academicStage?.monthlyPrice ?? 350,
          },
          message: `تم سداد اشتراك (${targetMonthName} ${targetYear}) وتنبيه ولي الأمر للطالب (${student.name}) بنجاح 💵 (بدون تسجيل حضور)`,
        });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message || 'فشل سداد الاشتراك' }, { status: 500 });
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // 1. LEFT_EARLY Check-out logic
    // ─────────────────────────────────────────────────────────────────
    if (status === 'LEFT_EARLY') {
      const todayAttendance = await prisma.attendance.findFirst({
        where: {
          studentId: student.id,
          createdAt: { gte: todayStart },
          status: { in: ['PRESENT', 'LATE'] }
        },
        include: {
          session: {
            include: { group: true }
          }
        }
      });
      if (todayAttendance) {
        const homeworkNotes = homeworkStatus === 'DONE' ? 'الواجب: مكتمل ✅' : homeworkStatus === 'NOT_DONE' ? 'الواجب: لم يتم ❌' : todayAttendance.notes;
        const updatedAtt = await prisma.attendance.update({
          where: { id: todayAttendance.id },
          data: {
            status: 'LEFT_EARLY',
            checkOutTime: new Date(),
            notes: homeworkNotes || null
          }
        });
        return NextResponse.json({
          success: true,
          student: {
            id: student.id,
            name: student.name,
            code: student.code,
            groupName: todayAttendance.session.group.name,
            hasActiveSub,
            stageName: student.academicStage?.name,
            monthlyPrice: student.academicStage?.monthlyPrice ?? 350,
          },
          attendance: updatedAtt,
          message: `تم تسجيل انصراف مبكر للطالب (${student.name}) بنجاح`
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // 2. Double Scan Check (within 2 hours)
    // ─────────────────────────────────────────────────────────────────
    if (status !== 'LEFT_EARLY') {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const recentAttendance = await prisma.attendance.findFirst({
        where: {
          studentId: student.id,
          createdAt: { gte: twoHoursAgo },
          status: { in: ['PRESENT', 'LATE'] },
        },
        include: {
          session: {
            include: { group: true }
          }
        }
      });

      if (recentAttendance && !forceDuplicate) {
        const checkInTimeStr = recentAttendance.checkInTime
          ? new Date(recentAttendance.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
          : new Date(recentAttendance.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        return NextResponse.json({
          success: false,
          warningType: 'DUPLICATE',
          error: `الطالب سجل حضور بالفعل اليوم في مجموعة (${recentAttendance.session.group.name}) الساعة (${checkInTimeStr}). هل تريد تسجيل الحضور مجدداً؟`,
          student: {
            id: student.id,
            name: student.name,
            code: student.code,
            groupName: recentAttendance.session.group.name,
            hasActiveSub,
          }
        }, { status: 200 });
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // 3. Smart Group & Session Matching Logic
    // ─────────────────────────────────────────────────────────────────
    let targetSession: any = null;
    let targetGroup: any = null;
    let isDifferentGroup = false;

    // A. First check if a session exists for the student's own group today
    const studentGroupTodaySession = await prisma.lessonSession.findFirst({
      where: {
        groupId: student.groupId,
        date: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
      include: {
        group: { include: { academicStage: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    if (studentGroupTodaySession) {
      targetSession = studentGroupTodaySession;
      targetGroup = studentGroupTodaySession.group || student.group;
    } else {
      // B. Check if there are open sessions for other groups today
      const openSessions = await prisma.lessonSession.findMany({
        where: {
          date: {
            gte: todayStart,
            lt: todayEnd,
          },
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
        include: {
          group: { include: { academicStage: true } },
        },
      });

      if (openSessions.length > 0) {
        const otherOpenSession = openSessions[0];
        targetSession = otherOpenSession;
        targetGroup = otherOpenSession.group;
        isDifferentGroup = true;
      } else if (student.groupId && student.group) {
        // C. Auto-create session for student's group for today if none exists
        const slot = parseTimeToMinutes(student.group.startTime)
          ? { startTime: student.group.startTime, endTime: student.group.endTime }
          : { startTime: '16:00', endTime: '18:00' };

        targetSession = await prisma.lessonSession.create({
          data: {
            title: `جلسة ${student.group.name}`,
            groupId: student.groupId,
            date: now,
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: 'OPEN',
            type: 'LECTURE',
          },
          include: {
            group: { include: { academicStage: true } }
          }
        });
        targetGroup = student.group;
      }
    }

    if (!targetSession || !targetGroup) {
      return NextResponse.json({
        success: false,
        error: 'عذراً، لم يتم العثور على مجموعة مناسبة لتسجيل الحضور.',
        student: {
          id: student.id,
          name: student.name,
          code: student.code,
          groupName: student.group?.name || 'بدون مجموعة',
          hasActiveSub,
        }
      }, { status: 400 });
    }

    if (isDifferentGroup) {
      // Stage mismatch check
      if (student.academicStageId !== targetGroup.academicStageId) {
        return NextResponse.json({
          success: false,
          error: `تنبيه: الطالب ليس من هذه المرحلة الدراسية (${student.academicStage?.name || 'مرحلة أخرى'}) والمجموعة الخاصة به مغلقة.`,
          student: {
            id: student.id,
            name: student.name,
            code: student.code,
            groupName: student.group?.name || 'بدون مجموعة',
            hasActiveSub,
          }
        }, { status: 400 });
      }

      // Group mismatch check
      if (!forceDifferentGroup) {
        return NextResponse.json({
          success: false,
          warningType: 'DIFFERENT_GROUP',
          error: `الطالب مسجل في مجموعة (${student.group.name}) وهي مغلقة الآن. المجموعة المفتوحة حالياً هي (${targetGroup.name}). هل تريد تسجيل حضوره في هذه المجموعة؟`,
          targetGroupId: targetGroup.id,
          student: {
            id: student.id,
            name: student.name,
            code: student.code,
            groupName: student.group.name,
            hasActiveSub,
          }
        }, { status: 200 });
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // 5. Determine homework notes
    // ─────────────────────────────────────────────────────────────────
    let homeworkNotes = '';
    if (homeworkStatus === 'DONE') homeworkNotes = 'الواجب: مكتمل ✅';
    else if (homeworkStatus === 'NOT_DONE') homeworkNotes = 'الواجب: لم يتم ❌';

    // ─────────────────────────────────────────────────────────────────
    // 6. Create or update attendance record
    // ─────────────────────────────────────────────────────────────────
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId: student.id,
        sessionId: targetSession.id,
      },
    });

    let attendance;
    if (existingAttendance) {
      attendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          status: status || 'PRESENT',
          checkInTime: new Date(),
          notes: homeworkNotes || null,
        },
      });
    } else {
      attendance = await prisma.attendance.create({
        data: {
          studentId: student.id,
          sessionId: targetSession.id,
          status: status || 'PRESENT',
          checkInTime: new Date(),
          notes: homeworkNotes || null,
        },
      });
    }

    // Log to Audit System asynchronously
    logAuditAction({
      userId: staff.userId,
      action: existingAttendance ? 'ATTENDANCE_UPDATED' : 'ATTENDANCE_RECORDED',
      entity: 'Attendance',
      entityId: attendance.id,
      changes: { studentName: student.name, studentCode: student.code, status: attendance.status, sessionId: targetSession.id },
      ipAddress: clientIp,
    });

    // ─────────────────────────────────────────────────────────────────
    // 7. Auto-Pay Month Logic (Specific month or Current month)
    // ─────────────────────────────────────────────────────────────────
    let paidMessageSuffix = '';
    if (actualPayMonth) {
      try {
        const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
        const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

        let subscription = await prisma.subscription.findFirst({
          where: {
            studentId: student.id,
            month: targetMonth,
            year: targetYear,
          },
        });

        const price = student.academicStage?.monthlyPrice ?? 350;
        if (!subscription) {
          subscription = await prisma.subscription.create({
            data: {
              studentId: student.id,
              groupId: student.groupId,
              startDate: startOfMonth,
              endDate: endOfMonth,
              totalSessions: 8,
              price: price,
              status: 'PAID',
              month: targetMonth,
              year: targetYear,
              paidAt: now,
            },
          });
        } else {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'PAID',
              paidAt: now,
            },
          });
        }

        const owner = await prisma.user.findFirst();
        const recorderId = owner?.id || staff.userId || '';

        const existingPayment = await prisma.payment.findFirst({
          where: { subscriptionId: subscription.id },
        });

        if (existingPayment) {
          await prisma.payment.update({
            where: { id: existingPayment.id },
            data: {
              paidAmount: subscription.price,
              remainingAmount: 0,
              month: targetMonth,
              year: targetYear,
              paidAt: now,
            },
          });
        } else {
          await prisma.payment.create({
            data: {
              studentId: student.id,
              subscriptionId: subscription.id,
              totalAmount: subscription.price,
              paidAmount: subscription.price,
              remainingAmount: 0,
              recordedById: recorderId,
              notes: `دفع اشتراك (${targetMonthName} ${targetYear}) من ماسح الباركود`,
              month: targetMonth,
              year: targetYear,
              paidAt: now,
            },
          });
        }

        // WhatsApp notification to parent
        const parentPhone = student.parent?.phone || student.phone;
        const parentName = student.parent?.name || 'ولي الأمر';
        const messageBody = `👨‍👩‍👦 أهلاً ${parentName}،\nتم دفع اشتراك (${targetMonthName} ${targetYear}) للطالب: ${student.name} وصحح الواجب الخاص به بنجاح 🟢💵\nمنصة المايسترو 🏫`;
        
        if (parentPhone) {
          tryDispatchWA(parentPhone, messageBody);
        }
        paidMessageSuffix = ` وتم سداد اشتراك (${targetMonthName} ${targetYear}) وتنبيه ولي الأمر 💵`;
      } catch (err) {
        console.error('Auto pay error:', err);
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // 8. In-app notifications
    // ─────────────────────────────────────────────────────────────────
    if (status === 'ABSENT') {
      await prisma.notification.create({
        data: {
          title: 'تنبيه غياب',
          message: `تم تسجيل غياب الطالب ${student.name} عن جلسة ${targetSession.title} بتاريخ ${new Date().toLocaleDateString('ar-EG')}`,
          type: 'WARNING',
          recipientId: student.id,
        }
      });
    }

    if (homeworkStatus === 'NOT_DONE') {
      await prisma.notification.create({
        data: {
          title: 'تنبيه واجب لم ينجز',
          message: `لم يقم الطالب ${student.name} بتسليم الواجب المطلوب في جلسة ${targetSession.title}`,
          type: 'ALERT',
          recipientId: student.id,
        }
      });
    }

    // ─────────────────────────────────────────────────────────────────
    // 9. Deduct from subscription if PRESENT
    // ─────────────────────────────────────────────────────────────────
    if ((hasActiveSub || actualPayMonth) && (status === 'PRESENT' || !status)) {
      try {
        const activeSub = await prisma.subscription.findFirst({
          where: {
            studentId: student.id,
            status: { in: ['ACTIVE', 'PAID'] },
          },
        });
        if (activeSub) {
          await prisma.subscription.update({
            where: { id: activeSub.id },
            data: { usedSessions: { increment: 1 } },
          });
        }
      } catch (err) {
        console.error('Failed to deduct session:', err);
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // 10. WhatsApp Attendance Notification (fire-and-forget)
    // ─────────────────────────────────────────────────────────────────
    const settings = await prisma.systemSettings.findFirst({
      select: {
        enableWhatsApp: true,
        waTplAttendance: true,
      }
    });
    if (settings?.enableWhatsApp) {
      const statusLabels: Record<string, string> = {
        PRESENT: 'حاضر ✅', ABSENT: 'غائب ❌', LATE: 'متأخر ⚠️',
        LEFT_EARLY: 'انصرف مبكراً 🔔', EXCUSED: 'غياب بعذر 📋',
      };
      const tpl = settings.waTplAttendance || '📅 تنبيه حضور\nالطالب: [student_name]\nالحالة: [status]\nالوقت: [time]\nمنصة المايسترو 🏫';
      const msg = fillTemplate(tpl, {
        student_name: student.name,
        status: statusLabels[status || 'PRESENT'] || status,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      });
      const parentTarget = student.parent?.whatsapp || student.parent?.phone;
      if (parentTarget) tryDispatchWA(parentTarget, msg);
    }

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        code: student.code,
        groupName: targetGroup.name,
        hasActiveSub: hasActiveSub || actualPayMonth,
        stageName: student.academicStage?.name,
        monthlyPrice: student.academicStage?.monthlyPrice ?? 350,
      },
      attendance,
      message: `تم تسجيل الحضور ${homeworkNotes ? 'و' + homeworkNotes : ''}${paidMessageSuffix}`,
    });
  } catch (e: any) {
    return handleApiError(e);
  }
}
