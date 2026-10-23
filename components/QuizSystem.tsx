'use client';

import React, { useState, useEffect } from 'react';
import { UserAccount, QuizQuestion, MathSubjectClassification } from '@/lib/types';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  BarChart2,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Trophy,
  Loader2,
  ChevronRight,
  TrendingDown,
  FileDown,
} from 'lucide-react';
import { exportQuizIncorrectProblemsToPDF } from '@/lib/export-pdf';

interface QuizSystemProps {
  user: UserAccount | null;
  onQuizCompleted?: () => void;
  setBackgroundJobRunning: (running: boolean) => void;
}

export const QuizSystem: React.FC<QuizSystemProps> = ({
  user,
  onQuizCompleted,
  setBackgroundJobRunning,
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string>('Random');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  // Result state
  const [resultData, setResultData] = useState<{
    score: number;
    totalQuestions: number;
    percentage: number;
    wrongItems: any[];
    progress?: any;
  } | null>(null);

  // Post-quiz explanation prompt state
  const [showExplanationPrompt, setShowExplanationPrompt] = useState(false);
  const [explanations, setExplanations] = useState<any[]>([]);
  const [isExplaining, setIsExplaining] = useState(false);

  const startQuiz = async (topicToUse?: string) => {
    setIsLoading(true);
    setBackgroundJobRunning(true);
    setQuizFinished(false);
    setShowExplanationPrompt(false);
    setExplanations([]);
    setUserAnswers({});
    setCurrentIndex(0);

    const topic = topicToUse || selectedTopic;
    try {
      const res = await fetch(
        `/api/quiz?userId=${user?.id || 'guest'}&topic=${encodeURIComponent(
          topic
        )}&educationLevel=${user?.educationLevel || 'none'}&standard=${user?.standard || ''}`
      );
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setIsQuizActive(true);
      }
    } catch (err) {
      console.error('Failed to load quiz:', err);
    } finally {
      setIsLoading(false);
      setBackgroundJobRunning(false);
    }
  };

  const handleSelectOption = (option: string) => {
    const currentQ = questions[currentIndex];
    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: option,
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    setIsLoading(true);
    setBackgroundJobRunning(true);

    const formattedAnswers = questions.map((q) => ({
      questionId: q.id,
      question: q.question,
      options: q.options,
      selectedAnswer: userAnswers[q.id] || '',
      correctAnswer: q.correctAnswer,
      classification: q.classification,
      isRetryQuestion: q.isRetryQuestion || false,
    }));

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          userId: user?.id || 'guest',
          userName: user?.name || 'Guest',
          quizTitle: selectedTopic === 'Random' ? 'AI Random 10-Question Quiz' : `${selectedTopic} Quiz`,
          classId: user?.classId,
          source: 'quiz',
          answers: formattedAnswers,
        }),
      });

      const data = await res.json();
      setResultData(data);
      setIsQuizActive(false);
      setQuizFinished(true);

      // Rule: "After every quiz AI need to ask to do i need to explain the answer for the problem the user had wrong answer. If user select yes explain it, if not don't explain it."
      if (data.wrongItems && data.wrongItems.length > 0) {
        setShowExplanationPrompt(true);
      }

      onQuizCompleted?.();
    } catch (err) {
      console.error('Failed to submit quiz:', err);
    } finally {
      setIsLoading(false);
      setBackgroundJobRunning(false);
    }
  };

  const requestExplanation = async () => {
    if (!resultData?.wrongItems || resultData.wrongItems.length === 0) return;
    setIsExplaining(true);
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'explain',
          questions: resultData.wrongItems,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.explanations) {
          setExplanations(data.explanations);
        }
      }
    } catch (err) {
      console.warn('Explanations fetch notice:', err);
    } finally {
      setIsExplaining(false);
      setShowExplanationPrompt(false);
    }
  };

  const declineExplanation = () => {
    setShowExplanationPrompt(false);
    setExplanations([]);
  };

  const handleTopicChange = (newTopic: string) => {
    setSelectedTopic(newTopic);
    startQuiz(newTopic);
  };

  const currentQ = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const isCurrentAnswered = currentQ && !!userAnswers[currentQ.id];

  const allTopics: { value: string; label: string }[] = [
    { value: 'Random', label: 'AI Mixed Practice (All Topics)' },
    { value: 'Arithmetic', label: 'Arithmetic' },
    { value: 'Algebra', label: 'Algebra' },
    { value: 'Geometry', label: 'Geometry' },
    { value: 'Trigonometry', label: 'Trigonometry' },
    { value: 'Calculus & Analysis', label: 'Calculus & Analysis' },
    { value: 'Number Theory', label: 'Number Theory' },
    { value: 'Combinatorics', label: 'Combinatorics' },
    { value: 'Set Theory & Logic', label: 'Set Theory & Logic' },
    { value: 'Statistics & Probability', label: 'Statistics & Probability' },
    { value: 'Linear Algebra', label: 'Linear Algebra' },
    { value: 'Differential Equations', label: 'Differential Equations' },
    { value: 'Topology', label: 'Topology' },
    { value: 'Operations Research', label: 'Operations Research' },
    { value: 'Game Theory', label: 'Game Theory' },
    { value: 'Computational / Numerical Analysis', label: 'Computational / Numerical Analysis' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Quiz Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Adaptive Mathematics Quiz</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
              10 AI Questions
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Select any topic to generate 10 brand-new, customized questions evaluated on the spot by AI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedTopic}
            onChange={(e) => handleTopicChange(e.target.value)}
            disabled={isLoading}
            className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
          >
            {allTopics.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => startQuiz(selectedTopic)}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{isLoading ? 'Generating 10 Qs...' : isQuizActive ? 'New 10 Qs' : quizFinished ? 'Retake 10 Qs' : 'Start 10 Qs'}</span>
          </button>
        </div>
      </div>

      {/* When no quiz active yet and not finished, show topic selection grid */}
      {!isQuizActive && !quizFinished && !isLoading && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <span>Select Any Topic to Generate 10 AI Questions</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every selection generates 10 brand-new questions dynamically tailored to your level.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-2">
            {allTopics.map((t) => (
              <button
                key={t.value}
                onClick={() => handleTopicChange(t.value)}
                className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all hover:scale-102 cursor-pointer ${
                  selectedTopic === t.value
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{t.label}</span>
                  <Sparkles className="w-3 h-3 text-indigo-500 shrink-0 opacity-70" />
                </div>
                <span className="block text-[10px] text-slate-400 mt-1 font-normal">
                  10 New AI Questions
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* State 1: Active Quiz Taking */}
      {isQuizActive && currentQ && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Progress Bar & Counter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-indigo-600 dark:text-indigo-400">
                Question {currentIndex + 1} of {questions.length}
              </span>
              {currentQ.isRetryQuestion && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                  Targeted Reinforcement Question
                </span>
              )}
              <span className="text-slate-400">
                {Math.round(((currentIndex + 1) / questions.length) * 100)}% Complete
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Prompt */}
          <div className="space-y-2 py-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200/80 dark:border-indigo-800/60">
                {currentQ.classification || 'Mathematics'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
              {currentQ.question}
            </h2>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {currentQ.options.map((opt, oIdx) => {
              const isSelected = userAnswers[currentQ.id] === opt;
              const optionLabel = String.fromCharCode(65 + oIdx);
              return (
                <button
                  key={oIdx}
                  onClick={() => handleSelectOption(opt)}
                  className={`group flex items-center gap-3.5 p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-950/60 dark:border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700/60 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center transition-colors shadow-xs ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 group-hover:border-indigo-400'
                    }`}
                  >
                    {optionLabel}
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex-1">
                    {opt}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Next / Submit Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <button
              onClick={handleNext}
              disabled={!isCurrentAnswered || isLoading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 transition-all hover:scale-102"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : isLastQuestion ? (
                <>
                  <span>Submit Quiz</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Next Question</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* State 2: Quiz Results & Weakness Chart */}
      {quizFinished && resultData && (
        <div className="space-y-6">
          {/* Score Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Quiz Completed!
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Here is your on-the-spot result evaluation:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto pt-2">
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
                <span className="block text-xs font-bold text-slate-500 dark:text-slate-400">Total Score</span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {resultData.score} / {resultData.totalQuestions}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                <span className="block text-xs font-bold text-slate-500 dark:text-slate-400">Accuracy</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {resultData.percentage}%
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40">
                <span className="block text-xs font-bold text-slate-500 dark:text-slate-400">Incorrect Items</span>
                <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                  {resultData.wrongItems.length}
                </span>
              </div>
            </div>

            {/* Post-quiz prompt: AI asking whether to explain wrong answers */}
            {showExplanationPrompt && resultData.wrongItems.length > 0 && (
              <div className="mt-6 p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-left space-y-3">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                  <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span>
                    You had {resultData.wrongItems.length} question
                    {resultData.wrongItems.length > 1 ? 's' : ''} answered incorrectly.
                  </span>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Do you want me to explain the step-by-step mathematical solution and English
                  explanation for the problem{resultData.wrongItems.length > 1 ? 's' : ''} you got wrong?
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={requestExplanation}
                    disabled={isExplaining}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs flex items-center gap-1.5"
                  >
                    {isExplaining ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating Step Solutions...</span>
                      </>
                    ) : (
                      <span>Yes, explain solutions</span>
                    )}
                  </button>
                  <button
                    onClick={declineExplanation}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                  >
                    No, keep going
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Detailed Explanations for wrong answers if requested */}
          {explanations.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>AI Step-by-Step Explanations for Incorrect Problems ({explanations.length})</span>
                </h3>

                <button
                  onClick={() => {
                    exportQuizIncorrectProblemsToPDF({
                      quizTitle: selectedTopic === 'Random' ? 'AI Mathematics Quiz' : `${selectedTopic} Quiz`,
                      score: resultData?.score || 0,
                      totalQuestions: resultData?.totalQuestions || questions.length,
                      percentage: resultData?.percentage || 0,
                      studentName: user?.name,
                      problems: explanations.map((e) => ({
                        question: e.question,
                        classification: e.classification,
                        userAnswer: e.userAnswer,
                        correctAnswer: e.correctAnswer,
                        stepProcedure: e.stepProcedure,
                        englishExplanation: e.englishExplanation,
                      })),
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition-all hover:scale-102 shadow-xs cursor-pointer"
                  title="Export Incorrect Problems & Solutions to PDF"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Export Solutions to PDF</span>
                </button>
              </div>

              {explanations.map((exp, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 text-xs font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {exp.classification || 'Mathematics'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-semibold border border-rose-200 dark:border-rose-900/60">
                        Your Choice: {exp.userAnswer || '(None)'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-900/60">
                        Verified Correct: {exp.correctAnswer}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Problem Statement:
                    </h4>
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                      {exp.question}
                    </p>
                  </div>

                  {/* Mathematical Procedure showing step by step mathematical expressions */}
                  <div className="space-y-2 pt-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mathematical Procedure (Step-by-Step Mathematical Expressions):</span>
                    </div>
                    <div className="space-y-1.5">
                      {exp.stepProcedure.map((s: string, sIdx: number) => (
                        <div
                          key={sIdx}
                          className="text-xs font-mono p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 flex items-start gap-2.5"
                        >
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold select-none">
                            ▶
                          </span>
                          <span className="flex-1">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* English Explanation of the expressions */}
                  {exp.englishExplanation && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Explanation of Mathematical Expressions in Understandable English:</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-indigo-50/40 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                        {exp.englishExplanation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* AI Weakness Analysis Visual Chart */}
          {user && resultData?.progress?.weakTopics && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    AI Topic Weakness & Mastery Analysis
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  Targeted for Next Quiz
                </span>
              </div>

              <div className="space-y-3">
                {resultData.progress.weakTopics.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">
                    Outstanding accuracy! No significant weak topics recorded yet.
                  </p>
                ) : (
                  resultData.progress.weakTopics.map((wt: any, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {wt.classification}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {wt.wrongCount} error{wt.wrongCount > 1 ? 's' : ''} (Mastery:{' '}
                          {wt.masteryPercentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.min(100, wt.wrongCount * 25)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Initial Landing State when Quiz is not started */}
      {!isQuizActive && !quizFinished && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Ready to Test Your Mathematical Skills?
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              Start an adaptive 10-question quiz. The AI tracks questions you answer incorrectly,
              monitors your weak topics, and includes them until you answer them correctly twice!
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => startQuiz()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all hover:scale-105"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Preparing 10 Questions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Start 10-Question Quiz Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
