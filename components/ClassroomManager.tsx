'use client';

import React, { useState, useEffect } from 'react';
import { UserAccount, Classroom, StudentProgress, TeacherQuiz, QuizSubmission } from '@/lib/types';
import {
  Users,
  Plus,
  Trash2,
  UserPlus,
  UserMinus,
  BarChart3,
  ClipboardList,
  CheckCircle2,
  Calendar,
  Sparkles,
  Loader2,
  TrendingUp,
  Brain,
  Award,
  Edit3,
  BookOpen,
  Eye,
  X,
  XCircle,
  FileDown,
  AlertCircle,
  AlertTriangle,
  BrainCircuit,
  RefreshCw,
} from 'lucide-react';
import { exportStudentSubmissionTestToPDF, exportStudentReviewReportToPDF } from '@/lib/export-pdf';
import { StudentReviewSummary } from '@/lib/db';

interface ClassroomManagerProps {
  teacher: UserAccount;
  activeSubView?: 'classroom' | 'student_progress' | 'quiz_creator';
  setBackgroundJobRunning: (running: boolean) => void;
}

export const ClassroomManager: React.FC<ClassroomManagerProps> = ({
  teacher,
  activeSubView = 'classroom',
  setBackgroundJobRunning,
}) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [progressList, setProgressList] = useState<StudentProgress[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [quizzes, setQuizzes] = useState<TeacherQuiz[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New Class Form
  const [newClassName, setNewClassName] = useState('');
  const [isCreatingClass, setIsCreatingClass] = useState(false);

  // Add Student to Class Form
  const [selectedClassForStudent, setSelectedClassForStudent] = useState<string>('');
  const [studentIdentifierToAdd, setStudentIdentifierToAdd] = useState('');
  const [addStudentError, setAddStudentError] = useState('');
  const [addStudentSuccess, setAddStudentSuccess] = useState('');

  // Create Quiz Form
  const [quizClassId, setQuizClassId] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [quizMode, setQuizMode] = useState<'ai_generated' | 'teacher_typed'>('ai_generated');
  const [quizQuestionCount, setQuizQuestionCount] = useState<number>(3);
  const [aiTopic, setAiTopic] = useState<string>('Random');
  const [aiEducationLevel, setAiEducationLevel] = useState<string>('school');
  const [aiStandard, setAiStandard] = useState<string>('10');
  const [isGeneratingAIQuestions, setIsGeneratingAIQuestions] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<
    { question: string; options: string[]; correctAnswer: string; classification: string }[]
  >([
    {
      question: 'Solve for x: 2x + 6 = 18',
      options: ['x = 6', 'x = 4', 'x = 8', 'x = 12'],
      correctAnswer: 'x = 6',
      classification: 'Algebra',
    },
    {
      question: 'What is the square root of 144?',
      options: ['12', '14', '11', '16'],
      correctAnswer: '12',
      classification: 'Arithmetic',
    },
    {
      question: 'Find the perimeter of an equilateral triangle with side 7 cm',
      options: ['21 cm', '14 cm', '28 cm', '49 cm'],
      correctAnswer: '21 cm',
      classification: 'Geometry',
    },
  ]);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const [quizSuccess, setQuizSuccess] = useState('');
  const [quizError, setQuizError] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<QuizSubmission | null>(null);
  const [marksClassFilter, setMarksClassFilter] = useState<string>('all');
  const [isCustomTargetClass, setIsCustomTargetClass] = useState<boolean>(false);
  const [customTargetClassInput, setCustomTargetClassInput] = useState<string>('');

  // Realtime Student Review State
  const [selectedStudentForReview, setSelectedStudentForReview] = useState<string | null>(null);
  const [studentReviewData, setStudentReviewData] = useState<StudentReviewSummary | null>(null);
  const [isLoadingStudentReview, setIsLoadingStudentReview] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'needs_practice' | 'mastered' | 'active'>('all');

  // Interactive in-app confirmation modal state for deleting class and removing student
  const [confirmModal, setConfirmModal] = useState<{
    type: 'delete-class' | 'remove-student';
    classId: string;
    className?: string;
    studentId?: string;
  } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const handleSelectStudentForReview = async (studentId: string) => {
    setSelectedStudentForReview(studentId);
    setIsLoadingStudentReview(true);
    try {
      const res = await fetch(`/api/student/review?studentId=${encodeURIComponent(studentId)}`);
      const data = await res.json();
      if (data && data.success && data.review) {
        setStudentReviewData(data.review);
      }
    } catch (err) {
      console.error('Failed to fetch realtime student review:', err);
    } finally {
      setIsLoadingStudentReview(false);
    }
  };

  const handleRefreshStudentReview = async () => {
    if (!selectedStudentForReview) return;
    setIsLoadingStudentReview(true);
    try {
      const res = await fetch(`/api/student/review?studentId=${encodeURIComponent(selectedStudentForReview)}`);
      const data = await res.json();
      if (data && data.success && data.review) {
        setStudentReviewData(data.review);
      }
    } catch (err) {
      console.error('Failed to refresh realtime student review:', err);
    } finally {
      setIsLoadingStudentReview(false);
    }
  };

  const handleExportStudentReviewPDF = () => {
    if (!studentReviewData) return;
    exportStudentReviewReportToPDF({
      studentName: studentReviewData.studentName,
      studentId: studentReviewData.studentId,
      classId: studentReviewData.classId,
      standard: studentReviewData.standard,
      educationLevel: studentReviewData.educationLevel,
      totalMistakeCount: studentReviewData.totalMistakeCount,
      totalCorrectCount: studentReviewData.totalCorrectCount,
      totalAiSearches: studentReviewData.totalAiSearches,
      overallAccuracy: studentReviewData.overallAccuracy,
      totalQuizzesTaken: studentReviewData.totalQuizzesTaken,
      topicStats: studentReviewData.topicStats.map((t) => ({
        topic: t.topic,
        correctCount: t.correctCount,
        mistakeCount: t.mistakeCount,
        aiSearches: t.aiSearches,
        accuracy: t.accuracy,
        status: t.status,
      })),
    });
  };

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const loadData = () => setRefreshTrigger((prev) => prev + 1);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      fetch(`/api/classroom?teacherId=${teacher.id}`),
      fetch(`/api/classroom?teacherId=${teacher.id}&view=progress`),
      fetch(`/api/classroom?teacherId=${teacher.id}&view=marks`),
    ])
      .then(([classRes, progRes, marksRes]) =>
        Promise.all([classRes.json(), progRes.json(), marksRes.json()])
      )
      .then(([classData, progData, marksData]) => {
        if (ignore) return;
        if (classData.classrooms) {
          setClassrooms(classData.classrooms);
          if (classData.classrooms.length > 0) {
            if (!selectedClassForStudent) {
              setSelectedClassForStudent(classData.classrooms[0].classId);
            }
            setQuizClassId((prev) => {
              if (prev && classData.classrooms.some((c: Classroom) => c.classId === prev)) {
                return prev;
              }
              return classData.classrooms[0].classId;
            });
          } else {
            setIsCustomTargetClass(true);
          }
        }
        if (classData.quizzes) setQuizzes(classData.quizzes);
        if (progData.progressList) setProgressList(progData.progressList);
        if (marksData.submissions) setSubmissions(marksData.submissions);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching teacher data:', err);
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [teacher.id, selectedClassForStudent, refreshTrigger]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    setIsCreatingClass(true);
    try {
      const res = await fetch('/api/classroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-class',
          teacherId: teacher.id,
          teacherName: teacher.name,
          className: newClassName.trim(),
        }),
      });
      const data = await res.json();
      if (data.classroom) {
        setClassrooms((prev) => [...prev, data.classroom]);
        setNewClassName('');
        loadData();
      }
    } catch (err) {
      console.error('Error creating class:', err);
    } finally {
      setIsCreatingClass(false);
    }
  };

  const promptDeleteClass = (classId: string, className?: string) => {
    setConfirmModal({
      type: 'delete-class',
      classId,
      className,
    });
  };

  const promptRemoveStudent = (classId: string, studentId: string) => {
    setConfirmModal({
      type: 'remove-student',
      classId,
      studentId,
    });
  };

  const executeConfirmedAction = async () => {
    if (!confirmModal) return;
    setIsProcessingAction(true);
    try {
      if (confirmModal.type === 'delete-class') {
        const res = await fetch('/api/classroom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete-class',
            teacherId: teacher.id,
            classId: confirmModal.classId,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setClassrooms((prev) => prev.filter((c) => c.classId !== confirmModal.classId));
          loadData();
        }
      } else if (confirmModal.type === 'remove-student') {
        const res = await fetch('/api/classroom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'remove-student',
            teacherId: teacher.id,
            classId: confirmModal.classId,
            studentId: confirmModal.studentId,
          }),
        });
        const data = await res.json();
        if (data.success) {
          loadData();
        }
      }
    } catch (err) {
      console.error('Error executing action:', err);
    } finally {
      setIsProcessingAction(false);
      setConfirmModal(null);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassForStudent || !studentIdentifierToAdd.trim()) return;
    setAddStudentError('');
    setAddStudentSuccess('');

    try {
      const res = await fetch('/api/classroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-student',
          teacherId: teacher.id,
          classId: selectedClassForStudent,
          studentIdentifier: studentIdentifierToAdd.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAddStudentSuccess(`Student ${data.student?.name} (${data.student?.id}) added!`);
        setStudentIdentifierToAdd('');
        loadData();
      } else {
        setAddStudentError(data.error || 'Failed to add student');
      }
    } catch (err) {
      setAddStudentError('Network error');
    }
  };

  const handleGenerateAIQuestions = async () => {
    setIsGeneratingAIQuestions(true);
    setBackgroundJobRunning(true);
    setQuizError('');
    try {
      const res = await fetch(
        `/api/quiz?count=${quizQuestionCount}&topic=${encodeURIComponent(
          aiTopic
        )}&educationLevel=${aiEducationLevel}&standard=${aiStandard}`
      );
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.questions && data.questions.length > 0) {
          const generated = data.questions.slice(0, quizQuestionCount).map((q: any) => ({
            question: q.question,
            options: q.options || [],
            correctAnswer: q.correctAnswer || (q.options ? q.options[0] : ''),
            classification: q.classification || (aiTopic === 'Random' ? 'Algebra' : aiTopic),
          }));

          // If AI returned fewer questions than requested, fill the remainder with math template questions
          if (generated.length < quizQuestionCount) {
            const diff = quizQuestionCount - generated.length;
            const extra = Array.from({ length: diff }).map((_, i) => {
              const qNum = generated.length + i + 1;
              const a = qNum * 2 + 2;
              const b = qNum * 3 + 1;
              return {
                question: `Solve for x: ${a}x + ${b} = ${a * 4 + b}`,
                options: [`x = 4`, `x = 2`, `x = 6`, `x = 5`],
                correctAnswer: 'x = 4',
                classification: aiTopic === 'Random' ? 'Algebra' : aiTopic,
              };
            });
            setQuizQuestions([...generated, ...extra]);
          } else {
            setQuizQuestions(generated);
          }
        }
      }
    } catch (err) {
      console.warn('AI question generator notice:', err);
    } finally {
      setIsGeneratingAIQuestions(false);
      setBackgroundJobRunning(false);
    }
  };

  const handleQuestionCountChange = (countVal: number | string) => {
    let num = typeof countVal === 'string' ? parseInt(countVal) : countVal;
    if (isNaN(num)) {
      num = 1;
    }
    const newCount = Math.max(1, Math.min(20, num));
    setQuizQuestionCount(newCount);

    // Synchronize question list for both AI-generated and Teacher-typed modes
    setQuizQuestions((prev) => {
      if (prev.length < newCount) {
        const additional = Array.from({ length: newCount - prev.length }).map((_, i) => {
          const qNum = prev.length + i + 1;
          const a = qNum + 2;
          const b = qNum * 2 + 3;
          return {
            question: `Solve for x: ${a}x + ${b} = ${a * 5 + b}`,
            options: [`x = 5`, `x = 3`, `x = 7`, `x = 2`],
            correctAnswer: 'x = 5',
            classification: aiTopic === 'Random' ? 'Algebra' : aiTopic,
          };
        });
        return [...prev, ...additional];
      } else {
        return prev.slice(0, newCount);
      }
    });
  };

  const handleAddQuestion = () => {
    if (quizQuestionCount >= 20) return;
    const newCount = Math.min(20, quizQuestions.length + 1);
    setQuizQuestions((prev) => [
      ...prev,
      {
        question: `Question ${newCount}: `,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option A',
        classification: aiTopic === 'Random' ? 'Algebra' : aiTopic,
      },
    ]);
    setQuizQuestionCount(newCount);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (quizQuestions.length <= 1) return;
    const remaining = quizQuestions.filter((_, i) => i !== idx);
    setQuizQuestions(remaining);
    setQuizQuestionCount(remaining.length);
  };

  const handleUpdateQuestion = (idx: number, field: string, value: any) => {
    setQuizQuestions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleUpdateOption = (qIdx: number, optIdx: number, val: string) => {
    setQuizQuestions((prev) => {
      const next = [...prev];
      const newOpts = [...next[qIdx].options];
      const prevOptVal = newOpts[optIdx];
      newOpts[optIdx] = val;
      let newCorrect = next[qIdx].correctAnswer;
      if (newCorrect === prevOptVal) {
        newCorrect = val;
      }
      next[qIdx] = { ...next[qIdx], options: newOpts, correctAnswer: newCorrect };
      return next;
    });
  };

  const handleCreateTeacherQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuizError('');
    setQuizSuccess('');

    // Determine target class ID (either custom input or selected class from dropdown)
    const rawClassId = isCustomTargetClass
      ? customTargetClassInput
      : (quizClassId || (classrooms.length > 0 ? classrooms[0].classId : ''));
    const targetClassId = (rawClassId || '').trim().toUpperCase();

    if (!targetClassId) {
      setQuizError('Please select or enter a valid Target Class ID (e.g. DWX58219).');
      return;
    }

    // Determine title
    const effectiveTitle = quizTitle.trim() || `${aiTopic === 'Random' ? 'Mathematics' : aiTopic} Practice & Evaluation`;

    // Strictly ensure the quiz question count matches the configured question count
    const finalQuestions = quizQuestions.slice(0, quizQuestionCount);

    if (finalQuestions.length === 0) {
      setQuizError('The quiz must contain at least 1 question.');
      return;
    }

    // Validate that questions are not blank
    for (let i = 0; i < finalQuestions.length; i++) {
      if (!finalQuestions[i].question.trim()) {
        setQuizError(`Question ${i + 1} text is empty. Please enter question text.`);
        return;
      }
      if (!finalQuestions[i].options || finalQuestions[i].options.length < 2) {
        setQuizError(`Question ${i + 1} must have at least 2 options.`);
        return;
      }
      if (!finalQuestions[i].correctAnswer.trim()) {
        setQuizError(`Question ${i + 1} must have a designated correct answer.`);
        return;
      }
    }

    setIsCreatingQuiz(true);

    try {
      const res = await fetch('/api/classroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-quiz',
          teacherId: teacher.id,
          teacherName: teacher.name,
          classId: targetClassId,
          title: effectiveTitle,
          questions: finalQuestions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQuizSuccess(`Quiz "${effectiveTitle}" published successfully for Class ${targetClassId}! (${finalQuestions.length} questions). Enrolled students can now take it.`);
        setQuizTitle('');
        loadData();
      } else {
        setQuizError(data.error || 'Failed to publish quiz. Please check details.');
      }
    } catch (err: any) {
      console.error('Error creating quiz:', err);
      setQuizError('Network error while publishing quiz.');
    } finally {
      setIsCreatingQuiz(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Sub-view 1: Classroom Management */}
      {activeSubView === 'classroom' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-indigo-600" />
                <span>Classroom Management</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Create and manage Class IDs (e.g. DWX58219), add or remove students, and assign
                tests.
              </p>
            </div>
          </div>

          {/* Create New Class Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Create New Class ID</span>
            </h2>
            <form onSubmit={handleCreateClass} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Class Name (e.g. 10th Standard Mathematics, Calculus A)"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={isCreatingClass || !newClassName.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                {isCreatingClass ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>Generate Class ID</span>
              </button>
            </form>
          </div>

          {/* Add Student to Class Card */}
          {classrooms.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>Add Student to Class</span>
              </h2>
              <form onSubmit={handleAddStudent} className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedClassForStudent}
                  onChange={(e) => setSelectedClassForStudent(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                >
                  {classrooms.map((c) => (
                    <option key={c.classId} value={c.classId}>
                      {c.className} ({c.classId})
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Student ID (e.g. S1024) or Email"
                  value={studentIdentifierToAdd}
                  onChange={(e) => setStudentIdentifierToAdd(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />

                <button
                  type="submit"
                  disabled={!studentIdentifierToAdd.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Student</span>
                </button>
              </form>
              {addStudentSuccess && (
                <p className="text-xs text-emerald-600 font-medium mt-2">{addStudentSuccess}</p>
              )}
              {addStudentError && (
                <p className="text-xs text-rose-500 font-medium mt-2">{addStudentError}</p>
              )}
            </div>
          )}

          {/* List of Managed Classrooms */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Class IDs ({classrooms.length})
            </h2>

            {classrooms.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
                No classrooms created yet. Create your first Class ID above!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classrooms.map((c) => (
                  <div
                    key={c.classId}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">
                          {c.className}
                        </h3>
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs mt-1 border border-indigo-200 dark:border-indigo-800/60">
                          Class ID: {c.classId}
                        </div>
                      </div>

                      <button
                        onClick={() => promptDeleteClass(c.classId, c.className)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete Class ID"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                        <span>Enrolled Students ({c.studentIds.length})</span>
                      </div>

                      {c.studentIds.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          No students in this class yet. Give them Class ID <strong>{c.classId}</strong> to join!
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {c.studentIds.map((sid) => (
                            <div
                              key={sid}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs"
                            >
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                Student ID: {sid}
                              </span>
                              <button
                                onClick={() => promptRemoveStudent(c.classId, sid)}
                                className="text-rose-500 hover:text-rose-700 text-xs font-medium flex items-center gap-1 cursor-pointer"
                              >
                                <UserMinus className="w-3 h-3" />
                                <span>Remove</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-view 2: Student Progress */}
      {activeSubView === 'student_progress' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
                <span>Student Progress & Realtime Review</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Click any student tab to view their realtime mathematics review, quiz mistakes/correct answers, AI searches, and test accuracy rate.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Students</span>
              </button>
            </div>
          </div>

          {/* Interactive Student Tabs Selector */}
          {progressList.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Student Tabs (Click to view Realtime Review):</span>
                </span>
                <span className="text-xs text-slate-400">
                  {progressList.length} student{progressList.length > 1 ? 's' : ''} enrolled
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {progressList.map((prog) => {
                  const isSelected = selectedStudentForReview === prog.studentId;
                  return (
                    <button
                      key={prog.studentId}
                      onClick={() => handleSelectStudentForReview(prog.studentId)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-2 ring-indigo-400 scale-102'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-300'
                      }`}
                    >
                      <span>{prog.studentName}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                          isSelected
                            ? 'bg-indigo-700 text-indigo-100'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                        }`}
                      >
                        {prog.studentId}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Realtime Review Display Panel when Teacher selects a Student Tab */}
          {selectedStudentForReview && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-indigo-500/40 p-5 sm:p-6 space-y-6 shadow-lg shadow-indigo-500/5 relative animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>LIVE REALTIME REVIEW</span>
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400">
                      ID: {selectedStudentForReview}
                    </span>
                    {studentReviewData?.classId && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        Class: {studentReviewData.classId}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-indigo-600" />
                    <span>{studentReviewData?.studentName || 'Student'} Realtime Review</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Live asynchronous review metrics updated continuously from practice quizzes, AI interactions, and teacher tests.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRefreshStudentReview}
                    disabled={isLoadingStudentReview}
                    className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
                    title="Refresh Realtime Review Data"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingStudentReview ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={handleExportStudentReviewPDF}
                    disabled={!studentReviewData || isLoadingStudentReview}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Export PDF</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedStudentForReview(null);
                      setStudentReviewData(null);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Close Review Panel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {isLoadingStudentReview && !studentReviewData ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
                  <p className="text-sm font-semibold text-slate-500">
                    Fetching live student review asynchronously...
                  </p>
                </div>
              ) : studentReviewData ? (
                <div className="space-y-6">
                  {/* 4 Core Highlight Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Overall Mistakes in Quiz */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                          Overall Mistakes in Quiz
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
                          {studentReviewData.totalMistakeCount}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">mistakes</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1.5">
                        Practice quiz mistakes only (excludes teacher tests).
                      </p>
                    </div>

                    {/* Card 2: Overall Correct in Quiz */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Overall Correct in Quiz
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                          <Award className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                          {studentReviewData.totalCorrectCount}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">correct</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1.5">
                        Practice quiz correct answers (excludes teacher tests).
                      </p>
                    </div>

                    {/* Card 3: Total Searches in AI */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Total Searches in AI
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
                          {studentReviewData.totalAiSearches}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">searches</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1.5">
                        Every question/input to AI in MATH AI counted in realtime.
                      </p>
                    </div>

                    {/* Card 4: Overall Accuracy Rate */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          Overall Accuracy Rate
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                          <BrainCircuit className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
                          {studentReviewData.overallAccuracy}%
                        </span>
                        <span className="text-xs font-semibold text-slate-400">test accuracy</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1.5">
                        Realtime teacher test performance: old % + new %.
                      </p>
                    </div>
                  </div>

                  {/* Recent Marks Pills */}
                  {studentReviewData.recentMarks.length > 0 && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Teacher Test Marks History:
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {studentReviewData.recentMarks.map((mark, mIdx) => (
                          <span
                            key={mIdx}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                              mark >= 80
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : mark >= 60
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {mark}%
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 15 Mathematics Subject Classification (MSC) Detailed Breakdown */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                        <span>Mathematics Subject Classification Breakdown</span>
                      </h3>
                      {/* Topic Filters */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {(['all', 'needs_practice', 'mastered', 'active'] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setReviewFilter(mode)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                              reviewFilter === mode
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {mode.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="py-2.5 px-3">Subject Topic</th>
                            <th className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400">Correct in Quiz</th>
                            <th className="py-2.5 px-3 text-rose-600 dark:text-rose-400">Mistakes in Quiz</th>
                            <th className="py-2.5 px-3 text-indigo-600 dark:text-indigo-400">Searches in AI</th>
                            <th className="py-2.5 px-3">Topic Accuracy</th>
                            <th className="py-2.5 px-3 text-right">Mastery Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {studentReviewData.topicStats
                            .filter((t) => {
                              if (reviewFilter === 'needs_practice') return t.status === 'Needs Practice';
                              if (reviewFilter === 'mastered') return t.status === 'Mastered' || t.status === 'Strong';
                              if (reviewFilter === 'active') return t.totalAttempted > 0 || t.aiSearches > 0;
                              return true;
                            })
                            .map((t) => (
                              <tr key={t.topic} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                                  {t.topic}
                                </td>
                                <td className="py-2 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  {t.correctCount}
                                </td>
                                <td className="py-2 px-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                                  {t.mistakeCount}
                                </td>
                                <td className="py-2 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  {t.aiSearches}
                                </td>
                                <td className="py-2 px-3">
                                  {t.totalAttempted === 0 && t.aiSearches === 0 ? (
                                    <span className="text-slate-400 italic">Unexplored</span>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${
                                            t.accuracy >= 80 ? 'bg-emerald-500' : t.accuracy >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                          }`}
                                          style={{ width: `${t.accuracy}%` }}
                                        />
                                      </div>
                                      <span className="font-mono font-bold text-[11px]">{t.accuracy}%</span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      t.status === 'Mastered'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                        : t.status === 'Strong'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                        : t.status === 'Improving'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                        : t.status === 'Needs Practice'
                                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                    }`}
                                  >
                                    {t.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Student Progress Overview Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Class ID</th>
                  <th className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400">
                    1. Quiz Questions Solved
                  </th>
                  <th className="py-3.5 px-4 text-indigo-600 dark:text-indigo-400">
                    2. AI Usage (Queries Asked)
                  </th>
                  <th className="py-3.5 px-4">Weak Topics</th>
                  <th className="py-3.5 px-4 text-right">Realtime Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {progressList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No student progress recorded yet.
                    </td>
                  </tr>
                ) : (
                  progressList.map((prog) => {
                    const isSelected = selectedStudentForReview === prog.studentId;
                    return (
                      <tr
                        key={prog.studentId}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                            : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleSelectStudentForReview(prog.studentId)}
                            className="text-left group cursor-pointer focus:outline-none"
                          >
                            <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                              {prog.studentName}
                            </div>
                            <div className="text-xs font-mono text-slate-400">{prog.studentId}</div>
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-xs text-indigo-600 dark:text-indigo-400">
                          {prog.classId || 'Independent'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                              {prog.questionsSolvedCount}
                            </span>
                            <span className="text-xs text-slate-400">solved</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-base text-indigo-600 dark:text-indigo-400">
                              {prog.aiUsageCount}
                            </span>
                            <span className="text-xs text-slate-400">interactions</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {prog.weakTopics.length === 0 ? (
                            <span className="text-xs text-emerald-600 font-semibold">Strong Mastery</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {prog.weakTopics.slice(0, 2).map((wt, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60"
                                >
                                  {wt.classification} ({wt.wrongCount})
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleSelectStudentForReview(prog.studentId)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isSelected ? 'Viewing Review' : 'View Review'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-view 3: Quiz Creator & Marks */}
      {activeSubView === 'quiz_creator' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <ClipboardList className="w-6 h-6 text-indigo-600" />
                <span>Quiz Creator & Marks</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Create custom quizzes with any number of questions. AI evaluates submissions on the
                spot. View student marks below!
              </p>
            </div>
          </div>

          {/* Quiz Creator Form */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <span>Create Classroom Quiz</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Specify the number of questions, create them manually or auto-generate with AI. Student answers are evaluated by AI.
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setQuizMode('ai_generated')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    quizMode === 'ai_generated'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Generated</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuizMode('teacher_typed')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    quizMode === 'teacher_typed'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Teacher Typed</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateTeacherQuiz} className="space-y-5">
              {/* Class, Title & Question Count row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Target Class ID */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Target Class ID
                    </label>
                    {classrooms.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextState = !isCustomTargetClass;
                          setIsCustomTargetClass(nextState);
                          if (nextState && !customTargetClassInput) {
                            setCustomTargetClassInput(quizClassId || classrooms[0].classId);
                          }
                        }}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        {isCustomTargetClass ? '← Choose Existing Class' : '+ Enter Custom Class ID'}
                      </button>
                    )}
                  </div>

                  {isCustomTargetClass || classrooms.length === 0 ? (
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder="Enter Class ID (e.g. DWX58219)"
                        value={customTargetClassInput}
                        onChange={(e) => setCustomTargetClassInput(e.target.value.toUpperCase())}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 uppercase tracking-wider"
                      />
                      {classrooms.length === 0 && (
                        <p className="text-[10px] text-slate-400">
                          No classes created yet. Enter any Class ID or create one in Classroom Management tab.
                        </p>
                      )}
                    </div>
                  ) : (
                    <select
                      value={quizClassId}
                      onChange={(e) => {
                        setQuizClassId(e.target.value);
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    >
                      {classrooms.map((c) => (
                        <option key={c.classId} value={c.classId}>
                          {c.className} ({c.classId}) — {c.studentIds?.length || 0} student(s)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 2. Quiz Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Quiz Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Weekly Quadratic & Arithmetic Evaluation"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 3. Number of Questions */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Number of Questions (1 to 20)
                    </label>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      {quizQuestions.length} in test
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuestionCountChange(quizQuestionCount - 1)}
                      disabled={quizQuestionCount <= 1}
                      className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors flex items-center justify-center cursor-pointer text-sm"
                      title="Decrease question count"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={quizQuestionCount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setQuizQuestionCount('' as any);
                        } else {
                          handleQuestionCountChange(parseInt(val) || 1);
                        }
                      }}
                      onBlur={() => {
                        if (!quizQuestionCount || typeof quizQuestionCount !== 'number') {
                          handleQuestionCountChange(quizQuestions.length || 3);
                        }
                      }}
                      className="flex-1 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuestionCountChange(quizQuestionCount + 1)}
                      disabled={quizQuestionCount >= 20}
                      className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors flex items-center justify-center cursor-pointer text-sm"
                      title="Increase question count"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Mode-Specific Generator Bar */}
              {quizMode === 'ai_generated' ? (
                <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-1">
                          Math Subject / Topic
                        </label>
                        <select
                          value={aiTopic}
                          onChange={(e) => setAiTopic(e.target.value)}
                          className="bg-white dark:bg-slate-800 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none text-slate-800 dark:text-slate-200"
                        >
                          <option value="Random">Mixed Mathematics</option>
                          <option value="Algebra">Algebra</option>
                          <option value="Arithmetic">Arithmetic</option>
                          <option value="Geometry">Geometry</option>
                          <option value="Trigonometry">Trigonometry</option>
                          <option value="Calculus & Analysis">Calculus & Analysis</option>
                          <option value="Number Theory">Number Theory</option>
                          <option value="Statistics & Probability">Statistics & Probability</option>
                          <option value="Linear Algebra">Linear Algebra</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-1">
                          Grade / Level
                        </label>
                        <select
                          value={aiStandard}
                          onChange={(e) => setAiStandard(e.target.value)}
                          className="bg-white dark:bg-slate-800 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none text-slate-800 dark:text-slate-200"
                        >
                          <option value="8">Standard 8th</option>
                          <option value="9">Standard 9th</option>
                          <option value="10">Standard 10th</option>
                          <option value="11">Standard 11th</option>
                          <option value="12">Standard 12th</option>
                          <option value="college">College / University</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateAIQuestions}
                      disabled={isGeneratingAIQuestions}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xs hover:scale-102 cursor-pointer"
                    >
                      {isGeneratingAIQuestions ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating {quizQuestionCount} Questions...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Generate {quizQuestionCount} Questions with AI</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80">
                    AI will create {quizQuestionCount} diverse multiple-choice questions with 4 options and verified correct answers. You can inspect or tweak any question before publishing!
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Teacher Typed Mode: {quizQuestions.length} question(s) configured. You can type question text, 4 options, and select the correct answer.
                  </span>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Question</span>
                  </button>
                </div>
              )}

              {/* Editable Question List */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span>Questions to be Assigned ({quizQuestions.length})</span>
                  <span>Evaluated by AI upon submission</span>
                </div>

                {quizQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          Question {idx + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={q.classification}
                          onChange={(e) => handleUpdateQuestion(idx, 'classification', e.target.value)}
                          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400"
                        >
                          <option value="Algebra">Algebra</option>
                          <option value="Arithmetic">Arithmetic</option>
                          <option value="Geometry">Geometry</option>
                          <option value="Trigonometry">Trigonometry</option>
                          <option value="Calculus & Analysis">Calculus & Analysis</option>
                          <option value="Number Theory">Number Theory</option>
                          <option value="Statistics & Probability">Statistics & Probability</option>
                          <option value="Linear Algebra">Linear Algebra</option>
                        </select>

                        {quizQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(idx)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 transition-colors"
                            title="Remove Question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Question text input */}
                    <div>
                      <input
                        type="text"
                        value={q.question}
                        onChange={(e) => handleUpdateQuestion(idx, 'question', e.target.value)}
                        placeholder={`e.g. Solve for x: ${idx + 2}x + 5 = 25`}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* 4 Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, oIdx) => {
                        const optLabel = String.fromCharCode(65 + oIdx);
                        const isCorrect = q.correctAnswer === opt && opt.trim() !== '';
                        return (
                          <div
                            key={oIdx}
                            className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                              isCorrect
                                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleUpdateQuestion(idx, 'correctAnswer', opt)}
                              className={`w-6 h-6 rounded-md font-bold text-[11px] flex items-center justify-center transition-colors cursor-pointer ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                              }`}
                              title="Mark as correct answer"
                            >
                              {optLabel}
                            </button>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleUpdateOption(idx, oIdx, e.target.value)}
                              placeholder={`Option ${optLabel}`}
                              className="flex-1 bg-transparent border-0 text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                            />
                            {isCorrect && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 pr-1">
                                Correct ✓
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action footer */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-medium">
                  Total Questions: <strong>{quizQuestions.length}</strong> • Will be automatically evaluated by AI for enrolled students.
                </span>

                <button
                  type="submit"
                  disabled={isCreatingQuiz}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer hover:scale-102"
                >
                  {isCreatingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                  <span>Publish Quiz for Class ({quizQuestions.length} Questions)</span>
                </button>
              </div>

              {quizError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{quizError}</span>
                </div>
              )}

              {quizSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{quizSuccess}</span>
                </div>
              )}
            </form>
          </div>

          {/* Student Marks Table */}
          {(() => {
            const availableClassIds = Array.from(
              new Set([
                ...classrooms.map((c) => c.classId.trim().toUpperCase()),
                ...submissions.map((s) => (s.classId || '').trim().toUpperCase()).filter(Boolean),
              ])
            );

            const filteredSubmissions = submissions.filter((sub) => {
              if (marksClassFilter === 'all') return true;
              return (sub.classId || '').trim().toUpperCase() === marksClassFilter.trim().toUpperCase();
            });

            return (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Award className="w-4 h-4 text-indigo-600" />
                      <span>Student Submitted Marks (Evaluated by AI on the Spot)</span>
                    </h2>
                    <span className="text-xs text-slate-400">
                      Showing {filteredSubmissions.length} of {submissions.length} submission(s) • Click any student to view test questions & student answers
                    </span>
                  </div>

                  {/* Target Class ID Filter Controls */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                      Class ID:
                    </label>
                    <select
                      value={marksClassFilter}
                      onChange={(e) => setMarksClassFilter(e.target.value)}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 shadow-xs"
                    >
                      <option value="all">All Classes ({submissions.length})</option>
                      {availableClassIds.map((cid) => {
                        const matchedClass = classrooms.find((c) => c.classId.toUpperCase() === cid);
                        const count = submissions.filter((s) => (s.classId || '').trim().toUpperCase() === cid).length;
                        return (
                          <option key={cid} value={cid}>
                            {matchedClass ? `${matchedClass.className} (${cid})` : `Class ${cid}`} ({count})
                          </option>
                        );
                      })}
                    </select>
                    {marksClassFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setMarksClassFilter('all')}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Class ID</th>
                        <th className="py-3 px-4">Quiz Title</th>
                        <th className="py-3 px-4 text-emerald-600 dark:text-emerald-400">Score & Marks</th>
                        <th className="py-3 px-4">Submitted At</th>
                        <th className="py-3 px-4 text-right">Inspection</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredSubmissions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                            {marksClassFilter === 'all'
                              ? 'No quiz submissions recorded yet for your classes.'
                              : `No submissions found for Class ID ${marksClassFilter}.`}
                            {marksClassFilter !== 'all' && (
                              <button
                                type="button"
                                onClick={() => setMarksClassFilter('all')}
                                className="block mx-auto mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                              >
                                View all classes
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredSubmissions.map((sub) => (
                          <tr
                            key={sub.id}
                            onClick={() => setSelectedSubmission(sub)}
                            className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                          >
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {sub.studentName}
                              </span>
                              <span className="block text-xs font-mono text-slate-400">
                                {sub.studentId}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (sub.classId) setMarksClassFilter(sub.classId.trim().toUpperCase());
                                }}
                                className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 cursor-pointer"
                                title="Click to filter marks by this Class ID"
                              >
                                {sub.classId || 'N/A'}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-xs font-medium text-slate-800 dark:text-slate-200">
                              {sub.quizTitle}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                                {sub.score} / {sub.totalQuestions}
                              </span>
                              <span className="text-xs text-slate-500 ml-1.5 font-bold">
                                ({Math.round((sub.score / sub.totalQuestions) * 100)}%)
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-400">
                              {new Date(sub.submittedAt).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSubmission(sub);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all shadow-xs cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Test</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Student Test Inspection Modal */}
          {selectedSubmission && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                        Class {selectedSubmission.classId || 'N/A'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(selectedSubmission.submittedAt).toLocaleString()}
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                      {selectedSubmission.studentName} ({selectedSubmission.studentId})
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Quiz: <strong>{selectedSubmission.quizTitle}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        exportStudentSubmissionTestToPDF({
                          studentName: selectedSubmission.studentName,
                          studentId: selectedSubmission.studentId,
                          quizTitle: selectedSubmission.quizTitle,
                          classId: selectedSubmission.classId,
                          score: selectedSubmission.score,
                          totalQuestions: selectedSubmission.totalQuestions,
                          submittedAt: selectedSubmission.submittedAt,
                          answers: (selectedSubmission.answers || []).map((a) => ({
                            question: a.question,
                            selectedAnswer: a.selectedAnswer,
                            correctAnswer: a.correctAnswer,
                            isCorrect: a.isCorrect,
                            classification: a.classification,
                          })),
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer shadow-xs"
                      title="Export Test to PDF"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Export PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedSubmission(null)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Score Summary Row */}
                <div className="px-6 py-3 bg-indigo-50/40 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    Test Performance:
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-indigo-700 dark:text-indigo-400">
                      Score: {selectedSubmission.score} / {selectedSubmission.totalQuestions}
                    </span>
                    <span className="font-bold text-slate-500">
                      ({Math.round((selectedSubmission.score / selectedSubmission.totalQuestions) * 100)}%)
                    </span>
                  </div>
                </div>

                {/* Questions List */}
                <div className="p-6 overflow-y-auto space-y-4 flex-1">
                  {selectedSubmission.answers && selectedSubmission.answers.length > 0 ? (
                    selectedSubmission.answers.map((ans, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl border transition-all ${
                          ans.isCorrect
                            ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-xs shadow-xs">
                              {idx + 1}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
                              {ans.classification || 'Mathematics'}
                            </span>
                          </div>

                          {ans.isCorrect ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Correct (+1 Mark)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Incorrect (0 Marks)</span>
                            </span>
                          )}
                        </div>

                        {/* Question Text */}
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white pt-1">
                          {ans.question}
                        </p>

                        {/* Answer comparison */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                          <div
                            className={`p-2.5 rounded-xl border ${
                              ans.isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                            }`}
                          >
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                              Student Submitted Answer:
                            </span>
                            <span
                              className={`font-bold ${
                                ans.isCorrect
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : 'text-rose-700 dark:text-rose-300'
                              }`}
                            >
                              {ans.selectedAnswer || '(No answer provided)'}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-1">
                              Verified Correct Answer:
                            </span>
                            <span className="font-bold text-emerald-800 dark:text-emerald-200">
                              {ans.correctAnswer} ✓
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No question details recorded for this submission.
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedSubmission(null)}
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* In-app Confirmation Modal for Deleting Class or Removing Student */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {confirmModal.type === 'delete-class' ? 'Confirm Delete Class ID' : 'Confirm Remove Student'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  This action requires teacher confirmation.
                </p>
              </div>
            </div>

            <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
              {confirmModal.type === 'delete-class' ? (
                <>
                  Are you sure you want to delete Class ID{' '}
                  <strong className="font-mono text-rose-600 dark:text-rose-400">{confirmModal.classId}</strong>
                  {confirmModal.className ? ` (${confirmModal.className})` : ''}? This will permanently remove the class and all associated student enrollments.
                </>
              ) : (
                <>
                  Are you sure you want to remove student{' '}
                  <strong className="font-mono text-rose-600 dark:text-rose-400">{confirmModal.studentId}</strong>{' '}
                  from Class ID{' '}
                  <strong className="font-mono text-indigo-600 dark:text-indigo-400">{confirmModal.classId}</strong>?
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                disabled={isProcessingAction}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmedAction}
                disabled={isProcessingAction}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessingAction ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{confirmModal.type === 'delete-class' ? 'Confirm Delete' : 'Confirm Remove'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
