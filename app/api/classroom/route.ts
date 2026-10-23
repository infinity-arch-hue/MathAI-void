import { NextRequest, NextResponse } from 'next/server';
import {
  createClassroom,
  getClassroomsForTeacher,
  getClassroomById,
  deleteClassroom,
  removeStudentFromClass,
  addStudentToClass,
  createTeacherQuiz,
  getTeacherQuizzes,
  getQuizSubmissionsForTeacher,
  getStudentProgressListForTeacher,
  getStudentProgress,
  getSubmissionsForStudent,
} from '@/lib/db';
import { cleanMathText } from '@/lib/math-rules';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('teacherId');
    const classId = searchParams.get('classId');
    const studentId = searchParams.get('studentId');
    const view = searchParams.get('view'); // 'progress' | 'quizzes' | 'marks' | 'classes'

    if (teacherId) {
      if (view === 'progress') {
        const progressList = getStudentProgressListForTeacher(teacherId);
        return NextResponse.json({ success: true, progressList });
      }

      if (view === 'marks') {
        const submissions = getQuizSubmissionsForTeacher(teacherId, classId || undefined);
        return NextResponse.json({ success: true, submissions });
      }

      const classrooms = getClassroomsForTeacher(teacherId);
      const quizzes = getTeacherQuizzes(undefined, teacherId);
      return NextResponse.json({ success: true, classrooms, quizzes });
    }

    if (classId) {
      const normalizedClassId = classId.trim().toUpperCase();
      const classroom = getClassroomById(normalizedClassId);
      let quizzes = getTeacherQuizzes(normalizedClassId);
      if (studentId) {
        const studentSubmissions = getSubmissionsForStudent(studentId);
        const completedQuizIds = new Set(studentSubmissions.map((s) => s.quizId));
        quizzes = quizzes.filter((q) => !completedQuizIds.has(q.id));
        return NextResponse.json({
          success: true,
          classroom,
          quizzes,
          completedQuizIds: Array.from(completedQuizIds),
        });
      }
      return NextResponse.json({ success: true, classroom, quizzes });
    }

    if (studentId) {
      const progress = getStudentProgress(studentId);
      return NextResponse.json({ success: true, progress });
    }

    return NextResponse.json({ error: 'Missing teacherId, classId, or studentId' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error fetching classroom data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create-class') {
      const { teacherId, teacherName, className } = body;
      if (!teacherId || !teacherName || !className) {
        return NextResponse.json({ error: 'Teacher ID, name, and class name are required' }, { status: 400 });
      }
      const newClass = createClassroom(teacherId, teacherName, className);
      return NextResponse.json({ success: true, classroom: newClass });
    }

    if (action === 'delete-class') {
      const { teacherId, classId } = body;
      if (!teacherId || !classId) {
        return NextResponse.json({ error: 'Teacher ID and Class ID are required' }, { status: 400 });
      }
      const deleted = deleteClassroom(teacherId, classId);
      return NextResponse.json({ success: deleted });
    }

    if (action === 'add-student') {
      const { teacherId, classId, studentIdentifier } = body;
      if (!teacherId || !classId || !studentIdentifier) {
        return NextResponse.json({ error: 'Teacher ID, Class ID, and Student ID/Email are required' }, { status: 400 });
      }
      const res = addStudentToClass(teacherId, classId, studentIdentifier);
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, student: res.student });
    }

    if (action === 'remove-student') {
      const { teacherId, classId, studentId } = body;
      if (!teacherId || !classId || !studentId) {
        return NextResponse.json({ error: 'Teacher ID, Class ID, and Student ID are required' }, { status: 400 });
      }
      const removed = removeStudentFromClass(teacherId, classId, studentId);
      return NextResponse.json({ success: removed });
    }

    if (action === 'create-quiz') {
      const { teacherId, teacherName, classId, title, questions } = body;
      if (!teacherId || !classId || !title || !Array.isArray(questions) || questions.length === 0) {
        return NextResponse.json({ error: 'Teacher ID, Class ID, Title, and Questions are required' }, { status: 400 });
      }

      const normalizedClassId = classId.trim().toUpperCase();
      const cleanedQuestions = questions.map((q: any, idx: number) => ({
        id: `tq-${Date.now()}-${idx}`,
        question: cleanMathText(q.question),
        options: (q.options || []).map((o: string) => cleanMathText(o)),
        correctAnswer: cleanMathText(q.correctAnswer),
        classification: q.classification || 'Algebra',
      }));

      const newQuiz = createTeacherQuiz(teacherId, teacherName, normalizedClassId, title, cleanedQuestions);
      return NextResponse.json({ success: true, quiz: newQuiz });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error processing classroom action' }, { status: 500 });
  }
}
