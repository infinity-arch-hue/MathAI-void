import fs from 'fs';
import path from 'path';
import {
  UserAccount,
  Classroom,
  MathHistoryItem,
  WrongQuizQuestion,
  TeacherQuiz,
  QuizSubmission,
  StudentProgress,
  MathSubjectClassification,
  MATH_SUBJECT_CLASSIFICATIONS,
} from './types';
import { generateClassId, generateUserId, analyzeWeakTopics } from './math-rules';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

interface DatabaseStore {
  users: UserAccount[];
  classrooms: Classroom[];
  mathHistory: MathHistoryItem[];
  wrongAnswers: WrongQuizQuestion[];
  teacherQuizzes: TeacherQuiz[];
  quizSubmissions: QuizSubmission[];
  studentProgress: Record<string, StudentProgress>;
}

// In-memory fallback with persistent JSON backing
let memoryStore: DatabaseStore | null = null;

function getInitialStore(): DatabaseStore {
  return {
    users: [
      {
        id: 'S1024',
        name: 'Alex Turner',
        age: 16,
        email: 'student@example.com',
        role: 'student',
        passwordHash: 'password123',
        educationLevel: 'school',
        standard: 10,
        classId: 'DWX58219',
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
      {
        id: 'T9042',
        name: 'David Wilson',
        age: 38,
        email: 'teacher@example.com',
        role: 'teacher',
        passwordHash: 'password123',
        educationLevel: 'none',
        createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      },
    ],
    classrooms: [
      {
        classId: 'DWX58219',
        className: 'Class 10A Mathematics',
        teacherId: 'T9042',
        teacherName: 'David Wilson',
        studentIds: ['S1024'],
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
      {
        classId: 'DWK34912',
        className: 'Algebra & Calculus Honors',
        teacherId: 'T9042',
        teacherName: 'David Wilson',
        studentIds: [],
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
    ],
    mathHistory: [
      {
        id: 'hist-1',
        userId: 'S1024',
        userName: 'Alex Turner',
        question: 'Solve 2x^2 + 5x - 3 = 0',
        classification: 'Algebra',
        stepProcedure: [
          'Step 1: Identify coefficients a = 2, b = 5, c = -3.',
          'Step 2: Calculate the discriminant D = b^2 - 4ac = 5^2 - 4(2)(-3) = 25 + 24 = 49.',
          'Step 3: Apply the quadratic formula x = (-b ± sqrt(D)) / (2a).',
          'Step 4: Compute x1 = (-5 + 7) / 4 = 2 / 4 = 0.5 and x2 = (-5 - 7) / 4 = -12 / 4 = -3.',
        ],
        englishExplanation:
          'This is a quadratic equation solved using the standard quadratic formula. We first found the discriminant 49, which is positive, indicating two real distinct roots. Calculating both positive and negative square roots yielded 0.5 and -3.',
        finalAnswer: 'x = 0.5 or x = -3',
        queryType: 'math_problem',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
    wrongAnswers: [
      {
        id: 'wrong-1',
        userId: 'S1024',
        question: 'What is the sum of angles in a regular pentagon?',
        options: ['360°', '540°', '720°', '180°'],
        correctAnswer: '540°',
        userAnswer: '360°',
        classification: 'Geometry',
        correctTimesInRandomQuiz: 0,
        explanation: 'For an n-sided polygon, sum = (n - 2) * 180°. For pentagon n=5, (5-2)*180 = 540°.',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'wrong-2',
        userId: 'S1024',
        question: 'Evaluate sin(90°) * cos(0°)',
        options: ['0', '1', '0.5', '2'],
        correctAnswer: '1',
        userAnswer: '0',
        classification: 'Trigonometry',
        correctTimesInRandomQuiz: 0,
        explanation: 'sin(90°) = 1 and cos(0°) = 1, so 1 * 1 = 1.',
        timestamp: new Date(Date.now() - 43200000).toISOString(),
      },
    ],
    teacherQuizzes: [
      {
        id: 'quiz-dw-1',
        classId: 'DWX58219',
        teacherId: 'T9042',
        teacherName: 'David Wilson',
        title: 'Class 10 Mid-Term Math Check',
        questionCount: 5,
        questions: [
          {
            id: 'tq-1',
            question: 'Solve for x: 3x - 7 = 14',
            options: ['x = 7', 'x = 5', 'x = 21', 'x = 6'],
            correctAnswer: 'x = 7',
            classification: 'Algebra',
          },
          {
            id: 'tq-2',
            question: 'What is the area of a right-angled triangle with base 6 and height 8?',
            options: ['24', '48', '14', '32'],
            correctAnswer: '24',
            classification: 'Geometry',
          },
          {
            id: 'tq-3',
            question: 'Evaluate 2^5 * 2^2',
            options: ['128', '64', '256', '32'],
            correctAnswer: '128',
            classification: 'Arithmetic',
          },
          {
            id: 'tq-4',
            question: 'Find the greatest common divisor (GCD) of 36 and 48',
            options: ['12', '6', '18', '24'],
            correctAnswer: '12',
            classification: 'Number Theory',
          },
          {
            id: 'tq-5',
            question: 'If P(A) = 0.35, what is P(not A)?',
            options: ['0.65', '0.35', '0.75', '0.50'],
            correctAnswer: '0.65',
            classification: 'Statistics & Probability',
          },
        ],
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ],
    quizSubmissions: [
      {
        id: 'sub-1',
        quizId: 'quiz-dw-1',
        quizTitle: 'Class 10 Mid-Term Math Check',
        classId: 'DWX58219',
        studentId: 'S1024',
        studentName: 'Alex Turner',
        score: 4,
        totalQuestions: 5,
        answers: [],
        submittedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    studentProgress: {
      S1024: {
        studentId: 'S1024',
        studentName: 'Alex Turner',
        email: 'student@example.com',
        classId: 'DWX58219',
        questionsSolvedCount: 0,
        aiUsageCount: 0,
        quizMistakeCount: 0,
        quizCorrectCount: 0,
        teacherTestPercentages: [],
        overallAccuracyRate: 0,
        weakTopics: [],
        recentMarks: [],
        lastActive: new Date().toISOString(),
      },
    },
  };
}

function loadStore(): DatabaseStore {
  if (memoryStore) return memoryStore;
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      memoryStore = JSON.parse(raw);
      if (memoryStore && memoryStore.studentProgress) {
        Object.values(memoryStore.studentProgress).forEach((prog: any) => {
          if (prog) {
            prog.quizMistakeCount = prog.quizMistakeCount ?? 0;
            prog.quizCorrectCount = prog.quizCorrectCount ?? 0;
            prog.aiUsageCount = prog.aiUsageCount ?? 0;
            prog.overallAccuracyRate = prog.overallAccuracyRate ?? 0;
            prog.teacherTestPercentages = prog.teacherTestPercentages ?? [];
          }
        });
      }
      return memoryStore!;
    }
  } catch (err) {
    console.error('Error loading db store:', err);
  }
  memoryStore = getInitialStore();
  saveStore();
  return memoryStore;
}

function saveStore() {
  if (!memoryStore) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db store:', err);
  }
}

// User methods
export function findUserByEmailOrId(identifier: string): UserAccount | null {
  const store = loadStore();
  const lower = identifier.trim().toLowerCase();
  const user = store.users.find(
    (u) => u.id.toLowerCase() === lower || u.email.toLowerCase() === lower
  );
  return user || null;
}

export function registerUser(params: {
  name: string;
  age: number;
  email: string;
  password: string;
  role: 'student' | 'teacher';
  educationLevel?: 'school' | 'college' | 'none';
  standard?: number;
  classId?: string;
}): { success: boolean; user?: UserAccount; error?: string } {
  const store = loadStore();
  const existing = store.users.find((u) => u.email.toLowerCase() === params.email.trim().toLowerCase());
  if (existing) {
    return { success: false, error: 'User with this email already exists' };
  }

  // Generate ID: 1 char + 4 digits
  const existingIds = store.users.map((u) => u.id);
  const newId = generateUserId(params.role, existingIds);

  const newUser: UserAccount = {
    id: newId,
    name: params.name.trim(),
    age: params.age,
    email: params.email.trim().toLowerCase(),
    role: params.role,
    passwordHash: params.password, // In real setup hashed with bcrypt, matched directly for ease
    educationLevel: params.role === 'teacher' ? 'none' : (params.educationLevel || 'school'),
    standard: params.role === 'student' && params.educationLevel === 'school' ? (params.standard as any) : undefined,
    classId: params.role === 'student' ? params.classId?.trim().toUpperCase() : undefined,
    createdAt: new Date().toISOString(),
  };

  store.users.push(newUser);

  // If student provided valid class ID, add to that classroom
  if (newUser.classId) {
    const classroom = store.classrooms.find((c) => c.classId === newUser.classId);
    if (classroom && !classroom.studentIds.includes(newUser.id)) {
      classroom.studentIds.push(newUser.id);
    }
  }

  // Init progress if student
  if (newUser.role === 'student') {
    store.studentProgress[newUser.id] = {
      studentId: newUser.id,
      studentName: newUser.name,
      email: newUser.email,
      classId: newUser.classId,
      questionsSolvedCount: 0,
      aiUsageCount: 0,
      quizMistakeCount: 0,
      quizCorrectCount: 0,
      teacherTestPercentages: [],
      overallAccuracyRate: 0,
      weakTopics: [],
      recentMarks: [],
      lastActive: new Date().toISOString(),
    };
  }

  saveStore();
  return { success: true, user: newUser };
}

export function updateUserQualification(
  userId: string,
  passwordAttempt: string,
  updates: { educationLevel: 'school' | 'college' | 'none'; standard?: number }
): { success: boolean; error?: string; user?: UserAccount } {
  const store = loadStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return { success: false, error: 'User not found' };

  if (user.passwordHash && user.passwordHash !== passwordAttempt) {
    return { success: false, error: 'Incorrect password. Password required to modify qualification.' };
  }

  user.educationLevel = updates.educationLevel;
  user.standard = updates.educationLevel === 'school' ? (updates.standard as any) : undefined;
  saveStore();
  return { success: true, user };
}

export function updateStudentClassId(
  userId: string,
  classId: string
): { success: boolean; error?: string; user?: UserAccount } {
  const store = loadStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return { success: false, error: 'User not found' };

  const formattedClassId = classId.trim().toUpperCase();
  const classroom = store.classrooms.find((c) => c.classId.trim().toUpperCase() === formattedClassId);
  if (!classroom) {
    return { success: false, error: 'Class ID does not exist' };
  }

  // Remove from old class if any
  if (user.classId) {
    const oldClass = store.classrooms.find((c) => c.classId.trim().toUpperCase() === user.classId?.trim().toUpperCase());
    if (oldClass) {
      oldClass.studentIds = oldClass.studentIds.filter((sid) => sid !== userId);
    }
  }

  user.classId = formattedClassId;
  if (!classroom.studentIds.includes(userId)) {
    classroom.studentIds.push(userId);
  }

  if (store.studentProgress[userId]) {
    store.studentProgress[userId].classId = formattedClassId;
  }

  saveStore();
  return { success: true, user };
}

// Classroom methods
export function createClassroom(
  teacherId: string,
  teacherName: string,
  className: string
): Classroom {
  const store = loadStore();
  const classId = generateClassId(teacherName);
  const newClass: Classroom = {
    classId,
    className: className.trim(),
    teacherId,
    teacherName,
    studentIds: [],
    createdAt: new Date().toISOString(),
  };
  store.classrooms.push(newClass);
  saveStore();
  return newClass;
}

export function getClassroomsForTeacher(teacherId: string): Classroom[] {
  const store = loadStore();
  return store.classrooms.filter((c) => c.teacherId === teacherId);
}

export function getClassroomById(classId: string): Classroom | null {
  const store = loadStore();
  const norm = classId.trim().toUpperCase();
  return store.classrooms.find((c) => c.classId.trim().toUpperCase() === norm) || null;
}

export function deleteClassroom(teacherId: string, classId: string): boolean {
  const store = loadStore();
  const norm = classId.trim().toUpperCase();
  const idx = store.classrooms.findIndex(
    (c) => c.classId.trim().toUpperCase() === norm && c.teacherId === teacherId
  );
  if (idx === -1) return false;
  store.classrooms.splice(idx, 1);
  saveStore();
  return true;
}

export function removeStudentFromClass(
  teacherId: string,
  classId: string,
  studentId: string
): boolean {
  const store = loadStore();
  const norm = classId.trim().toUpperCase();
  const classroom = store.classrooms.find(
    (c) => c.classId.trim().toUpperCase() === norm && c.teacherId === teacherId
  );
  if (!classroom) return false;

  classroom.studentIds = classroom.studentIds.filter((sid) => sid !== studentId);
  const student = store.users.find((u) => u.id === studentId);
  if (student && student.classId?.trim().toUpperCase() === norm) {
    student.classId = undefined;
  }
  saveStore();
  return true;
}

export function addStudentToClass(
  teacherId: string,
  classId: string,
  studentIdOrEmail: string
): { success: boolean; error?: string; student?: UserAccount } {
  const store = loadStore();
  const norm = classId.trim().toUpperCase();
  const classroom = store.classrooms.find(
    (c) => c.classId.trim().toUpperCase() === norm && c.teacherId === teacherId
  );
  if (!classroom) return { success: false, error: 'Class not found' };

  const student = store.users.find(
    (u) =>
      u.role === 'student' &&
      (u.id.toLowerCase() === studentIdOrEmail.toLowerCase() ||
        u.email.toLowerCase() === studentIdOrEmail.toLowerCase())
  );
  if (!student) return { success: false, error: 'Student not found with that ID or email' };

  if (!classroom.studentIds.includes(student.id)) {
    classroom.studentIds.push(student.id);
  }
  student.classId = norm;
  if (store.studentProgress[student.id]) {
    store.studentProgress[student.id].classId = norm;
  }
  saveStore();
  return { success: true, student };
}

// Math History: Store latest 25 math questions under user's name
export function recordMathHistory(
  userId: string,
  userName: string,
  item: Omit<MathHistoryItem, 'id' | 'userId' | 'userName' | 'timestamp'>
): MathHistoryItem {
  const store = loadStore();
  const newItem: MathHistoryItem = {
    ...item,
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId,
    userName,
    timestamp: new Date().toISOString(),
  };

  store.mathHistory.unshift(newItem);

  // Keep latest 25 per user
  const userItems = store.mathHistory.filter((h) => h.userId === userId);
  if (userItems.length > 25) {
    const toKeep = userItems.slice(0, 25);
    store.mathHistory = store.mathHistory.filter(
      (h) => h.userId !== userId || toKeep.some((k) => k.id === h.id)
    );
  }

  // Update student lastActive
  if (userId && userId !== 'guest') {
    if (!store.studentProgress[userId]) {
      const studentUser = store.users.find((u) => u.id === userId);
      store.studentProgress[userId] = {
        studentId: userId,
        studentName: userName || studentUser?.name || 'Student',
        email: studentUser?.email || '',
        classId: studentUser?.classId,
        questionsSolvedCount: 0,
        aiUsageCount: 0,
        quizMistakeCount: 0,
        quizCorrectCount: 0,
        teacherTestPercentages: [],
        overallAccuracyRate: 0,
        weakTopics: [],
        recentMarks: [],
        lastActive: new Date().toISOString(),
      };
    }
    store.studentProgress[userId].lastActive = new Date().toISOString();
  }

  saveStore();
  return newItem;
}

export function incrementStudentAiSearch(userId: string, count: number = 1): number {
  if (!userId || userId === 'guest') return 0;
  const store = loadStore();
  if (!store.studentProgress[userId]) {
    const studentUser = store.users.find((u) => u.id === userId);
    store.studentProgress[userId] = {
      studentId: userId,
      studentName: studentUser?.name || 'Student',
      email: studentUser?.email || '',
      classId: studentUser?.classId,
      questionsSolvedCount: 0,
      aiUsageCount: 0,
      quizMistakeCount: 0,
      quizCorrectCount: 0,
      teacherTestPercentages: [],
      overallAccuracyRate: 0,
      weakTopics: [],
      recentMarks: [],
      lastActive: new Date().toISOString(),
    };
  }
  store.studentProgress[userId].aiUsageCount = (store.studentProgress[userId].aiUsageCount || 0) + count;
  store.studentProgress[userId].lastActive = new Date().toISOString();
  saveStore();
  return store.studentProgress[userId].aiUsageCount;
}

export function getLatestMathHistory(userId: string): MathHistoryItem[] {
  const store = loadStore();
  return store.mathHistory.filter((h) => h.userId === userId).slice(0, 25);
}

// Wrong Answers: Store latest 50 wrongly answered quiz questions
export function recordWrongAnswer(
  userId: string,
  question: string,
  options: string[],
  correctAnswer: string,
  userAnswer: string,
  classification: MathSubjectClassification,
  explanation?: string
): WrongQuizQuestion {
  const store = loadStore();

  // Check if this exact question is already in wrongAnswers
  const existing = store.wrongAnswers.find(
    (w) => w.userId === userId && w.question.trim().toLowerCase() === question.trim().toLowerCase()
  );

  if (existing) {
    existing.userAnswer = userAnswer;
    existing.timestamp = new Date().toISOString();
    saveStore();
    return existing;
  }

  const newWrong: WrongQuizQuestion = {
    id: `wrong-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId,
    question,
    options,
    correctAnswer,
    userAnswer,
    classification,
    correctTimesInRandomQuiz: 0,
    explanation,
    timestamp: new Date().toISOString(),
  };

  store.wrongAnswers.unshift(newWrong);

  // Retain latest 50
  const userWrong = store.wrongAnswers.filter((w) => w.userId === userId);
  if (userWrong.length > 50) {
    const toKeep = userWrong.slice(0, 50);
    store.wrongAnswers = store.wrongAnswers.filter(
      (w) => w.userId !== userId || toKeep.some((k) => k.id === w.id)
    );
  }

  // Update weakness analytics
  if (store.studentProgress[userId]) {
    store.studentProgress[userId].weakTopics = analyzeWeakTopics(
      store.wrongAnswers.filter((w) => w.userId === userId)
    ).map((wt) => ({
      classification: wt.classification,
      wrongCount: wt.wrongCount,
      masteryPercentage: Math.max(20, 100 - wt.wrongCount * 15),
    }));
  }

  saveStore();
  return newWrong;
}

export function getWrongAnswersForUser(userId: string): WrongQuizQuestion[] {
  const store = loadStore();
  return store.wrongAnswers.filter((w) => w.userId === userId).slice(0, 50);
}

export function recordCorrectAnswerForRetryQuestion(userId: string, questionText: string): void {
  const store = loadStore();
  const target = store.wrongAnswers.find(
    (w) => w.userId === userId && w.question.trim().toLowerCase() === questionText.trim().toLowerCase()
  );
  if (target) {
    target.correctTimesInRandomQuiz += 1;
    saveStore();
  }
}

// Teacher Quiz Creation & Results
export function createTeacherQuiz(
  teacherId: string,
  teacherName: string,
  classId: string,
  title: string,
  questions: any[]
): TeacherQuiz {
  const store = loadStore();
  const normalizedClassId = classId.trim().toUpperCase();

  // Ensure classroom entry exists in store so students can join/take tests and teacher can manage it
  const existingClass = store.classrooms.find(
    (c) => c.classId.trim().toUpperCase() === normalizedClassId
  );
  if (!existingClass) {
    store.classrooms.push({
      classId: normalizedClassId,
      className: `Class ${normalizedClassId}`,
      teacherId,
      teacherName,
      studentIds: [],
      createdAt: new Date().toISOString(),
    });
  }

  const newQuiz: TeacherQuiz = {
    id: `tquiz-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    classId: normalizedClassId,
    teacherId,
    teacherName,
    title,
    questionCount: questions.length,
    questions,
    createdAt: new Date().toISOString(),
  };
  store.teacherQuizzes.unshift(newQuiz);
  saveStore();
  return newQuiz;
}

export function getTeacherQuizzes(classId?: string, teacherId?: string): TeacherQuiz[] {
  const store = loadStore();
  const normClassId = classId ? classId.trim().toUpperCase() : undefined;
  return store.teacherQuizzes.filter((q) => {
    if (normClassId && q.classId?.trim().toUpperCase() !== normClassId) return false;
    if (teacherId && q.teacherId !== teacherId) return false;
    return true;
  });
}

export function recordQuizSubmission(submission: Omit<QuizSubmission, 'id' | 'submittedAt'>): QuizSubmission {
  const store = loadStore();

  // Resolve Target Class ID from quiz if missing or empty
  let resolvedClassId = submission.classId ? submission.classId.trim().toUpperCase() : undefined;
  if (!resolvedClassId && submission.quizId) {
    const matchedQuiz = store.teacherQuizzes.find((q) => q.id === submission.quizId);
    if (matchedQuiz?.classId) {
      resolvedClassId = matchedQuiz.classId.trim().toUpperCase();
    }
  }

  const newSub: QuizSubmission = {
    ...submission,
    classId: resolvedClassId,
    id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    submittedAt: new Date().toISOString(),
  };
  store.quizSubmissions.unshift(newSub);

  // Initialize student progress if missing
  if (!store.studentProgress[submission.studentId]) {
    const studentUser = store.users.find((u) => u.id === submission.studentId);
    store.studentProgress[submission.studentId] = {
      studentId: submission.studentId,
      studentName: studentUser?.name || submission.studentName || 'Student',
      email: studentUser?.email || '',
      classId: studentUser?.classId || resolvedClassId,
      questionsSolvedCount: 0,
      aiUsageCount: 0,
      quizMistakeCount: 0,
      quizCorrectCount: 0,
      teacherTestPercentages: [],
      overallAccuracyRate: 0,
      weakTopics: [],
      recentMarks: [],
      lastActive: new Date().toISOString(),
    };
  }

  const prog = store.studentProgress[submission.studentId];
  if (!Array.isArray(prog.teacherTestPercentages)) {
    prog.teacherTestPercentages = [];
  }

  if (submission.source === 'teacher_test') {
    // Teacher Test: calculate test percentage and update Overall Accuracy Rate in realtime
    const currentTestPct = Math.round((submission.score / submission.totalQuestions) * 100);
    const hasPriorTests = prog.teacherTestPercentages.length > 0;
    const oldPct = prog.overallAccuracyRate ?? (hasPriorTests ? prog.teacherTestPercentages[prog.teacherTestPercentages.length - 1] : 0);
    const newAccuracy = hasPriorTests ? Math.round((oldPct + currentTestPct) / 2) : currentTestPct;

    prog.overallAccuracyRate = newAccuracy;
    prog.teacherTestPercentages.push(currentTestPct);
    prog.recentMarks.unshift(currentTestPct);
    if (prog.recentMarks.length > 10) prog.recentMarks.pop();
  } else {
    // Practice Quiz: update Overall Correct in Quiz and Overall Mistakes in Quiz ONLY
    const correctInQuiz = submission.score;
    const mistakesInQuiz = Math.max(0, submission.totalQuestions - submission.score);

    prog.quizCorrectCount = (prog.quizCorrectCount || 0) + correctInQuiz;
    prog.quizMistakeCount = (prog.quizMistakeCount || 0) + mistakesInQuiz;
    prog.questionsSolvedCount = (prog.questionsSolvedCount || 0) + correctInQuiz;
  }

  prog.lastActive = new Date().toISOString();
  saveStore();
  return newSub;
}

export function getQuizSubmissionsForTeacher(
  teacherId: string,
  filterClassId?: string
): (QuizSubmission & { quizTitle: string })[] {
  const store = loadStore();
  const teacherClasses = store.classrooms
    .filter((c) => c.teacherId === teacherId)
    .map((c) => c.classId.trim().toUpperCase());

  const teacherQuizMap = new Map<string, TeacherQuiz>();
  store.teacherQuizzes.forEach((q) => {
    if (q.teacherId === teacherId) {
      teacherQuizMap.set(q.id, q);
    }
  });

  const normFilter = filterClassId && filterClassId !== 'all' ? filterClassId.trim().toUpperCase() : undefined;

  return store.quizSubmissions
    .filter((sub) => {
      const effectiveClassId = (sub.classId || teacherQuizMap.get(sub.quizId)?.classId || '').trim().toUpperCase();
      const isTeacherClass = teacherClasses.some((tc) => tc === effectiveClassId);
      const isTeacherQuiz = teacherQuizMap.has(sub.quizId);
      if (!isTeacherClass && !isTeacherQuiz) return false;

      if (normFilter && effectiveClassId !== normFilter) {
        return false;
      }
      return true;
    })
    .map((sub) => {
      const effectiveClassId = (sub.classId || teacherQuizMap.get(sub.quizId)?.classId || '').trim().toUpperCase();
      return {
        ...sub,
        classId: effectiveClassId || sub.classId,
      };
    });
}

export function getSubmissionsForStudent(studentId: string): QuizSubmission[] {
  const store = loadStore();
  return store.quizSubmissions.filter((sub) => sub.studentId === studentId);
}

export function getStudentProgressListForTeacher(teacherId: string): StudentProgress[] {
  const store = loadStore();
  const teacherClasses = store.classrooms.filter((c) => c.teacherId === teacherId);
  const studentIds = new Set<string>();
  teacherClasses.forEach((c) => c.studentIds.forEach((sid) => studentIds.add(sid)));

  return Array.from(studentIds).map((sid) => {
    if (store.studentProgress[sid]) {
      const p = store.studentProgress[sid];
      return {
        ...p,
        quizMistakeCount: p.quizMistakeCount ?? 0,
        quizCorrectCount: p.quizCorrectCount ?? 0,
        teacherTestPercentages: p.teacherTestPercentages ?? [],
        overallAccuracyRate: p.overallAccuracyRate ?? 0,
      };
    }
    const studentUser = store.users.find((u) => u.id === sid);
    return {
      studentId: sid,
      studentName: studentUser?.name || sid,
      email: studentUser?.email || '',
      classId: studentUser?.classId,
      questionsSolvedCount: 0,
      aiUsageCount: 0,
      quizMistakeCount: 0,
      quizCorrectCount: 0,
      teacherTestPercentages: [],
      overallAccuracyRate: 0,
      weakTopics: [],
      recentMarks: [],
      lastActive: studentUser?.createdAt || new Date().toISOString(),
    };
  });
}

export function getStudentProgress(studentId: string): StudentProgress {
  const store = loadStore();
  if (store.studentProgress[studentId]) {
    const p = store.studentProgress[studentId];
    return {
      ...p,
      quizMistakeCount: p.quizMistakeCount ?? 0,
      quizCorrectCount: p.quizCorrectCount ?? 0,
      teacherTestPercentages: p.teacherTestPercentages ?? [],
      overallAccuracyRate: p.overallAccuracyRate ?? 0,
    };
  }
  const studentUser = store.users.find((u) => u.id === studentId);
  return {
    studentId,
    studentName: studentUser?.name || 'Student',
    email: studentUser?.email || '',
    classId: studentUser?.classId,
    questionsSolvedCount: 0,
    aiUsageCount: 0,
    quizMistakeCount: 0,
    quizCorrectCount: 0,
    teacherTestPercentages: [],
    overallAccuracyRate: 0,
    weakTopics: [],
    recentMarks: [],
    lastActive: new Date().toISOString(),
  };
}

export interface StudentReviewTopicStat {
  topic: MathSubjectClassification;
  correctCount: number;
  mistakeCount: number;
  aiSearches: number;
  totalAttempted: number;
  accuracy: number;
  status: 'Mastered' | 'Strong' | 'Improving' | 'Needs Practice' | 'Unexplored';
}

export interface StudentReviewSummary {
  studentId: string;
  studentName: string;
  classId: string;
  educationLevel: string;
  standard?: number;
  totalMistakeCount: number;
  totalCorrectCount: number;
  totalAiSearches: number;
  totalQuizzesTaken: number;
  overallAccuracy: number;
  recentMarks: number[];
  topicStats: StudentReviewTopicStat[];
}

export function getStudentReviewData(studentId: string): StudentReviewSummary {
  const store = loadStore();
  const student = store.users.find((u) => u.id === studentId);
  const submissions = store.quizSubmissions.filter((s) => s.studentId === studentId);
  const wrongAnswers = store.wrongAnswers.filter((w) => w.userId === studentId);
  const mathHistory = store.mathHistory.filter((h) => h.userId === studentId);
  const progress = store.studentProgress[studentId];

  const topicBreakdown: Record<
    string,
    { correct: number; mistakes: number; aiSearches: number }
  > = {};

  for (const cat of MATH_SUBJECT_CLASSIFICATIONS) {
    topicBreakdown[cat] = { correct: 0, mistakes: 0, aiSearches: 0 };
  }

  // Aggregate student answers from Quiz submissions ONLY (do not count teacher test answers)
  submissions.forEach((sub) => {
    if (sub.source === 'teacher_test') return;
    if (Array.isArray(sub.answers)) {
      sub.answers.forEach((ans) => {
        const cls = (ans.classification || 'Algebra') as string;
        if (!topicBreakdown[cls]) {
          topicBreakdown[cls] = { correct: 0, mistakes: 0, aiSearches: 0 };
        }
        if (ans.isCorrect) {
          topicBreakdown[cls].correct++;
        } else {
          topicBreakdown[cls].mistakes++;
        }
      });
    }
  });

  // Track wrong answers pool from practice quizzes
  wrongAnswers.forEach((w) => {
    const cls = (w.classification || 'Algebra') as string;
    if (topicBreakdown[cls]) {
      if (topicBreakdown[cls].mistakes === 0 && topicBreakdown[cls].correct === 0) {
        topicBreakdown[cls].mistakes = 1;
      }
    }
  });

  // Track topic AI searches
  mathHistory.forEach((h) => {
    const cls = (h.classification || 'Algebra') as string;
    if (topicBreakdown[cls]) {
      topicBreakdown[cls].aiSearches++;
    }
  });

  const topicStats: StudentReviewTopicStat[] = MATH_SUBJECT_CLASSIFICATIONS.map((cls) => {
    const data = topicBreakdown[cls] || { correct: 0, mistakes: 0, aiSearches: 0 };
    const totalTopicQ = data.correct + data.mistakes;
    let accuracy = 0;
    if (totalTopicQ > 0) {
      accuracy = Math.round((data.correct / totalTopicQ) * 100);
    } else if (data.aiSearches > 0) {
      accuracy = 75; // baseline interest for explored topic
    } else {
      accuracy = 0; // unexplored
    }

    let status: StudentReviewTopicStat['status'] = 'Unexplored';
    if (totalTopicQ > 0 || data.aiSearches > 0) {
      if (accuracy >= 85) status = 'Mastered';
      else if (accuracy >= 70) status = 'Strong';
      else if (accuracy >= 50) status = 'Improving';
      else status = 'Needs Practice';
    }

    return {
      topic: cls,
      correctCount: data.correct,
      mistakeCount: data.mistakes,
      aiSearches: data.aiSearches,
      totalAttempted: totalTopicQ,
      accuracy,
      status,
    };
  });

  return {
    studentId,
    studentName: student?.name || 'Student',
    classId: student?.classId || '',
    educationLevel: student?.educationLevel || 'school',
    standard: student?.standard,
    totalMistakeCount: progress?.quizMistakeCount ?? 0,
    totalCorrectCount: progress?.quizCorrectCount ?? 0,
    totalAiSearches: progress?.aiUsageCount ?? 0,
    totalQuizzesTaken: submissions.filter((s) => s.source !== 'teacher_test').length,
    overallAccuracy: progress?.overallAccuracyRate ?? 0,
    recentMarks: progress?.recentMarks || [],
    topicStats,
  };
}

