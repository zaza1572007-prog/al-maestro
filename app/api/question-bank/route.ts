import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaff } from '@/lib/auth';

// GET /api/question-bank - Fetch questions with optional filters
export async function GET(req: Request) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const stageId = searchParams.get('stageId');
    const search = searchParams.get('search');
    const type = searchParams.get('type');

    const where: any = {};
    if (stageId) where.academicStageId = stageId;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { questionText: { contains: search, mode: 'insensitive' } },
      ];
    }

    const questions = await prisma.questionBank.findMany({
      where,
      include: {
        academicStage: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, questions });
  } catch (error: any) {
    console.error('Error fetching question bank:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/question-bank - Add new question to bank
export async function POST(req: Request) {
  try {
    const staff = await verifyStaff(req);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      academicStageId,
      title,
      questionText,
      image,
      type = 'MCQ',
      options = [],
      correctAnswer,
      explanation,
      points = 1,
      tags = []
    } = body;

    if (!questionText?.trim() || correctAnswer === undefined || correctAnswer === null) {
      return NextResponse.json({ success: false, error: 'نص السؤال والإجابة الصحيحة حقول مطلوبة' }, { status: 400 });
    }

    const newQuestion = await prisma.questionBank.create({
      data: {
        academicStageId: academicStageId || null,
        title: title?.trim() || 'سؤال جديد',
        questionText: questionText.trim(),
        image: image || null,
        type,
        options: Array.isArray(options) ? options : [],
        correctAnswer: String(correctAnswer),
        explanation: explanation?.trim() || null,
        points: Number(points) || 1,
        tags: Array.isArray(tags) ? tags : [],
      },
      include: {
        academicStage: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'تمت إضافة السؤال لبنك الأسئلة بنجاح',
      question: newQuestion
    });
  } catch (error: any) {
    console.error('Error adding question to bank:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
