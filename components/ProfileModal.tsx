'use client';

import React, { useState } from 'react';
import { UserAccount, SchoolStandard } from '@/lib/types';
import {
  User,
  Settings,
  GraduationCap,
  LogOut,
  Moon,
  Sun,
  Shield,
  Bell,
  Download,
  WifiOff,
  KeyRound,
  Check,
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react';

interface ProfileModalProps {
  user: UserAccount;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onUpdateUser: (updatedUser: UserAccount) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onLogout,
  onUpdateUser,
  darkMode,
  setDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'grade' | 'settings'>('profile');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Qualification modification form (Requires password!)
  const [edLevel, setEdLevel] = useState<'school' | 'college' | 'none'>(user.educationLevel);
  const [standardVal, setStandardVal] = useState<number>(user.standard || 10);
  const [passwordAttempt, setPasswordAttempt] = useState('');
  const [qualError, setQualError] = useState('');
  const [qualSuccess, setQualSuccess] = useState('');
  const [isUpdatingQual, setIsUpdatingQual] = useState(false);

  // Settings State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [offlineSyncEnabled, setOfflineSyncEnabled] = useState(true);
  const [exportStatus, setExportStatus] = useState('');

  if (!isOpen) return null;

  const handleUpdateQualification = async (e: React.FormEvent) => {
    e.preventDefault();
    setQualError('');
    setQualSuccess('');
    if (!passwordAttempt) {
      setQualError('Password is required to change your educational qualification.');
      return;
    }

    setIsUpdatingQual(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-qualification',
          userId: user.id,
          password: passwordAttempt,
          educationLevel: edLevel,
          standard: edLevel === 'school' ? standardVal : undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        onUpdateUser(data.user);
        setQualSuccess('Educational qualification successfully updated!');
        setPasswordAttempt('');
      } else {
        setQualError(data.error || 'Failed to update qualification. Check your password.');
      }
    } catch (err) {
      setQualError('Network error while updating qualification.');
    } finally {
      setIsUpdatingQual(false);
    }
  };

  const handleExportData = () => {
    const exportData = {
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
        educationLevel: user.educationLevel,
        standard: user.standard,
        classId: user.classId,
      },
      exportedAt: new Date().toISOString(),
      offlineReady: true,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `math_ai_backup_${user.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportStatus('Data exported successfully!');
    setTimeout(() => setExportStatus(''), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                {user.name}
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ID: {user.id} • {user.role === 'teacher' ? 'Teacher Account' : 'Student Account'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Profile"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation (Student: settings, grade, logout; Teacher: settings, logout - teacher doesn't have grade & qualifications!) */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-5 pt-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>

          {/* Student only has Grade tab */}
          {user.role === 'student' && (
            <button
              onClick={() => setActiveTab('grade')}
              className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'grade'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Grade & Qualification</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'settings'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Tab 1: Profile Overview */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block font-semibold mb-0.5">Account ID</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {user.id}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block font-semibold mb-0.5">Role</span>
                  <span className="font-bold text-indigo-600 capitalize">{user.role}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block font-semibold mb-0.5">Email</span>
                  <span className="font-medium text-slate-900 dark:text-white">{user.email}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block font-semibold mb-0.5">Age</span>
                  <span className="font-medium text-slate-900 dark:text-white">{user.age}</span>
                </div>
              </div>

              {user.role === 'student' && (
                <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 block font-semibold">
                    Current Qualification:
                  </span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-300">
                    {user.educationLevel === 'school'
                      ? `School Student (Standard ${user.standard})`
                      : user.educationLevel === 'college'
                      ? 'College Student'
                      : 'Not specified'}
                  </span>
                </div>
              )}

              {/* Theme Toggle strictly inside profile */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2.5">
                  {darkMode ? (
                    <Moon className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <Sun className="w-4 h-4 text-amber-500" />
                  )}
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Dark Mode Appearance
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Toggle dark and light theme
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    darkMode ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      darkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Grade (Student only - password required to change!) */}
          {activeTab === 'grade' && user.role === 'student' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
                <strong>Credential Security:</strong> This qualification cannot be changed easily.
                To change your education level or standard, you must type your password.
              </div>

              <form onSubmit={handleUpdateQualification} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Education Level:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEdLevel('school')}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                        edLevel === 'school'
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      School (Standard 1 - 12)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEdLevel('college')}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                        edLevel === 'college'
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      College Student
                    </button>
                  </div>
                </div>

                {edLevel === 'school' && (
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Standard / Grade (1 - 12):
                    </label>
                    <select
                      value={standardVal}
                      onChange={(e) => setStandardVal(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((s) => (
                        <option key={s} value={s}>
                          Standard {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Enter Password to Confirm Change:
                  </label>
                  <input
                    type="password"
                    placeholder="Enter your current password"
                    value={passwordAttempt}
                    onChange={(e) => setPasswordAttempt(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                {qualError && <p className="text-rose-500 font-semibold">{qualError}</p>}
                {qualSuccess && <p className="text-emerald-600 font-semibold">{qualSuccess}</p>}

                <button
                  type="submit"
                  disabled={isUpdatingQual || !passwordAttempt}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                >
                  {isUpdatingQual ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="w-3.5 h-3.5" />
                  )}
                  <span>Verify Password & Update Qualification</span>
                </button>
              </form>
            </div>
          )}

          {/* Tab 3: Settings */}
          {activeTab === 'settings' && (
            <div className="space-y-4 text-xs">
              {/* Notification Preferences */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-indigo-500" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Study & Quiz Reminders
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Receive notifications for quiz check-ins
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              {/* Offline Access Capabilities */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <WifiOff className="w-4 h-4 text-emerald-500" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Offline Practice Cache
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Enable offline question solving and local sync
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={offlineSyncEnabled}
                  onChange={(e) => setOfflineSyncEnabled(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              {/* Data Export Options */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Download className="w-4 h-4 text-indigo-500" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Export My Data & History
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Download your math problem history and quiz metrics (JSON)
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleExportData}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs"
                  >
                    Export
                  </button>
                </div>
                {exportStatus && (
                  <p className="text-emerald-600 font-semibold">{exportStatus}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Logout & Confirmation Modal */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          {!showLogoutConfirm ? (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 w-full justify-between">
              <span className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Confirm logout?</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-200 dark:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    onLogout();
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs"
                >
                  Yes, Log out
                </button>
              </div>
            </div>
          )}

          {!showLogoutConfirm && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
