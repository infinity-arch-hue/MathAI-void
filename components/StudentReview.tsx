'use client';

import React, { useState, useEffect } from 'react';
import { UserAccount, MathSubjectClassification } from '@/lib/types';
import { StudentReviewSummary, StudentReviewTopicStat } from '@/lib/db';
import { exportStudentReviewReportToPDF } from '@/lib/export-pdf';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Award,
  FileDown,
  RefreshCw,
  Loader2,
  BookOpen,
  HelpCircle,
  BarChart3,
  Flame,
  BrainCircuit,
} from 'lucide-react';

interface StudentReviewProps {
  user: UserAccount;
  setBackgroundJobRunning: (running: boolean) => void;
}

export const StudentReview: React.FC<StudentReviewProps> = ({
  user,
  setBackgroundJobRunning,
}) => {
  const [reviewData, setReviewData] = useState<StudentReviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'needs_practice' | 'mastered' | 'active'>('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let ignore = false;
    fetch(`/api/student/review?studentId=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.review) {
          setReviewData(data.review);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch student review data:', err);
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [user.id, refreshTrigger]);

  const handleExportPDF = () => {
    if (!reviewData) return;

    exportStudentReviewReportToPDF({
      studentName: reviewData.studentName || user.name,
      studentId: reviewData.studentId || user.id,
      classId: reviewData.classId || user.classId,
      standard: reviewData.standard || user.standard,
      educationLevel: reviewData.educationLevel || user.educationLevel,
      totalMistakeCount: reviewData.totalMistakeCount,
      totalCorrectCount: reviewData.totalCorrectCount,
      totalAiSearches: reviewData.totalAiSearches,
      overallAccuracy: reviewData.overallAccuracy,
      totalQuizzesTaken: reviewData.totalQuizzesTaken,
      topicStats: reviewData.topicStats.map((t) => ({
        topic: t.topic,
        correctCount: t.correctCount,
        mistakeCount: t.mistakeCount,
        aiSearches: t.aiSearches,
        accuracy: t.accuracy,
        status: t.status,
      })),
    });
  };

  const filteredTopics = (reviewData?.topicStats || []).filter((t) => {
    if (filter === 'needs_practice') return t.status === 'Needs Practice';
    if (filter === 'mastered') return t.status === 'Mastered' || t.status === 'Strong';
    if (filter === 'active') return t.totalAttempted > 0 || t.aiSearches > 0;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
              Personalized Learning Review
            </span>
            <span className="text-xs text-slate-400">
              Student ID: {user.id} {user.classId ? `• Class: ${user.classId}` : ''}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1 flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-indigo-600" />
            <span>Mathematics Performance & Topic Review</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track your overall quiz mistakes, correct solutions, AI search usage, and improvement across all 15 Mathematics Subject Classifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            disabled={isLoading}
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
            title="Refresh Review Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={!reviewData || isLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20 hover:scale-102 cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>Export Review to PDF</span>
          </button>
        </div>
      </div>

      {isLoading && !reviewData ? (
        <div className="py-24 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
          <p className="text-sm font-semibold text-slate-500">
            Analyzing student submissions and topic mastery...
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 Core Metrics Highlight: Overall Mistakes, Overall Correct, Total AI Searches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Overall Mistakes in Quiz */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Overall Mistakes in Quiz
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-rose-600 dark:text-rose-400">
                  {reviewData?.totalMistakeCount ?? 0}
                </span>
                <span className="text-xs font-semibold text-slate-400">incorrect answers</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Reinforced via targeted repetition in practice quizzes.
              </p>
            </div>

            {/* Metric 2: Overall Correct Answers in Quiz */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Overall Correct in Quiz
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {reviewData?.totalCorrectCount ?? 0}
                </span>
                <span className="text-xs font-semibold text-slate-400">correct questions</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Across all completed practice & classroom tests.
              </p>
            </div>

            {/* Metric 3: Total Number of Searches in AI */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Total Searches in AI
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                  {reviewData?.totalAiSearches ?? 0}
                </span>
                <span className="text-xs font-semibold text-slate-400">AI step queries</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Step-by-step math problems & doubts explored.
              </p>
            </div>

            {/* Metric 4: Overall Accuracy */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Overall Accuracy Rate
                </span>
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                  <BrainCircuit className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {reviewData?.overallAccuracy ?? 0}%
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  ({reviewData?.totalQuizzesTaken ?? 0} tests taken)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Weighted by precision and topic diversity.
              </p>
            </div>
          </div>

          {/* Interactive Chart Diagram: Topic Mastery & Improvement across 15 Mathematics Subject Classifications */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  <span>Mathematics Subject Classification Improvement Diagram</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visual breakdown of accuracy, solved problems, mistakes, and AI queries across all 15 MSC topics.
                </p>
              </div>

              {/* Filters */}
              <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  All (15)
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('active')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filter === 'active'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Active Only
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('needs_practice')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filter === 'needs_practice'
                      ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Needs Practice
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('mastered')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filter === 'mastered'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Mastered
                </button>
              </div>
            </div>

            {/* Visual Chart Diagram / Column Chart */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3.5">
                {filteredTopics.map((topicStat) => {
                  const barColor =
                    topicStat.status === 'Mastered'
                      ? 'bg-emerald-500'
                      : topicStat.status === 'Strong'
                      ? 'bg-teal-500'
                      : topicStat.status === 'Improving'
                      ? 'bg-amber-500'
                      : topicStat.status === 'Needs Practice'
                      ? 'bg-rose-500'
                      : 'bg-slate-300 dark:bg-slate-700';

                  const badgeStyle =
                    topicStat.status === 'Mastered'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                      : topicStat.status === 'Strong'
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200'
                      : topicStat.status === 'Improving'
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200'
                      : topicStat.status === 'Needs Practice'
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700';

                  return (
                    <div
                      key={topicStat.topic}
                      className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {topicStat.topic}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeStyle}`}
                          >
                            {topicStat.status}
                          </span>
                        </div>

                        {/* Detailed Counters */}
                        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            +{topicStat.correctCount} Correct
                          </span>
                          <span className="text-rose-600 dark:text-rose-400">
                            -{topicStat.mistakeCount} Mistakes
                          </span>
                          <span className="text-indigo-600 dark:text-indigo-400">
                            {topicStat.aiSearches} AI Searches
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            {topicStat.accuracy}% Accuracy
                          </span>
                        </div>
                      </div>

                      {/* Visual Progress Bar Diagram */}
                      <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
                        <div
                          className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                          style={{
                            width: `${Math.max(topicStat.accuracy, topicStat.status === 'Unexplored' ? 4 : 8)}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredTopics.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  No topics match the selected filter.
                </div>
              )}
            </div>

            {/* Legend & Advice */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Mastered (80%+)</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Improving (50-79%)</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Needs Practice (&lt;50%)</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span>Unexplored</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportPDF}
                className="inline-flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export Official PDF Report</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
