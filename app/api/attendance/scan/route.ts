import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/error-handler';
import { syncTodaySessionsState } from '@/lib/session-sync';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

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

import { verifyStaff } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { studentCode, status, homeworkStatus, forceDuplicate, forceDifferentGroup, payMonth, scanMode } = await req.json();
    const actualPayMonth = payMonth || scanMode === 'BOTH';

    if (!studentCode) {
      return NextResponse.json({ success: false, error: 'الرجاء تمرير كود الطالب أو الباركود' }, { status: 400 });
    }

    // Maintain session states matching Cairo timezone
    await syncTodaySessionsState();

    // Normalize code in case of Arabic keyboard layout translations (e.g. STU-4371 typed as لإا-4371)
    let searchCodes = [studentCode];
    
    // 1. Translate Arabic keyboard layout characters back to English
    const arabicMap: Record<string, string> = {
      'ض': 'q', 'ص': 'w', 'ث': 'e', 'ق': 'r', 'ف': 't', 'غ': 'y', 'ع': 'u', 'ه': 'i', 'خ': 'o', 'ح': 'p',
      'ج': '[', 'د': ']', 'ش': 'a', 'س': 's', 'ي': 'd', 'ب': 'f', 'ل': 'g', 'ا': 'h', 'ت': 'j', 'ن': 'k',
      'م': 'l', 'ك': ';', 'ط': "'", 'ئ': 'z', 'ء': 'x', 'ؤ': 'c', 'ر': 'v', 'لا': 'b', 'ى': 'n', 'ة': 'm',
      'و': ',', 'ز': '.', 'ظ': '/',
      'أ': 's', 'لإ': 't', 'إ': 'u', 'لأ': 'g', 'لآ': 'b', 'آ': 'n'
    };
    let translated = '';
    for (let i = 0; i < studentCode.length; i++) {
      const char = studentCode[i];
      if (i < studentCode.length - 1 && arabicMap[char + studentCode[i+1]]) {
        translated += arabicMap[char + studentCode[i+1]];
        i++;
      } else if (arabicMap[char]) {
        translated += arabicMap[char];
      } else {
        translated += char;
      }
    }
    if (translated !== studentCode) {
      searchCodes.push(translated);
      searchCodes.push(translated.toUpperCase());
    }

    // 2. Extract digits as a fallback and check standard code formats
    const digitMatch = studentCode.match(/\d+/);
    if (digitMatch) {
      const digits = digitMatch[0];
      searchCodes.push(`STU-${digits}`);
      searchCodes.push(`QR-STU-${digits}`);
      searchCodes.push(digits);
    }

    searchCodes = Array.from(new Set(searchCodes.filter(Boolean)));

    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { code: { in: searchCodes } },
          { qrCode: { in: searchCodes } },
          { name: studentCode }
        ],
      },
      include: {
        group: {
          include: { academicStage: true }
        },
        academicStage: true,
        parent: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'لم يتم العثور على الطالب بهذا الباركود أو الاسم' }, { status: 404 });
    }

    const hasActiveSub = student.subscriptions.length > 0;
    
    // Maintain timezone date boundaries in Egypt local time
    const egyptTimeStr = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
    const now = new Date(egyptTimeStr);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // PAY_ONLY Interceptor
    if (scanMode === 'PAY_ONLY') {
      try {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        let subscription = await prisma.subscription.findFirst({
          where: {
            studentId: student.id,
            groupId: student.groupId,
            endDate: { gte: startOfMonth },
          },
          orderBy: { endDate: 'desc' },
        });

        const price = student.academicStage?.monthlyPrice ?? 350;
        if (!subscription) {
          subscription = await prisma.subscription.create({
            data: {
              studentId: student.id,
              groupId: student.groupId,
              startDate: now,
              endDate: endOfMonth,
              totalSessions: 8,
              price: price,
              status: 'ACTIVE',
            },
          });
        }

        const owner = await prisma.user.findFirst();
        const recorderId = owner?.id || '';

        const existingPayment = await prisma.payment.findFirst({
          where: { subscriptionId: subscription.id },
        });

        if (existingPayment) {
          await prisma.payment.update({
            where: { id: existingPayment.id },
            data: {
              paidAmount: subscription.price,
              remainingAmount: 0,
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
              notes: 'دفع اشتراك شهري فقط من مسح الباركود',
            },
          });
        }

        // WhatsApp notification to parent
        const parentPhone = student.parent?.phone || student.phone;
        const parentName = student.parent?.name || 'ولي الأمر';
        const messageBody = `👨‍👩‍👦 أهلاً ${parentName}،\nتم دفع اشتراك الشهر للطالب: ${student.name} وصحح الواجب الخاص به بنجاح 🟢\nمنصة المايسترو 🏫`;
        
        const settings = await prisma.systemSettings.findFirst({
          select: {
            enableWhatsApp: true,
            waGatewayUrl: true,
            waApiToken: true,
          }
        });
        if (settings?.enableWhatsApp && settings?.waGatewayUrl && settings?.waApiToken) {
          fetch(settings.waGatewayUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.waApiToken}` },
            body: JSON.stringify({ token: settings.waApiToken, to: parentPhone, body: messageBody }),
          }).catch((err) => {
            console.error('Failed to dispatch auto-pay WhatsApp gateway notification:', err);
          });
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
          message: `تم سداد اشتراك الشهر وتنبيه ولي الأمر للطالب (${student.name}) بنجاح 💵 (بدون تسجيل حضور)`,
        });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message || 'فشل سداد الاشتراك' }, { status: 500 });
      }
    }

    // 1. LEFT_EARLY Check-out logic
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

    // 2. Double Scan Check (within 2 hours)
    if (status !== 'LEFT_EARLY') {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const recentAttendance = await prisma.attendance.findFirst({
        where: {
          studentId: student.id,
          createdAt: { gte: twoHoursAgo },
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

    // 3. Smart Group & Stage Matching Logic based on Open Sessions
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

    // Check if the student's own group has an open session today
    const studentOwnOpenSession = openSessions.find(s => s.groupId === student.groupId);

    let targetSession = null;
    let targetGroup = null;
    let isDifferentGroup = false;

    if (studentOwnOpenSession) {
      targetSession = studentOwnOpenSession;
      targetGroup = student.group;
    } else {
      // Find if there is any other open session
      if (openSessions.length > 0) {
        // Pick the first open session as target
        const otherOpenSession = openSessions[0];
        targetSession = otherOpenSession;
        targetGroup = otherOpenSession.group;
        isDifferentGroup = true;
      }
    }

     // If no group is open at all
     if (!targetSession || !targetGroup) {
       return NextResponse.json({
         success: false,
         error: 'عذراً، لا توجد أي مجموعة مفتوحة حالياً لتسجيل الحضور.',
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
       // Stage mismatch check: student is from a different stage AND their group is not open
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
 
       // Group mismatch check (prompt the master for approval)
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

    // 5. Determine homework notes
    let homeworkNotes = '';
    if (homeworkStatus === 'DONE') homeworkNotes = 'الواجب: مكتمل ✅';
    else if (homeworkStatus === 'NOT_DONE') homeworkNotes = 'الواجب: لم يتم ❌';

    // 6. Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        studentId: student.id,
        sessionId: targetSession.id,
        status: status || 'PRESENT',
        checkInTime: new Date(),
        notes: homeworkNotes || null,
      },
    });

    // Auto-Pay Month Logic
    let paidMessageSuffix = '';
    if (actualPayMonth) {
      try {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        let subscription = await prisma.subscription.findFirst({
          where: {
            studentId: student.id,
            groupId: student.groupId,
            endDate: { gte: startOfMonth },
          },
          orderBy: { endDate: 'desc' },
        });

        const price = student.academicStage?.monthlyPrice ?? 350;
        if (!subscription) {
          subscription = await prisma.subscription.create({
            data: {
              studentId: student.id,
              groupId: student.groupId,
              startDate: now,
              endDate: endOfMonth,
              totalSessions: 8,
              price: price,
              status: 'ACTIVE',
            },
          });
        }

        const owner = await prisma.user.findFirst();
        const recorderId = owner?.id || '';

        const existingPayment = await prisma.payment.findFirst({
          where: { subscriptionId: subscription.id },
        });

        if (existingPayment) {
          await prisma.payment.update({
            where: { id: existingPayment.id },
            data: {
              paidAmount: subscription.price,
              remainingAmount: 0,
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
              notes: 'دفع تلقائي من ماسح الباركود',
            },
          });
        }

        // WhatsApp notification to parent
        const parentPhone = student.parent?.phone || student.phone;
        const parentName = student.parent?.name || 'ولي الأمر';
        const messageBody = `👨‍👩‍👦 أهلاً ${parentName}،\nتم دفع اشتراك الشهر للطالب: ${student.name} وصحح الواجب الخاص به بنجاح 🟢\nمنصة المايسترو 🏫`;
        
        const settings = await prisma.systemSettings.findFirst({
          select: {
            enableWhatsApp: true,
            waGatewayUrl: true,
            waApiToken: true,
          }
        });
        if (settings?.enableWhatsApp && settings?.waGatewayUrl && settings?.waApiToken) {
          fetch(settings.waGatewayUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.waApiToken}` },
            body: JSON.stringify({ token: settings.waApiToken, to: parentPhone, body: messageBody }),
          }).catch((err) => {
            console.error('Failed to dispatch auto-pay WhatsApp gateway notification:', err);
          });
        }
        paidMessageSuffix = ' وتم سداد اشتراك الشهر وتنبيه ولي الأمر 💵';
      } catch (err) {
        console.error('Auto pay error:', err);
      }
    }

    // 7. In-app notifications
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

    // 8. Deduct from subscription if PRESENT
    if ((hasActiveSub || actualPayMonth) && (status === 'PRESENT' || !status)) {
      try {
        const activeSub = await prisma.subscription.findFirst({
          where: {
            studentId: student.id,
            status: 'ACTIVE',
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

    // 9. WhatsApp Attendance Notification (fire-and-forget)
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
