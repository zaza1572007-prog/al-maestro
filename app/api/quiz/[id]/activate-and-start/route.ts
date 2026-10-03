import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

function cleanPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/[^\d]/g, '').trim();
}

function phonesMatch(input: string, record: string | null | undefined): boolean {
  if (!input || !record) return false;
  const cInput = cleanPhone(input);
  const cRecord = cleanPhone(record);
  if (!cInput || !cRecord) return false;

  // Exact match
  if (cInput === cRecord) return true;

  // Suffix matching (e.g. 01012345678 vs 201012345678 or last 9-10 digits)
  const minLen = Math.min(cInput.length, cRecord.length);
  if (minLen >= 9) {
    const endInput = cInput.slice(-9);
    const endRecord = cRecord.slice(-9);
    if (endInput === endRecord) return true;
  }

  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params;
    const body = await request.json();
    const { mode = 'ACTIVATION', studentId, studentPhone, parentPhone, studentCode, password } = body;

    // 1. Fetch Exam
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        group: {
          include: { academicStage: true },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ success: false, error: 'الكويز غير موجود' }, { status: 404 });
    }

    if (!exam.isOpen) {
      return NextResponse.json(
        { success: false, error: 'هذا الكويز مغلق حالياً من قِبل المعلم' },
        { status: 403 }
      );
    }

    let student: any = null;

    if (mode === 'CREDENTIALS') {
      // Direct Login with Student Code + Password
      if (!studentCode || !password) {
        return NextResponse.json(
          { success: false, error: 'يرجى إدخال كود الطالب وكلمة المرور' },
          { status: 400 }
        );
      }

      student = await prisma.student.findFirst({
        where: {
          code: String(studentCode).trim(),
          isDeleted: false,
        },
        include: {
          parent: true,
          group: true,
        },
      });

      if (!student) {
        return NextResponse.json(
          { success: false, error: 'كود الطالب غير صحيح أو غير مسجل' },
          { status: 404 }
        );
      }

      const inputPass = String(password).trim();
      const validPass = (student.passwordPlain && student.passwordPlain === inputPass) ||
        (student.password && student.password === inputPass);

      if (!validPass) {
        return NextResponse.json(
          { success: false, error: 'كلمة المرور غير صحيحة' },
          { status: 401 }
        );
      }
    } else {
      // First-time Activation with Name & Phone Numbers
      if (!studentId) {
        return NextResponse.json(
          { success: false, error: 'يرجى اختيار اسم الطالب من القائمة' },
          { status: 400 }
        );
      }

      if (!studentPhone || !parentPhone) {
        return NextResponse.json(
          { success: false, error: 'يرجى إدخال رقم هاتف الطالب ورقم هاتف ولي الأمر' },
          { status: 400 }
        );
      }

      student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          parent: true,
          group: true,
        },
      });

      if (!student || student.isDeleted) {
        return NextResponse.json(
          { success: false, error: 'الطالب المحدد غير مسجل أو تم حذفه' },
          { status: 404 }
        );
      }

      if (student.groupId !== exam.groupId) {
        return NextResponse.json(
          { success: false, error: 'هذا الطالب غير مسجل في المجموعة المخصصة لهذا الكويز' },
          { status: 403 }
        );
      }

      // Verify Student Phone
      const isStudentPhoneValid = phonesMatch(studentPhone, student.phone);

      // Verify Parent Phone
      const isParentPhoneValid =
        phonesMatch(parentPhone, student.parent?.phone) ||
        phonesMatch(parentPhone, student.parent?.whatsapp) ||
        phonesMatch(parentPhone, student.parent?.extraPhone);

      if (!isStudentPhoneValid || !isParentPhoneValid) {
        let errorMsg = 'بيانات التحقق غير متطابقة مع السجلات: ';
        if (!isStudentPhoneValid && !isParentPhoneValid) {
          errorMsg += 'رقم هاتف الطالب ورقم ولي الأمر غير مطابقين.';
        } else if (!isStudentPhoneValid) {
          errorMsg += 'رقم هاتف الطالب غير مطابق للرقم المسجل.';
        } else {
          errorMsg += 'رقم هاتف ولي الأمر غير مطابق للرقم المسجل.';
        }
        return NextResponse.json({ success: false, error: errorMsg }, { status: 401 });
      }
    }

    // 5. Check if student already submitted this exam
    const existingResult = await prisma.examResult.findFirst({
      where: {
        examId,
        studentId: student.id,
      },
    });

    if (existingResult) {
      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        student: {
          id: student.id,
          name: student.name,
          code: student.code,
        },
        result: {
          score: existingResult.score,
          percentage: existingResult.percentage,
          maxScore: exam.maxScore,
          startedAt: existingResult.startedAt,
          timeSpentSeconds: existingResult.timeSpentSeconds,
        },
      });
    }

    // 6. Send WhatsApp message with credentials in background
    const host = request.headers.get('host') || 'almaestro.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const loginUrl = `${protocol}://${host}/login`;

    const passwordToSend = student.passwordPlain || '123456';
    const waMessage = `🎓 *أهلاً بك يا ${student.name} في منصة المايسترو التعليمية*

✅ تم التحقق من هويتك بنجاح وبدء اختبار *(${exam.title})* 🚀

📌 *بيانات تسجيل دخولك الرسمية للمنصة (احتفظ بها دائماً):*
👤 *كود الطالب (اسم المستخدم):* \`${student.code}\`
🔑 *كلمة المرور:* \`${passwordToSend}\`
👥 *المجموعة:* ${student.group.name}

🌐 *رابط المنصة:* ${loginUrl}

⭐ *نتمنى لك التوفيق والدرجة النهائية في اختبار اليوم!*`;

    try {
      const waPromises: Promise<any>[] = [];
      // Send to student
      if (student.phone) {
        waPromises.push(sendWhatsAppMessage(student.phone, waMessage));
      }
      // Send to parent as well
      if (student.parent?.phone && student.parent.phone !== student.phone) {
        waPromises.push(sendWhatsAppMessage(student.parent.phone, waMessage));
      }

      if (waPromises.length > 0) {
        // Await with a 3.5s timeout so quiz start is never blocked or delayed on serverless
        await Promise.race([
          Promise.allSettled(waPromises),
          new Promise((resolve) => setTimeout(resolve, 3500)),
        ]);
      }
    } catch (waErr) {
      console.error('Failed to dispatch WhatsApp activation message:', waErr);
    }

    // 7. Prepare questions (hide correct answers and explanations until submission)
    const rawQuestions = (Array.isArray(exam.questions) ? exam.questions : []) as any[];
    
    // Optional shuffle if enabled
    let questionsForStudent = rawQuestions.map((q: any, idx: number) => ({
      id: q.id || `q_${idx}`,
      questionText: q.questionText,
      type: q.type || 'MCQ',
      options: q.options || [],
      points: q.points || 1,
      image: q.image || null,
    }));

    if (exam.shuffleQuestions) {
      questionsForStudent = [...questionsForStudent].sort(() => Math.random() - 0.5);
    }

    return NextResponse.json({
      success: true,
      alreadySubmitted: false,
      student: {
        id: student.id,
        name: student.name,
        code: student.code,
      },
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        duration: exam.duration || 15,
        maxScore: exam.maxScore,
        questionsCount: questionsForStudent.length,
        questions: questionsForStudent,
        showAnswersAfterSubmit: exam.showAnswersAfterSubmit,
      },
    });
  } catch (error: any) {
    console.error('Error in quiz activation:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء تفعيل الجلسة والتحقق من البيانات' },
      { status: 500 }
    );
  }
}
