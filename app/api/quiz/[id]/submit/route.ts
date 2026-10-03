import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { whatsappQueue } from '@/lib/message-queue';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params;
    const body = await request.json();
    const { studentId, answers = {}, timeSpentSeconds = 0 } = body;

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'معرف الطالب مطلوب لتسجيل النتيجة' },
        { status: 400 }
      );
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        group: true,
      },
    });

    if (!exam) {
      return NextResponse.json({ success: false, error: 'الامتحان غير موجود' }, { status: 404 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { parent: true },
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'الطالب غير موجود' }, { status: 404 });
    }

    // Check if already submitted
    const existing = await prisma.examResult.findFirst({
      where: { examId, studentId },
    });

    const rawQuestions = (Array.isArray(exam.questions) ? exam.questions : []) as any[];

    let totalScore = 0;
    let maxCalculated = 0;
    const breakdown: any[] = [];

    rawQuestions.forEach((q: any, idx: number) => {
      const qId = q.id || `q_${idx}`;
      const studentAnswer = answers[qId];
      const correctAnswer = String(q.correctAnswer ?? '0').trim();
      const points = Number(q.points) || 1;
      maxCalculated += points;

      const isCorrect = studentAnswer !== undefined && String(studentAnswer).trim() === correctAnswer;
      const earned = isCorrect ? points : 0;
      totalScore += earned;

      breakdown.push({
        id: qId,
        questionText: q.questionText,
        type: q.type,
        options: q.options || [],
        studentAnswer: studentAnswer !== undefined ? String(studentAnswer) : null,
        correctAnswer: exam.showAnswersAfterSubmit ? correctAnswer : undefined,
        isCorrect,
        points,
        earned,
        explanation: exam.showAnswersAfterSubmit ? q.explanation : undefined,
      });
    });

    const maxScore = maxCalculated > 0 ? maxCalculated : exam.maxScore || 10;
    const percentage = Math.round((totalScore / maxScore) * 100 * 10) / 10;

    let resultRecord;
    if (existing) {
      resultRecord = await prisma.examResult.update({
        where: { id: existing.id },
        data: {
          score: totalScore,
          percentage,
          answers,
          timeSpentSeconds,
          isAutoGraded: true,
        },
      });
    } else {
      resultRecord = await prisma.examResult.create({
        data: {
          examId,
          studentId,
          score: totalScore,
          percentage,
          answers,
          timeSpentSeconds,
          isAutoGraded: true,
        },
      });
    }

    // Send WhatsApp result summary to student and parent
    try {
      const minutes = Math.floor(timeSpentSeconds / 60);
      const seconds = timeSpentSeconds % 60;
      const timeStr = minutes > 0 ? `${minutes} دقيقة و ${seconds} ثانية` : `${seconds} ثانية`;

      let gradeBadge = 'جيد';
      if (percentage >= 90) gradeBadge = 'ممتاز 🌟🏆';
      else if (percentage >= 80) gradeBadge = 'جيد جداً ⭐';
      else if (percentage >= 65) gradeBadge = 'جيد 👍';
      else if (percentage >= 50) gradeBadge = 'مقبول';
      else gradeBadge = 'يحتاج لمزيد من المذاكرة والاهتمام ⚠️';

      const resultMsg = `📊 *نتيجة اختبار كويز إلكتروني: ${exam.title}*
👤 *الطالب:* ${student.name}
👥 *المجموعة:* ${exam.group.name}

⭐ *الدرجة المحصلة:* ${totalScore} من ${maxScore} (${percentage}%)
🏅 *التقدير:* ${gradeBadge}
⏱️ *الوقت المستغرق:* ${timeStr}

📝 *تم تسجيل نتيجتك رسمياً في المنصة. بالتوفيق دائماً!*`;

      if (student.phone) {
        whatsappQueue.enqueue(student.phone, resultMsg);
      }
      if (student.parent?.phone && student.parent.phone !== student.phone) {
        whatsappQueue.enqueue(student.parent.phone, resultMsg);
      }
    } catch (err) {
      console.error('Error sending result WhatsApp notification:', err);
    }

    return NextResponse.json({
      success: true,
      result: {
        id: resultRecord.id,
        score: totalScore,
        maxScore,
        percentage,
        timeSpentSeconds,
        breakdown,
        showAnswersAfterSubmit: exam.showAnswersAfterSubmit,
      },
    });
  } catch (error: any) {
    console.error('Error submitting quiz:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء تصحيح وتسجيل نتيجة الكويز' },
      { status: 500 }
    );
  }
}
