'use client';

import React, { useState, useEffect } from 'react';
import { UserAccount, TeacherQuiz, Classroom } from '@/lib/types';
import {
  GraduationCap,
  KeyRound,
  ClipboardList,
  CheckCircle2,
  Award,
  ChevronRight,
  Loader2,
  Sparkles,
  Lock,
} from 'lucide-react';

interface StudentClassroomProps {
  user: UserAccount;
  onUpdateUser: (user: UserAccount) => void;
  setBackgroundJobRunning: (running: boolean) => void;
  onTestActiveChange?: (active: boolean) => void;
}

export const StudentClassroom: React.FC<StudentClassroomProps> = ({
  user,
  onUpdateUser,
  setBackgroundJobRunning,
  onTestActiveChange,
}) => {
  const [classIdInput, setClassIdInput] = useState('');
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [quizzes, setQuizzes] = useState<TeacherQuiz[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [joinMsg, setJoinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active Test Taking State
  const [activeQuiz, setActiveQuiz] = useState<TeacherQuiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<{ score: number; total: number; percentage: number } | null>(null);

  useEffect(() => {
    if (!user.classId) return;
    let ignore = false;
    const cleanClassId = user.classId.trim().toUpperCase();
    fetch(`/api/classroom?classId=${encodeURIComponent(cleanClassId)}&studentId=${encodeURIComponent(user.id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        if (data.classroom) setClassroom(data.classroom);
        if (data.quizzes) setQuizzes(data.quizzes);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching class info:', err);
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [user.classId, user.id]);

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classIdInput.trim()) return;

    setJoinMsg(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join-class',
          userId: user.id,
          classId: classIdInput.trim().toUpperCase(),
        }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        onUpdateUser(data.user);
        setJoinMsg({ type: 'success', text: `Successfully joined class ${data.user.classId}!` });
        setClassIdInput('');
      } else {
        setJoinMsg({ type: 'error', text: data.error || 'Failed to join class. Please verify Class ID.' });
      }
    } catch (err) {
      setJoinMsg({ type: 'error', text: 'Network error while joining class.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!activeQuiz || testResult) {
      return;
    }
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeQuiz, testResult]);

  useEffect(() => {
    return () => {
      onTestActiveChange?.(false);
    };
  }, [onTestActiveChange]);

  const handleStartTest = (quiz: TeacherQuiz) => {
    setActiveQuiz(quiz);
    setAnswers({});
    setCurrentIdx(0);
    setTestResult(null);
    onTestActiveChange?.(true);
  };

  const handleSelectOption = (option: string) => {
    if (!activeQuiz) return;
    const q = activeQuiz.questions[currentIdx];
    setAnswers((prev) => ({ ...prev, [q.id]: option }));
  };

  const handleSubmitTest = async () => {
    if (!activeQuiz) return;
    setIsSubmitting(true);
    setBackgroundJobRunning(true);

    const quizIdToSubmit = activeQuiz.id;
    const formatted = activeQuiz.questions.map((q) => ({
      questionId: q.id,
      question: q.question,
      options: q.options,
      selectedAnswer: answers[q.id] || '',
      correctAnswer: q.correctAnswer,
      classification: q.classification,
    }));

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          userId: user.id,
          userName: user.name,
          quizId: quizIdToSubmit,
          quizTitle: activeQuiz.title,
          classId: (activeQuiz.classId || user.classId || '').trim().toUpperCase(),
          source: 'teacher_test',
          answers: formatted,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : null;
      if (data && data.success) {
        setTestResult({
          score: data.score,
          total: data.totalQuestions,
          percentage: data.percentage,
        });
        // Test submitted successfully, release navigation lockout
        onTestActiveChange?.(false);
        // Immediately remove finished quiz from available quizzes so it disappears!
        setQuizzes((prev) => prev.filter((q) => q.id !== quizIdToSubmit));
      }
    } catch (err) {
      console.warn('Failed to submit class test:', err);
    } finally {
      setIsSubmitting(false);
      setBackgroundJobRunning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-600" />
            <span>My Class & Tests</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Access assigned classroom quizzes, submit answers for instant AI grading, and track your
            test marks.
          </p>
        </div>
      </div>

      {/* Class Membership Status Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Enrolled Classroom
            </h2>
            {user.classId ? (
              <div className="mt-1">
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {classroom?.className || 'Classroom'}
                </span>
                <span className="ml-3 px-3 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs border border-indigo-200 dark:border-indigo-800">
                  Class ID: {user.classId}
                </span>
                {classroom?.teacherName && (
                  <p className="text-xs text-slate-500 mt-1">
                    Teacher: <strong>{classroom.teacherName}</strong>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mt-1">
                You have not joined a class yet. Enter a Class ID below provided by your teacher!
              </p>
            )}
          </div>
        </div>

        {/* Join or Switch Class ID */}
        <form onSubmit={handleJoinClass} className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Enter Class ID (e.g. DWX58219)"
            value={classIdInput}
            onChange={(e) => setClassIdInput(e.target.value.toUpperCase())}
            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={isLoading || !classIdInput.trim()}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
          >
            <KeyRound className="w-4 h-4" />
            <span>{user.classId ? 'Switch Class ID' : 'Join Class'}</span>
          </button>
        </form>

        {joinMsg && (
          <p
            className={`text-xs font-medium ${
              joinMsg.type === 'success' ? 'text-emerald-600' : 'text-rose-500'
            }`}
          >
            {joinMsg.text}
          </p>
        )}
      </div>

      {/* Active Teacher Test Taking */}
      {activeQuiz && !testResult && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200 dark:border-indigo-900 p-6 space-y-6 shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Classroom Test: {activeQuiz.title}
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                Question {currentIdx + 1} of {activeQuiz.questions.length}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-xs">
              <Lock className="w-3.5 h-3.5" />
              <span>Test Locked In Progress</span>
            </div>
          </div>

          <p className="text-base font-bold text-slate-900 dark:text-white">
            {activeQuiz.questions[currentIdx].question}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeQuiz.questions[currentIdx].options.map((opt, oIdx) => {
              const isSelected = answers[activeQuiz.questions[currentIdx].id] === opt;
              const optionLabel = String.fromCharCode(65 + oIdx);
              return (
                <button
                  key={oIdx}
                  onClick={() => handleSelectOption(opt)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border text-left text-xs font-medium transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-md font-bold flex items-center justify-center ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700'
                    }`}
                  >
                    {optionLabel}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
              disabled={currentIdx === 0}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              Previous
            </button>

            {currentIdx === activeQuiz.questions.length - 1 ? (
              <button
                onClick={handleSubmitTest}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Submit</span>
              </button>
            ) : (
              <button
                onClick={() => setCurrentIdx(currentIdx + 1)}
                disabled={!answers[activeQuiz.questions[currentIdx].id]}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                <span>Next Question</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Test Result Evaluation Card */}
      {testResult && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-900 p-6 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Award className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            Test Evaluated by AI on the Spot!
          </h3>
          <div className="inline-flex items-baseline gap-2 px-5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {testResult.score} / {testResult.total}
            </span>
            <span className="text-xs font-bold text-slate-400">
              ({testResult.percentage}%)
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Your marks have been recorded under your student account and are now visible to your
            teacher.
          </p>
          <button
            onClick={() => {
              setActiveQuiz(null);
              setTestResult(null);
            }}
            className="px-5 py-2 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100"
          >
            Back to Class Tests
          </button>
        </div>
      )}

      {/* Available Tests Assigned by Teacher */}
      {user.classId && !activeQuiz && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-indigo-600" />
            <span>Assigned Classroom Tests ({quizzes.length})</span>
          </h2>

          {quizzes.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              No classroom tests assigned yet by your teacher.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quizzes.map((q) => (
                <div
                  key={q.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">{q.title}</h3>
                      <span className="text-xs text-slate-400">
                        {q.questionCount} Questions • Teacher: {q.teacherName}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartTest(q)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-all"
                  >
                    <span>Take Test Now</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
