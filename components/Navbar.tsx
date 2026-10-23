'use client';

import React from 'react';
import { UserAccount } from '@/lib/types';
import {
  Calculator,
  BookOpen,
  Users,
  GraduationCap,
  Sparkles,
  ClipboardList,
  BarChart3,
  User,
  Loader2,
  TrendingUp,
  Lock,
} from 'lucide-react';

interface NavbarProps {
  user: UserAccount | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenProfile: () => void;
  onOpenAuth: () => void;
  backgroundJobRunning: boolean;
  backgroundNotice?: string | null;
  isTestInProgress?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onOpenProfile,
  onOpenAuth,
  backgroundJobRunning,
  backgroundNotice,
  isTestInProgress = false,
}: NavbarProps) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => !isTestInProgress && setActiveTab('math_ai')}
            disabled={isTestInProgress}
            className={`flex items-center gap-2.5 text-left group focus:outline-none ${
              isTestInProgress ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                MATH <span className="text-indigo-600 dark:text-indigo-400">AI</span>
              </span>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-400 block -mt-1">
                Step-by-Step Solver
              </span>
            </div>
          </button>

          {/* Test Lockout Indicator */}
          {isTestInProgress && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse shadow-xs">
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Teacher Test in Progress • Tabs Locked</span>
              <span className="sm:hidden">Test Locked</span>
            </div>
          )}

          {/* Background Job Running Indicator */}
          {backgroundJobRunning && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">AI Running in Background</span>
              <span className="sm:hidden">Running...</span>
            </div>
          )}

          {/* Background Task Finished Notice */}
          {!backgroundJobRunning && backgroundNotice && activeTab !== 'math_ai' && (
            <button
              onClick={() => setActiveTab('math_ai')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{backgroundNotice}</span>
              <span className="sm:hidden">Result Ready!</span>
            </button>
          )}
        </div>

        {/* Navigation Tabs based on Role */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* MATH AI is visible to everyone */}
          <button
            onClick={() => !isTestInProgress && setActiveTab('math_ai')}
            disabled={isTestInProgress}
            title={isTestInProgress ? 'Complete your test before switching tabs' : 'MATH AI'}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isTestInProgress
                ? 'opacity-40 cursor-not-allowed'
                : activeTab === 'math_ai'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>MATH AI</span>
          </button>

          {/* Student Tabs: MATH AI, Quiz, My class & test, Profile */}
          {(!user || user.role === 'student') && (
            <button
              onClick={() => !isTestInProgress && setActiveTab('quiz')}
              disabled={isTestInProgress}
              title={isTestInProgress ? 'Complete your test before switching tabs' : 'Quiz'}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isTestInProgress
                  ? 'opacity-40 cursor-not-allowed'
                  : activeTab === 'quiz'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Quiz</span>
            </button>
          )}

          {user && user.role === 'student' && (
            <>
              <button
                onClick={() => setActiveTab('my_class')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'my_class'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span className="hidden sm:inline">My class & test</span>
                <span className="sm:hidden">Class</span>
              </button>

              <button
                onClick={() => !isTestInProgress && setActiveTab('student_review')}
                disabled={isTestInProgress}
                title={isTestInProgress ? 'Complete your test before switching tabs' : 'Review'}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isTestInProgress
                    ? 'opacity-40 cursor-not-allowed'
                    : activeTab === 'student_review'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Review</span>
              </button>
            </>
          )}

          {/* Teacher Tabs: MATH AI, Classroom, Student progress, Quiz creator & Marks, Profile */}
          {user && user.role === 'teacher' && (
            <>
              <button
                onClick={() => setActiveTab('classroom')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'classroom'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Classroom</span>
              </button>

              <button
                onClick={() => setActiveTab('student_progress')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'student_progress'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Student progress</span>
                <span className="sm:hidden">Progress</span>
              </button>

              <button
                onClick={() => setActiveTab('quiz_creator')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'quiz_creator'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                <span className="hidden sm:inline">Quiz creator & Marks</span>
                <span className="sm:hidden">Quiz & Marks</span>
              </button>
            </>
          )}

          {/* Profile Button - Strict requirement: "don't show extra profile(name, id, teacher/student) and dark mood outside the profile" */}
          {user ? (
            <button
              onClick={() => !isTestInProgress && onOpenProfile()}
              disabled={isTestInProgress}
              title={isTestInProgress ? 'Complete your test before opening profile' : 'Profile and Settings'}
              aria-label="Profile and Settings"
              className={`ml-2 flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isTestInProgress ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <User className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="ml-2 px-3.5 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
            >
              Sign In
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
