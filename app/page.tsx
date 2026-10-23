'use client';

import React, { useState, useEffect, useRef } from 'react';
import { UserAccount } from '@/lib/types';
import { Navbar } from '@/components/Navbar';
import { MathAISolver } from '@/components/MathAISolver';
import { QuizSystem } from '@/components/QuizSystem';
import { ClassroomManager } from '@/components/ClassroomManager';
import { StudentClassroom } from '@/components/StudentClassroom';
import { StudentReview } from '@/components/StudentReview';
import { ProfileModal } from '@/components/ProfileModal';
import { AuthModal } from '@/components/AuthModal';

export default function HomePage() {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [activeTab, setActiveTab] = useState<string>('math_ai');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [backgroundJobRunning, setBackgroundJobRunning] = useState(false);
  const [backgroundNotice, setBackgroundNotice] = useState<string | null>(null);
  const [isTestInProgress, setIsTestInProgress] = useState(false);

  const prevJobRunning = useRef(false);

  // When a background task completes while the user is elsewhere, show a notification
  useEffect(() => {
    if (prevJobRunning.current && !backgroundJobRunning && activeTab !== 'math_ai') {
      setBackgroundNotice('Calculation Complete! View Result in MATH AI');
    }
    prevJobRunning.current = backgroundJobRunning;
  }, [backgroundJobRunning, activeTab]);

  const handleSelectTab = (tab: string) => {
    // "when the student start answering the test assigned by teacher, the student cannot go to any other tab until the test is submited successfully."
    if (isTestInProgress && tab !== 'my_class') {
      return;
    }
    setActiveTab(tab);
    if (tab === 'math_ai') {
      setBackgroundNotice(null);
    }
  };

  // Load saved session or dark mode from localStorage if present
  useEffect(() => {
    const timer = setTimeout(() => {
      const savedUser = localStorage.getItem('math_ai_user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.error('Error loading saved user', e);
        }
      }
      const savedTheme = localStorage.getItem('math_ai_theme');
      if (savedTheme === 'dark') {
        setDarkMode(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Update theme class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('math_ai_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('math_ai_theme', 'light');
    }
  }, [darkMode]);

  const handleLoginSuccess = (newUser: UserAccount) => {
    setUser(newUser);
    localStorage.setItem('math_ai_user', JSON.stringify(newUser));
    sessionStorage.clear();
    setBackgroundNotice(null);
    setIsTestInProgress(false);
    handleSelectTab('math_ai');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('math_ai_user');
    sessionStorage.clear();
    setBackgroundNotice(null);
    setIsTestInProgress(false);
    handleSelectTab('math_ai');
  };

  const handleUpdateUser = (updatedUser: UserAccount) => {
    setUser(updatedUser);
    localStorage.setItem('math_ai_user', JSON.stringify(updatedUser));
  };

  // Distinct session key forces full unmount and state wipe on user switch or logout
  const sessionKey = user ? user.id : 'guest-session';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Strict Navbar: shows logo, role-specific nav tabs, background indicator, and profile icon */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        backgroundJobRunning={backgroundJobRunning}
        backgroundNotice={backgroundNotice}
        isTestInProgress={isTestInProgress}
      />

      {/* Main Content Area with Background Process Continuation */}
      <main className="flex-1 pb-16">
        {/* 1. MATH AI View: Kept mounted so ongoing calculations and file solving NEVER quit in background! */}
        <div className={activeTab === 'math_ai' ? 'block' : 'hidden'}>
          <MathAISolver
            key={`math-ai-${sessionKey}`}
            user={user}
            setBackgroundJobRunning={setBackgroundJobRunning}
          />
        </div>

        {/* 2. Quiz View (Accessible to Student & Guest) */}
        {(!user || user.role === 'student') && (
          <div className={activeTab === 'quiz' ? 'block' : 'hidden'}>
            <QuizSystem
              key={`quiz-${sessionKey}`}
              user={user}
              setBackgroundJobRunning={setBackgroundJobRunning}
            />
          </div>
        )}

        {/* 3. Student: My class & test */}
        {user && user.role === 'student' && (
          <div className={activeTab === 'my_class' ? 'block' : 'hidden'}>
            <StudentClassroom
              key={`my-class-${sessionKey}`}
              user={user}
              onUpdateUser={handleUpdateUser}
              setBackgroundJobRunning={setBackgroundJobRunning}
              onTestActiveChange={setIsTestInProgress}
            />
          </div>
        )}

        {/* 4. Student: Review (Next to My class & test) */}
        {user && user.role === 'student' && (
          <div className={activeTab === 'student_review' ? 'block' : 'hidden'}>
            <StudentReview
              key={`review-${sessionKey}`}
              user={user}
              setBackgroundJobRunning={setBackgroundJobRunning}
            />
          </div>
        )}

        {/* 5. Teacher: Classroom Management */}
        {user && user.role === 'teacher' && (
          <div className={activeTab === 'classroom' ? 'block' : 'hidden'}>
            <ClassroomManager
              key={`classroom-${sessionKey}`}
              teacher={user}
              activeSubView="classroom"
              setBackgroundJobRunning={setBackgroundJobRunning}
            />
          </div>
        )}

        {/* 6. Teacher: Student Progress */}
        {user && user.role === 'teacher' && (
          <div className={activeTab === 'student_progress' ? 'block' : 'hidden'}>
            <ClassroomManager
              key={`student-progress-${sessionKey}`}
              teacher={user}
              activeSubView="student_progress"
              setBackgroundJobRunning={setBackgroundJobRunning}
            />
          </div>
        )}

        {/* 7. Teacher: Quiz Creator & Marks */}
        {user && user.role === 'teacher' && (
          <div className={activeTab === 'quiz_creator' ? 'block' : 'hidden'}>
            <ClassroomManager
              key={`quiz-creator-${sessionKey}`}
              teacher={user}
              activeSubView="quiz_creator"
              setBackgroundJobRunning={setBackgroundJobRunning}
            />
          </div>
        )}
      </main>

      {/* Profile Modal (Encapsulating Profile, Grade for students, Settings, Dark Mode, and Confirmed Logout) */}
      {user && (
        <ProfileModal
          user={user}
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          onLogout={handleLogout}
          onUpdateUser={handleUpdateUser}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      )}

      {/* Auth Modal for Sign In and Registration */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
