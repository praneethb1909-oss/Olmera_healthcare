import React, { useState, useEffect } from 'react';
import {
  Settings, Bell, Shield, Clock, Video, Save, CheckCircle2,
  AlertTriangle, Key, Moon, Sun, Lock, Stethoscope, Smartphone
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { doctorManagementService, DoctorAccount } from '../../services/clinical/doctorManagementService';

type SettingsTab = 'preferences' | 'security' | 'notifications';

interface DoctorPreferences {
  workingHours: string;
  consultationDurationMins: number;
  telehealthEnabled: boolean;
  autoRemindFollowUps: boolean;
  emailAlerts: boolean;
  smsAlerts: boolean;
  juniorSubmissionAlerts: boolean;
  urgentTelemetryAlerts: boolean;
  requireOtpOnLogin: boolean;
}

const DEFAULT_PREFS: DoctorPreferences = {
  workingHours: '09:00 AM – 06:00 PM',
  consultationDurationMins: 20,
  telehealthEnabled: true,
  autoRemindFollowUps: true,
  emailAlerts: true,
  smsAlerts: false,
  juniorSubmissionAlerts: true,
  urgentTelemetryAlerts: true,
  requireOtpOnLogin: true,
};

export function DoctorSettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('preferences');
  const [activeDoctor, setActiveDoctor] = useState<DoctorAccount>(() =>
    doctorManagementService.resolveActiveDoctor(user?.email, user?.uid)
  );
  const [prefs, setPrefs] = useState<DoctorPreferences>(DEFAULT_PREFS);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // Password / Access Code change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const docAcc = doctorManagementService.resolveActiveDoctor(user?.email, user?.uid);
    setActiveDoctor(docAcc);
    try {
      const saved = localStorage.getItem(`olmera_doctor_settings_${docAcc.id}`);
      if (saved) {
        setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(saved) });
      }
    } catch {
      // ignore storage errors
    }
  }, [user?.email, user?.uid]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 5000);
  };

  const handleSavePreferences = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    localStorage.setItem(`olmera_doctor_settings_${activeDoctor.id}`, JSON.stringify(prefs));
    showToast('success', 'Clinical practice and notification preferences saved.');
  };

  const handleToggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('olmera-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('olmera-theme', 'light');
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPassword !== activeDoctor.accessCode) {
      showToast('error', 'Current password / access code does not match.');
      return;
    }
    if (newPassword.trim().length < 6) {
      showToast('error', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'New password and confirmation do not match.');
      return;
    }

    const all = doctorManagementService.getAllDoctors();
    const target = all.find(d => d.id === activeDoctor.id);
    if (target) {
      target.accessCode = newPassword.trim();
      target.updatedAt = new Date().toISOString();
      localStorage.setItem('olmera_doctor_accounts_v1', JSON.stringify(all));
      doctorManagementService.setActiveDoctorSession(target);
      setActiveDoctor(target);
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showToast('success', 'Login password / clinical access code updated securely.');
  };

  const isSenior = activeDoctor.hierarchyRole === 'senior_consultant';

  return (
    <div className="space-y-6 animate-fadeIn pb-16 font-ui text-[var(--color-ink)]">
      {/* Feedback Banner */}
      {banner && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-medium flex items-center justify-between animate-fadeIn ${
            banner.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {banner.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{banner.text}</span>
          </div>
          <button onClick={() => setBanner(null)} className="px-2 font-bold">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="card p-6 sm:p-8 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-surface-subtle)] rounded-full text-xs font-semibold text-[var(--color-primary)] border border-[var(--color-line)] mb-2">
            <Settings size={14} /> Doctor Portal Settings
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--color-ink)]">
            Account, Security & Clinical Preferences
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-1">
            Signed in as <strong>{activeDoctor.fullName}</strong> ({isSenior ? 'Senior Consultant' : 'Junior Resident'}) • {activeDoctor.hospitalName}
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleTheme}
          className="btn-outline px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 min-h-[44px] self-start md:self-auto"
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          <span>{isDarkMode ? 'Switch to Light Parchment' : 'Switch to Dark Mode'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'preferences', label: 'Practice Preferences', icon: Stethoscope },
          { id: 'security', label: 'Security & Password', icon: Shield },
          { id: 'notifications', label: 'Clinical Notifications', icon: Bell },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as SettingsTab)}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all min-h-[44px] ${
              activeTab === tab.id
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-line)] hover:text-[var(--color-ink)]'
            }`}
          >
            <tab.icon size={15} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: PRACTICE PREFERENCES */}
      {activeTab === 'preferences' && (
        <form onSubmit={handleSavePreferences} className="card p-6 sm:p-8 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl shadow-sm space-y-6">
          <h2 className="text-xl font-display font-semibold text-[var(--color-ink)] border-b border-[var(--color-line)] pb-3">
            Consultation & Schedule Preferences
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)] block mb-1.5">
                Standard OPD Working Hours
              </label>
              <div className="relative">
                <Clock size={16} className="absolute left-3.5 top-3.5 text-[var(--color-muted)]" />
                <input
                  type="text"
                  value={prefs.workingHours}
                  onChange={(e) => setPrefs({ ...prefs, workingHours: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)] block mb-1.5">
                Default Consultation Slot Duration
              </label>
              <select
                value={prefs.consultationDurationMins}
                onChange={(e) => setPrefs({ ...prefs, consultationDurationMins: Number(e.target.value) })}
                className="w-full p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-sm"
              >
                <option value={15}>15 Minutes (Rapid Triage)</option>
                <option value={20}>20 Minutes (Standard OPD)</option>
                <option value={30}>30 Minutes (Comprehensive Review)</option>
                <option value={45}>45 Minutes (Complex Specialist)</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)] cursor-pointer">
              <div className="flex items-center gap-3">
                <Video size={18} className="text-[var(--color-primary)]" />
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">Accept Telemedicine Video Consultations</p>
                  <p className="text-xs text-[var(--color-muted)]">Allow patients to book encrypted remote video slots.</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.telehealthEnabled}
                onChange={(e) => setPrefs({ ...prefs, telehealthEnabled: e.target.checked })}
                className="w-5 h-5 accent-[var(--color-primary)]"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)] cursor-pointer">
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-[var(--color-primary)]" />
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">Automated Follow-up Reminders</p>
                  <p className="text-xs text-[var(--color-muted)]">Notify assigned patients 24 hours before scheduled follow-up checks.</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.autoRemindFollowUps}
                onChange={(e) => setPrefs({ ...prefs, autoRemindFollowUps: e.target.checked })}
                className="w-5 h-5 accent-[var(--color-primary)]"
              />
            </label>
          </div>

          <button type="submit" className="btn-primary px-6 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 min-h-[44px]">
            <Save size={15} /> Save Practice Preferences
          </button>
        </form>
      )}

      {/* TAB 2: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleUpdatePassword} className="card p-6 sm:p-8 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl shadow-sm space-y-4">
            <h2 className="text-xl font-display font-semibold text-[var(--color-ink)] border-b border-[var(--color-line)] pb-3 flex items-center gap-2">
              <Key size={18} className="text-[var(--color-primary)]" /> Change Login Password
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Current Password / Access Code</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-sm"
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn-primary px-5 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 min-h-[44px]">
              <Lock size={15} /> Update Credentials
            </button>
          </form>

          <div className="card p-6 sm:p-8 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl shadow-sm space-y-4">
            <h2 className="text-xl font-display font-semibold text-[var(--color-ink)] border-b border-[var(--color-line)] pb-3 flex items-center gap-2">
              <Shield size={18} className="text-[var(--color-primary)]" /> Clinical Session & MFA Security
            </h2>
            <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)] text-xs space-y-2">
              <p><strong>Account ID:</strong> <span className="font-mono">{activeDoctor.id}</span></p>
              <p><strong>Medical Registration:</strong> <span className="font-mono">{activeDoctor.licenseNumber}</span></p>
              <p><strong>RBAC Authority:</strong> {isSenior ? 'Senior Consultant (Full Sign-off & Supervision)' : 'Junior Resident (Supervised Clinical Access)'}</p>
              <p><strong>Account Status:</strong> <span className="text-emerald-600 font-semibold uppercase">{activeDoctor.status}</span></p>
            </div>
            <label className="flex items-center justify-between p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)] cursor-pointer">
              <div className="flex items-center gap-3">
                <Smartphone size={18} className="text-[var(--color-primary)]" />
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">2-Step OTP Verification</p>
                  <p className="text-xs text-[var(--color-muted)]">Require 6-digit verification code on each doctor portal sign-in.</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.requireOtpOnLogin}
                onChange={(e) => {
                  const next = { ...prefs, requireOtpOnLogin: e.target.checked };
                  setPrefs(next);
                  localStorage.setItem(`olmera_doctor_settings_${activeDoctor.id}`, JSON.stringify(next));
                  showToast('success', '2-Step OTP preference updated.');
                }}
                className="w-5 h-5 accent-[var(--color-primary)]"
              />
            </label>
          </div>
        </div>
      )}

      {/* TAB 3: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="card p-6 sm:p-8 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl shadow-sm space-y-5">
          <h2 className="text-xl font-display font-semibold text-[var(--color-ink)] border-b border-[var(--color-line)] pb-3">
            Clinical Alert & Supervision Notifications
          </h2>
          <div className="space-y-3">
            {[
              {
                key: 'juniorSubmissionAlerts' as const,
                title: isSenior ? 'Junior Doctor Clinical Submissions' : 'Senior Doctor Review Decisions',
                desc: isSenior
                  ? 'Immediate alert whenever a Junior Doctor submits a prescription or diagnosis for your sign-off.'
                  : 'Notify immediately when your Senior Doctor approves, rejects, or requests modifications.',
              },
              {
                key: 'urgentTelemetryAlerts' as const,
                title: 'Critical Patient Vitals & Escalations',
                desc: 'High-priority alerts for abnormal patient telemetry or STAT specialist escalations.',
              },
              {
                key: 'emailAlerts' as const,
                title: 'Email Clinical Digest',
                desc: 'Receive daily summary of OPD appointments and completed reviews.',
              },
              {
                key: 'smsAlerts' as const,
                title: 'SMS Urgent Triage Alerts',
                desc: 'Receive SMS notifications for urgent trauma or emergency patient handoffs.',
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)] cursor-pointer"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">{item.title}</p>
                  <p className="text-xs text-[var(--color-muted)]">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs[item.key]}
                  onChange={(e) => setPrefs({ ...prefs, [item.key]: e.target.checked })}
                  className="w-5 h-5 accent-[var(--color-primary)]"
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => handleSavePreferences()}
            className="btn-primary px-6 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 min-h-[44px]"
          >
            <Save size={15} /> Save Notification Settings
          </button>
        </div>
      )}
    </div>
  );
}
