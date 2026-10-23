export type UserRole = 'student' | 'teacher' | 'guest';

export type EducationLevel = 'school' | 'college' | 'none';

export type SchoolStandard = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const MATH_SUBJECT_CLASSIFICATIONS = [
  'Arithmetic',
  'Algebra',
  'Geometry',
  'Trigonometry',
  'Calculus & Analysis',
  'Number Theory',
  'Topology',
  'Combinatorics',
  'Set Theory & Logic',
  'Statistics & Probability',
  'Linear Algebra',
  'Differential Equations',
  'Operations Research',
  'Game Theory',
  'Computational / Numerical Analysis',
] as const;

export type MathSubjectClassification = (typeof MATH_SUBJECT_CLASSIFICATIONS)[number];

export interface UserAccount {
  id: string; // 1 char + 4 digits: SXXXX or TXXXX
  name: string;
  age: number;
  email: string;
  role: 'student' | 'teacher';
  passwordHash?: string;
  educationLevel: EducationLevel;
  standard?: SchoolStandard; // 1 - 12 if school
  classId?: string; // Optional for student, teachers don't have it at registration
  createdAt: string;
}

export interface Classroom {
  classId: string; // 3 uppercase letters + 5 digits e.g. AHR84210
  className: string;
  teacherId: string;
  teacherName: string;
  createdAt: string;
  studentIds: string[];
}

export interface AiQuestionVerification {
  verifiedQuestion: string;
  verifiedTopic: string;
  needsStepProcedure: boolean;
  verificationReason: string;
}

export interface UserRequirementEvaluation {
  userIntent:
    | 'teach_topic'
    | 'constant_definition'
    | 'theorem'
    | 'table'
    | 'math_problem'
    | 'doubt'
    | 'history_theory'
    | 'command';
  intentLabel: string;
  requirementsIdentified: string[];
  howToAnswer: string;
  needsStepProcedure: boolean;
  aiVerification?: AiQuestionVerification;
  targetWordCount?: string;
  baseFormula?: string;
  additionalFormulas?: string[];
  constantValue?: string;
  tableFormat?: string;
  tableLimit?: number;
}

export type MathQueryType =
  | 'math_problem'
  | 'doubt'
  | 'history_theory'
  | 'command'
  | 'teach_topic'
  | 'constant_definition'
  | 'theorem'
  | 'table';

export interface MathHistoryItem {
  id: string;
  userId: string;
  userName: string;
  question: string;
  classification: MathSubjectClassification;
  stepProcedure: string[];
  englishExplanation: string;
  finalAnswer: string;
  queryType: MathQueryType;
  timestamp: string;
  requirementEvaluation?: UserRequirementEvaluation;
  needsStepProcedure?: boolean;
  aiVerification?: AiQuestionVerification;
}

export interface WrongQuizQuestion {
  id: string;
  userId: string;
  question: string;
  options: string[];
  correctAnswer: string;
  userAnswer: string;
  classification: MathSubjectClassification;
  correctTimesInRandomQuiz: number; // Must reach 2 to be retired
  explanation?: string;
  timestamp: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  classification: MathSubjectClassification;
  isRetryQuestion?: boolean;
}

export interface TeacherQuiz {
  id: string;
  classId: string;
  teacherId: string;
  teacherName: string;
  title: string;
  questionCount: number;
  questions: QuizQuestion[];
  createdAt: string;
}

export interface QuizSubmission {
  id: string;
  quizId: string;
  quizTitle: string;
  classId?: string;
  source?: 'quiz' | 'teacher_test';
  studentId: string;
  studentName: string;
  score: number;
  totalQuestions: number;
  answers: {
    questionId: string;
    question: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    classification: MathSubjectClassification;
  }[];
  submittedAt: string;
}

export interface StudentProgress {
  studentId: string;
  studentName: string;
  email: string;
  classId?: string;
  questionsSolvedCount: number;
  aiUsageCount: number; // total searches/inputs in MATH AI
  quizMistakeCount: number; // wrong answers count from Quiz only
  quizCorrectCount: number; // correct answers count from Quiz only
  teacherTestPercentages: number[]; // history of test percentages from teacher tests
  overallAccuracyRate: number; // calculated realtime from teacher tests (old % + new %)
  weakTopics: {
    classification: MathSubjectClassification;
    wrongCount: number;
    masteryPercentage: number;
  }[];
  recentMarks: number[];
  lastActive: string;
}

export interface FileSolveResultItem {
  questionNumber: number;
  questionSnippet: string;
  finalSolution: string;
  fullStepProcedure: string[];
  fullEnglishExplanation: string;
  classification: MathSubjectClassification;
}
