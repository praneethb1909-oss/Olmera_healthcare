import React, { useState, useEffect, useMemo } from 'react';
import {
  User, Mail, Phone, Building2, Award, ShieldCheck, Stethoscope, Clock,
  Edit3, Save, Camera, UserPlus, CheckCircle2, XCircle, AlertTriangle,
  FileText, Pill, ClipboardList, Activity, Lock, RefreshCw, Eye, Send,
  History, UserCheck, UserX, MessageSquare
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  doctorManagementService,
  DoctorAccount,
  ClinicalSubmission,
  DoctorActivityEntry,
  SubmissionType
} from '../../services/clinical/doctorManagementService';

type ProfileTab = 'profile' | 'junior_team' | 'clinical_reviews' | 'activity_audit';

export function DoctorProfilePage() {
  const { user, loginAsDemo } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
  const [activeDoctor, setActiveDoctor] = useState<DoctorAccount>(() =>
    doctorManagementService.resolveActiveDoctor(user?.email, user?.uid)
  );
  const [juniorDoctors, setJuniorDoctors] = useState<DoctorAccount[]>([]);
  const [submissions, setSubmissions] = useState<ClinicalSubmission[]>([]);
  const [activities, setActivities] = useState<DoctorActivityEntry[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Own profile edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: activeDoctor.fullName,
    qualification: activeDoctor.qualification,
    specialization: activeDoctor.specialization,
    experienceYears: activeDoctor.experienceYears,
    phone: activeDoctor.phone,
    hospitalName: activeDoctor.hospitalName,
    bio: activeDoctor.bio,
  });

  // Senior Doctor: Create / Edit Junior Doctor Modal
  const [showJuniorModal, setShowJuniorModal] = useState(false);
  const [editingJuniorId, setEditingJuniorId] = useState<string | null>(null);
  const [juniorForm, setJuniorForm] = useState({
    fullName: '',
    email: '',
    accessCode: '',
    qualification: 'MBBS, MD Resident',
    specialization: 'Internal Medicine',
    experienceYears: 2,
    licenseNumber: '',
    phone: '',
    bio: '',
  });

  // Junior Doctor: Submit Clinical Recommendation Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submissionForm, setSubmissionForm] = useState({
    submissionType: 'prescription' as SubmissionType,
    patientId: 'demo-patient-uid',
    patientName: 'Demo Patient',
    title: '',
    clinicalDetails: '',
    medName: '',
    medDosage: '',
    medFrequency: 'Twice daily (1-0-1)',
    medDuration: '14 days',
  });

  // Junior Doctor: Resubmit Modified Recommendation Modal
  const [resubmittingItem, setResubmittingItem] = useState<ClinicalSubmission | null>(null);
  const [resubmitForm, setResubmitForm] = useState({ title: '', clinicalDetails: '' });

  // Senior Doctor: Review Modal
  const [reviewingSubmission, setReviewingSubmission] = useState<ClinicalSubmission | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // History expanded toggle
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const reloadAll = (docAccount?: DoctorAccount) => {
    const current = docAccount || doctorManagementService.resolveActiveDoctor(user?.email, user?.uid);
    setActiveDoctor(current);
    setProfileForm({
      fullName: current.fullName,
      qualification: current.qualification,
      specialization: current.specialization,
      experienceYears: current.experienceYears,
      phone: current.phone,
      hospitalName: current.hospitalName,
      bio: current.bio,
    });

    const cachedAvatar = localStorage.getItem(`olmera_avatar_${current.id}`);
    setAvatarUrl(cachedAvatar);

    const seniorId =
      current.hierarchyRole === 'senior_consultant'
        ? current.id
        : current.assignedSeniorDoctorId || 'doc-sr-01';

    setJuniorDoctors(doctorManagementService.getJuniorDoctorsForSenior(seniorId));
    setSubmissions(doctorManagementService.getSubmissionsForDoctor(current));
    setActivities(doctorManagementService.getSupervisedActivityLog(seniorId));
  };

  useEffect(() => {
    reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, user?.uid]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedbackBanner({ type, text });
    setTimeout(() => setFeedbackBanner(null), 5000);
  };

  const isSenior = activeDoctor.hierarchyRole === 'senior_consultant';

  const pendingReviewCount = useMemo(
    () => submissions.filter(s => s.status === 'pending_review').length,
    [submissions]
  );

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      localStorage.setItem(`olmera_avatar_${activeDoctor.id}`, dataUrl);
      setAvatarUrl(dataUrl);
      showToast('success', 'Profile photo updated.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveOwnProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = doctorManagementService.updateOwnProfile(activeDoctor.id, profileForm);
    if (updated) {
      setIsEditingProfile(false);
      reloadAll(updated);
      showToast('success', 'Doctor profile details updated successfully.');
    }
  };

  const openCreateJuniorModal = () => {
    setEditingJuniorId(null);
    setJuniorForm({
      fullName: '',
      email: '',
      accessCode: '',
      qualification: 'MBBS, MD Resident',
      specialization: activeDoctor.specialization,
      experienceYears: 2,
      licenseNumber: `APMC-2026-${Math.floor(10000 + Math.random() * 89999)}`,
      phone: '',
      bio: '',
    });
    setShowJuniorModal(true);
  };

  const openEditJuniorModal = (jr: DoctorAccount) => {
    setEditingJuniorId(jr.id);
    setJuniorForm({
      fullName: jr.fullName,
      email: jr.email,
      accessCode: jr.accessCode,
      qualification: jr.qualification,
      specialization: jr.specialization,
      experienceYears: jr.experienceYears,
      licenseNumber: jr.licenseNumber,
      phone: jr.phone,
      bio: jr.bio,
    });
    setShowJuniorModal(true);
  };

  const handleSaveJuniorDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingJuniorId) {
      const res = doctorManagementService.updateJuniorDoctor(activeDoctor, editingJuniorId, {
        fullName: juniorForm.fullName,
        qualification: juniorForm.qualification,
        specialization: juniorForm.specialization,
        experienceYears: Number(juniorForm.experienceYears),
        licenseNumber: juniorForm.licenseNumber,
        phone: juniorForm.phone,
        bio: juniorForm.bio,
        accessCode: juniorForm.accessCode,
      });
      if (!res.success) {
        showToast('error', res.error || 'Failed to update Junior Doctor.');
        return;
      }
      showToast('success', `Updated Junior Doctor profile for ${juniorForm.fullName}.`);
    } else {
      const res = doctorManagementService.createJuniorDoctor(activeDoctor, juniorForm);
      if (!res.success) {
        showToast('error', res.error || 'Failed to register Junior Doctor.');
        return;
      }
      showToast('success', `Registered Junior Doctor ${juniorForm.fullName} with individual login.`);
    }
    setShowJuniorModal(false);
    reloadAll();
  };

  const handleToggleJuniorStatus = (jr: DoctorAccount) => {
    const res = doctorManagementService.toggleJuniorDoctorStatus(activeDoctor, jr.id);
    if (!res.success) {
      showToast('error', res.error || 'Action denied.');
      return;
    }
    showToast(
      'success',
      `${jr.fullName} is now ${res.doctor?.status === 'active' ? 'Active' : 'Deactivated'}.`
    );
    reloadAll();
  };

  const handleSubmitRecommendation = (e: React.FormEvent) => {
    e.preventDefault();
    const meds =
      submissionForm.submissionType === 'prescription' && submissionForm.medName.trim()
        ? [
            {
              name: submissionForm.medName.trim(),
              dosage: submissionForm.medDosage.trim() || 'As directed',
              frequency: submissionForm.medFrequency,
              duration: submissionForm.medDuration,
            },
          ]
        : undefined;

    const res = doctorManagementService.submitClinicalRecommendation(activeDoctor, {
      submissionType: submissionForm.submissionType,
      patientId: submissionForm.patientId,
      patientName: submissionForm.patientName,
      title: submissionForm.title,
      clinicalDetails: submissionForm.clinicalDetails,
      medicationList: meds,
    });

    if (!res.success) {
      showToast('error', res.error || 'Submission failed.');
      return;
    }

    setShowSubmitModal(false);
    setSubmissionForm({
      submissionType: 'prescription',
      patientId: 'demo-patient-uid',
      patientName: 'Demo Patient',
      title: '',
      clinicalDetails: '',
      medName: '',
      medDosage: '',
      medFrequency: 'Twice daily (1-0-1)',
      medDuration: '14 days',
    });
    reloadAll();
    showToast('success', 'Submitted to your supervising Senior Doctor for mandatory approval.');
  };

  const handleSeniorDecision = (decision: 'approved' | 'rejected' | 'modification_requested') => {
    if (!reviewingSubmission) return;
    if ((decision === 'rejected' || decision === 'modification_requested') && !reviewNotes.trim()) {
      showToast('error', 'Please enter clinical review notes explaining the rejection or requested changes.');
      return;
    }

    const res = doctorManagementService.reviewClinicalSubmission(
      activeDoctor,
      reviewingSubmission.id,
      decision,
      reviewNotes || 'Reviewed and approved by Senior Consultant.'
    );

    if (!res.success) {
      showToast('error', res.error || 'Review action denied.');
      return;
    }

    setReviewingSubmission(null);
    setReviewNotes('');
    reloadAll();
    showToast(
      'success',
      decision === 'approved'
        ? 'Approved! Decision is now official and visible to the patient.'
        : decision === 'rejected'
        ? 'Submission rejected and logged in clinical audit history.'
        : 'Modification requested. Returned to Junior Doctor.'
    );
  };

  const handleResubmitModified = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resubmittingItem) return;
    const res = doctorManagementService.resubmitModifiedRecommendation(
      activeDoctor,
      resubmittingItem.id,
      resubmitForm
    );
    if (!res.success) {
      showToast('error', res.error || 'Resubmission failed.');
      return;
    }
    setResubmittingItem(null);
    reloadAll();
    showToast('success', 'Revised clinical submission sent back to Senior Doctor for review.');
  };

  const handleSwitchDoctorSession = (target: DoctorAccount) => {
    doctorManagementService.setActiveDoctorSession(target);
    loginAsDemo('doctor', target.email, target.fullName, target.hospitalId);
    reloadAll(target);
    showToast(
      'success',
      `Signed in as ${target.fullName} (${target.hierarchyRole === 'senior_consultant' ? 'Senior Doctor' : 'Junior Doctor'}).`
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16 font-ui text-[var(--color-ink)]">
      {/* Feedback Banner */}
      {feedbackBanner && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-medium flex items-center justify-between animate-fadeIn ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackBanner.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{feedbackBanner.text}</span>
          </div>
          <button onClick={() => setFeedbackBanner(null)} className="px-2 font-bold">✕</button>
        </div>
      )}

      {/* Top Profile Header Card */}
      <div className="card p-6 sm:p-8 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[var(--color-mist)] text-[var(--color-primary)] border border-[var(--color-line)] flex items-center justify-center overflow-hidden font-display font-semibold text-3xl shadow-inner">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={activeDoctor.fullName} className="w-full h-full object-cover" />
                ) : (
                  activeDoctor.fullName.replace(/^Dr\.?\s*/i, '')[0]?.toUpperCase() || 'D'
                )}
              </div>
              <label
                className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center cursor-pointer shadow-md hover:scale-105 transition-transform border-2 border-[var(--color-surface)]"
                title="Upload profile photo"
              >
                <Camera size={15} />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--color-ink)]">
                  {activeDoctor.fullName}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${
                    isSenior
                      ? 'bg-[var(--color-mist)] text-[var(--color-primary)] border-[var(--color-primary)]/20'
                      : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                  }`}
                >
                  {isSenior ? 'Senior Doctor • Supervising Consultant' : 'Junior Doctor • Supervised Resident'}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[var(--color-muted)] font-medium">
                {activeDoctor.qualification} • {activeDoctor.specialization}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-muted)] pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 size={14} className="text-[var(--color-primary)]" />
                  {activeDoctor.hospitalName}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} className="text-[var(--color-primary)]" />
                  {activeDoctor.experienceYears} Years Experience
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono">
                  <ShieldCheck size={14} className="text-[var(--color-primary)]" />
                  Reg: {activeDoctor.licenseNumber}
                </span>
              </div>

              {!isSenior && activeDoctor.assignedSeniorDoctorName && (
                <p className="text-xs text-[var(--color-primary)] font-semibold pt-1 flex items-center gap-1.5">
                  <UserCheck size={14} /> Supervising Senior Doctor: {activeDoctor.assignedSeniorDoctorName}
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {isSenior ? (
              <button
                type="button"
                onClick={openCreateJuniorModal}
                className="btn-accent px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm min-h-[44px]"
              >
                <UserPlus size={15} /> Register Junior Doctor
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="btn-accent px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm min-h-[44px]"
              >
                <Send size={15} /> Submit for Senior Review
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="btn-outline px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 min-h-[44px]"
            >
              <Edit3 size={15} /> {isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-[var(--color-line)]">
          {[
            { id: 'profile', label: 'Doctor Profile & RBAC', icon: User },
            {
              id: 'junior_team',
              label: isSenior ? `Junior Doctors (${juniorDoctors.length})` : 'Supervision & Team',
              icon: Stethoscope,
            },
            {
              id: 'clinical_reviews',
              label: isSenior
                ? `Approval Queue (${pendingReviewCount} Pending)`
                : `My Clinical Submissions (${submissions.length})`,
              icon: ClipboardList,
            },
            { id: 'activity_audit', label: `Activity & Audit History (${activities.length})`, icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ProfileTab)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all min-h-[44px] ${
                activeTab === tab.id
                  ? 'bg-[var(--color-primary)] text-white shadow-sm'
                  : 'bg-[var(--color-surface-subtle)] text-[var(--color-muted)] hover:text-[var(--color-ink)] border border-[var(--color-line)]'
              }`}
            >
              <tab.icon size={15} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: DOCTOR PROFILE & RBAC MATRIX */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card p-6 sm:p-8 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
              <h2 className="text-xl font-display font-semibold text-[var(--color-ink)]">
                Personal & Clinical Credentials
              </h2>
              <span className="text-xs text-[var(--color-muted)] font-mono">ID: {activeDoctor.id}</span>
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleSaveOwnProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                      className="w-full p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Phone</label>
                    <input
                      type="text"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Qualifications</label>
                    <input
                      type="text"
                      value={profileForm.qualification}
                      onChange={(e) => setProfileForm({ ...profileForm, qualification: e.target.value })}
                      className="w-full p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Specialization</label>
                    <input
                      type="text"
                      value={profileForm.specialization}
                      onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })}
                      className="w-full p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Experience (Years)</label>
                    <input
                      type="number"
                      min={0}
                      max={65}
                      value={profileForm.experienceYears}
                      onChange={(e) => setProfileForm({ ...profileForm, experienceYears: Number(e.target.value) })}
                      className="w-full p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Hospital Affiliation</label>
                    <input
                      type="text"
                      value={profileForm.hospitalName}
                      onChange={(e) => setProfileForm({ ...profileForm, hospitalName: e.target.value })}
                      className="w-full p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Clinical Bio</label>
                  <textarea
                    rows={3}
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-sm resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="btn-primary px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 min-h-[44px]">
                    <Save size={15} /> Save Profile Changes
                  </button>
                  <button type="button" onClick={() => setIsEditingProfile(false)} className="btn-outline px-5 py-2.5 rounded-xl text-xs font-semibold min-h-[44px]">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Email (Login ID)</p>
                  <p className="font-semibold text-[var(--color-ink)] mt-1 flex items-center gap-2"><Mail size={14} className="text-[var(--color-primary)]" /> {activeDoctor.email}</p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Contact Phone</p>
                  <p className="font-semibold text-[var(--color-ink)] mt-1 flex items-center gap-2"><Phone size={14} className="text-[var(--color-primary)]" /> {activeDoctor.phone}</p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Qualifications</p>
                  <p className="font-semibold text-[var(--color-ink)] mt-1 flex items-center gap-2"><Award size={14} className="text-[var(--color-primary)]" /> {activeDoctor.qualification}</p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Specialization</p>
                  <p className="font-semibold text-[var(--color-ink)] mt-1 flex items-center gap-2"><Stethoscope size={14} className="text-[var(--color-primary)]" /> {activeDoctor.specialization}</p>
                </div>
                <div className="sm:col-span-2 p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Clinical Biography</p>
                  <p className="text-xs sm:text-sm text-[var(--color-ink)] mt-1 leading-relaxed">{activeDoctor.bio}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: RBAC Permissions + Account Switcher */}
          <div className="space-y-6">
            <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[var(--color-primary)] font-semibold text-sm">
                <Lock size={16} />
                <span>Role-Based Access Control (RBAC)</span>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Create & Manage Junior Doctors', allowed: isSenior },
                  { label: 'Approve / Reject Clinical Decisions', allowed: isSenior },
                  { label: 'Publish Official Prescriptions Directly', allowed: isSenior },
                  { label: 'Monitor Junior Doctor Interactions', allowed: isSenior },
                  { label: 'Access Assigned Patient Records', allowed: true },
                  { label: 'Submit Prescriptions & Notes for Review', allowed: true },
                  { label: 'Communicate & Manage Follow-ups', allowed: true },
                ].map((perm, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)]">
                    <span className="text-[var(--color-ink)] font-medium">{perm.label}</span>
                    {perm.allowed ? (
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle size={15} className="text-[var(--color-muted)] shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Individual Doctor Login Switcher */}
            <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl shadow-sm space-y-3">
              <h3 className="text-sm font-display font-semibold text-[var(--color-ink)]">
                Active Doctor Accounts (Switch Session)
              </h3>
              <p className="text-[11px] text-[var(--color-muted)]">
                Switch between Senior Consultant and registered Junior Doctor accounts to verify role permissions and approval workflows.
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {doctorManagementService.getAllDoctors().map((docAcc) => (
                  <button
                    key={docAcc.id}
                    type="button"
                    disabled={docAcc.status !== 'active' || docAcc.id === activeDoctor.id}
                    onClick={() => handleSwitchDoctorSession(docAcc)}
                    className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                      docAcc.id === activeDoctor.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-mist)]/50 font-semibold'
                        : docAcc.status !== 'active'
                        ? 'border-[var(--color-line)] opacity-50 cursor-not-allowed'
                        : 'border-[var(--color-line)] hover:border-[var(--color-primary)] bg-[var(--color-surface-subtle)]'
                    }`}
                  >
                    <div>
                      <p className="text-[var(--color-ink)]">{docAcc.fullName}</p>
                      <p className="text-[10px] text-[var(--color-muted)]">
                        {docAcc.hierarchyRole === 'senior_consultant' ? 'Senior Doctor' : 'Junior Doctor'} • {docAcc.email}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-[var(--color-primary)]">
                      {docAcc.id === activeDoctor.id ? 'Active' : docAcc.status !== 'active' ? 'Inactive' : 'Switch →'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: JUNIOR DOCTOR TEAM MANAGEMENT */}
      {activeTab === 'junior_team' && (
        <div className="card p-6 sm:p-8 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-line)] pb-4">
            <div>
              <h2 className="text-xl font-display font-semibold text-[var(--color-ink)]">
                {isSenior ? 'Managed Junior Doctor Roster' : 'Clinical Supervision Hierarchy'}
              </h2>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                {isSenior
                  ? 'Register, edit, monitor, and manage individual login accounts for Junior Doctors mapped under your clinical supervision.'
                  : `You are mapped under supervising Senior Doctor ${activeDoctor.assignedSeniorDoctorName}. All clinical recommendations require Senior approval.`}
              </p>
            </div>
            {isSenior && (
              <button
                type="button"
                onClick={openCreateJuniorModal}
                className="btn-primary px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 min-h-[44px]"
              >
                <UserPlus size={15} /> Add Junior Doctor
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {juniorDoctors.map((jr) => (
              <div
                key={jr.id}
                className={`p-5 rounded-2xl border transition-all space-y-3 ${
                  jr.status === 'active'
                    ? 'bg-[var(--color-surface-subtle)] border-[var(--color-line)]'
                    : 'bg-slate-100/60 dark:bg-slate-900/40 border-rose-200 dark:border-rose-900/40 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold text-base text-[var(--color-ink)]">
                        {jr.fullName}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          jr.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}
                      >
                        {jr.status}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">{jr.qualification} • {jr.specialization}</p>
                    <p className="text-[11px] font-mono text-[var(--color-primary)] mt-1">
                      Login: {jr.email} • Reg: {jr.licenseNumber}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-[var(--color-muted)] flex flex-wrap gap-3 pt-1">
                  <span>Experience: <strong className="text-[var(--color-ink)]">{jr.experienceYears} yrs</strong></span>
                  <span>•</span>
                  <span>Assigned Patients: <strong className="text-[var(--color-ink)]">{jr.assignedPatientIds.length}</strong></span>
                  <span>•</span>
                  <span>Supervisor: <strong className="text-[var(--color-ink)]">{jr.assignedSeniorDoctorName}</strong></span>
                </div>

                {isSenior && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-[var(--color-line)]">
                    <button
                      type="button"
                      onClick={() => openEditJuniorModal(jr)}
                      className="btn-outline px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px]"
                    >
                      <Edit3 size={13} /> Edit Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleJuniorStatus(jr)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border min-h-[40px] ${
                        jr.status === 'active'
                          ? 'border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300'
                          : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300'
                      }`}
                    >
                      {jr.status === 'active' ? <UserX size={13} /> : <UserCheck size={13} />}
                      {jr.status === 'active' ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CLINICAL SUBMISSIONS & SENIOR REVIEW QUEUE */}
      {activeTab === 'clinical_reviews' && (
        <div className="card p-6 sm:p-8 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-line)] pb-4">
            <div>
              <h2 className="text-xl font-display font-semibold text-[var(--color-ink)]">
                {isSenior
                  ? 'Senior Doctor Approval & Supervision Queue'
                  : 'My Submitted Clinical Recommendations'}
              </h2>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Only submissions approved by the supervising Senior Doctor become official medical decisions visible to the patient.
              </p>
            </div>
            {!isSenior && (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="btn-primary px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 min-h-[44px]"
              >
                <Send size={15} /> New Clinical Submission
              </button>
            )}
          </div>

          <div className="space-y-4">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="p-5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)] space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-line)] text-[10px] font-bold uppercase text-[var(--color-primary)]">
                        {sub.submissionType.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          sub.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : sub.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                            : sub.status === 'modification_requested'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                        }`}
                      >
                        {sub.status.replace(/_/g, ' ')}
                      </span>
                      {sub.isOfficialDecision && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-semibold">
                          Official Decision • Visible to Patient
                        </span>
                      )}
                    </div>
                    <h3 className="font-display font-semibold text-base text-[var(--color-ink)]">
                      {sub.title}
                    </h3>
                    <p className="text-xs text-[var(--color-muted)]">
                      Patient: <strong className="text-[var(--color-ink)]">{sub.patientName}</strong> • Submitted by{' '}
                      <strong className="text-[var(--color-ink)]">{sub.juniorDoctorName}</strong> → Supervisor:{' '}
                      <strong className="text-[var(--color-ink)]">{sub.seniorDoctorName}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    {isSenior && sub.status === 'pending_review' && (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewingSubmission(sub);
                          setReviewNotes('');
                        }}
                        className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px]"
                      >
                        <ShieldCheck size={14} /> Review & Decide
                      </button>
                    )}
                    {!isSenior && sub.status === 'modification_requested' && (
                      <button
                        type="button"
                        onClick={() => {
                          setResubmittingItem(sub);
                          setResubmitForm({ title: sub.title, clinicalDetails: sub.clinicalDetails });
                        }}
                        className="btn-accent px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px]"
                      >
                        <RefreshCw size={14} /> Revise & Resubmit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedHistoryId(expandedHistoryId === sub.id ? null : sub.id)}
                      className="btn-outline px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px]"
                    >
                      <History size={13} /> History ({sub.history.length})
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] text-xs space-y-2">
                  <p className="text-[var(--color-ink)] leading-relaxed">{sub.clinicalDetails}</p>
                  {sub.medicationList && sub.medicationList.length > 0 && (
                    <div className="pt-2 border-t border-[var(--color-line)] space-y-1">
                      <p className="text-[10px] font-bold uppercase text-[var(--color-muted)]">Proposed Medications:</p>
                      {sub.medicationList.map((m, idx) => (
                        <p key={idx} className="font-mono text-[11px] text-[var(--color-primary)]">
                          • {m.name} {m.dosage} — {m.frequency} ({m.duration})
                        </p>
                      ))}
                    </div>
                  )}
                  {sub.seniorReviewNotes && (
                    <p className="pt-2 border-t border-[var(--color-line)] text-[var(--color-primary)] font-medium">
                      Senior Review Notes: {sub.seniorReviewNotes}
                    </p>
                  )}
                </div>

                {/* Submission Audit Trail */}
                {expandedHistoryId === sub.id && (
                  <div className="p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] space-y-2 animate-fadeIn">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                      Immutable Submission Audit History
                    </p>
                    {sub.history.map((h) => (
                      <div key={h.id} className="flex items-start justify-between gap-3 text-xs border-l-2 border-[var(--color-primary)] pl-3 py-1">
                        <div>
                          <p className="font-semibold text-[var(--color-ink)] capitalize">
                            {h.action.replace(/_/g, ' ')} by {h.actorName}
                          </p>
                          <p className="text-[var(--color-muted)]">{h.notes}</p>
                        </div>
                        <span className="text-[10px] font-mono text-[var(--color-muted)] shrink-0">
                          {new Date(h.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SUPERVISED ACTIVITY & AUDIT LOG */}
      {activeTab === 'activity_audit' && (
        <div className="card p-6 sm:p-8 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl shadow-sm space-y-4">
          <div className="border-b border-[var(--color-line)] pb-3">
            <h2 className="text-xl font-display font-semibold text-[var(--color-ink)]">
              Junior & Senior Doctor Clinical Activity Log
            </h2>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              Complete timestamped audit trail of registrations, logins, patient interactions, follow-ups, submissions, and approvals.
            </p>
          </div>

          <div className="space-y-2.5">
            {activities.map((act) => (
              <div
                key={act.id}
                className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--color-ink)]">{act.doctorName}</span>
                    <span className="px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-line)] text-[10px] font-mono uppercase text-[var(--color-primary)]">
                      {act.actionType.replace(/_/g, ' ')}
                    </span>
                    {act.patientName && (
                      <span className="text-[var(--color-muted)]">• Patient: {act.patientName}</span>
                    )}
                  </div>
                  <p className="text-[var(--color-muted)]">{act.summary}</p>
                </div>
                <span className="text-[11px] font-mono text-[var(--color-muted)] shrink-0">
                  {new Date(act.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT JUNIOR DOCTOR (Senior Only) */}
      {showJuniorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
              <h3 className="text-lg font-display font-semibold text-[var(--color-ink)]">
                {editingJuniorId ? 'Edit Junior Doctor Profile' : 'Register New Junior Doctor'}
              </h3>
              <button onClick={() => setShowJuniorModal(false)} className="p-2 text-[var(--color-muted)]">✕</button>
            </div>

            <form onSubmit={handleSaveJuniorDoctor} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={juniorForm.fullName}
                    onChange={(e) => setJuniorForm({ ...juniorForm, fullName: e.target.value })}
                    placeholder="Dr. Priya Nair"
                    className="w-full p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Individual Login Email</label>
                  <input
                    type="email"
                    disabled={!!editingJuniorId}
                    value={juniorForm.email}
                    onChange={(e) => setJuniorForm({ ...juniorForm, email: e.target.value })}
                    placeholder="priya.nair@olmera.health"
                    className="w-full p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] disabled:opacity-60"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Login Password / Access Code</label>
                  <input
                    type="text"
                    value={juniorForm.accessCode}
                    onChange={(e) => setJuniorForm({ ...juniorForm, accessCode: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Medical Reg / License ID</label>
                  <input
                    type="text"
                    value={juniorForm.licenseNumber}
                    onChange={(e) => setJuniorForm({ ...juniorForm, licenseNumber: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Qualification</label>
                  <input
                    type="text"
                    value={juniorForm.qualification}
                    onChange={(e) => setJuniorForm({ ...juniorForm, qualification: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Specialization</label>
                  <input
                    type="text"
                    value={juniorForm.specialization}
                    onChange={(e) => setJuniorForm({ ...juniorForm, specialization: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={juniorForm.experienceYears}
                    onChange={(e) => setJuniorForm({ ...juniorForm, experienceYears: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={juniorForm.phone}
                    onChange={(e) => setJuniorForm({ ...juniorForm, phone: e.target.value })}
                    placeholder="+91 98480 00000"
                    className="w-full p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]"
                  />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--color-mist)]/40 border border-[var(--color-line)] text-[11px] text-[var(--color-primary)] font-medium">
                Supervision Mapping: Automatically mapped to Senior Doctor <strong>{activeDoctor.fullName}</strong>.
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowJuniorModal(false)} className="btn-outline flex-1 py-2.5 rounded-xl min-h-[44px]">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 py-2.5 rounded-xl font-semibold min-h-[44px]">
                  {editingJuniorId ? 'Save Changes' : 'Register Junior Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: JUNIOR SUBMIT CLINICAL RECOMMENDATION */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
              <div>
                <h3 className="text-lg font-display font-semibold text-[var(--color-ink)]">
                  Submit Clinical Recommendation
                </h3>
                <p className="text-[11px] text-[var(--color-muted)]">
                  Sent to {activeDoctor.assignedSeniorDoctorName} for mandatory approval
                </p>
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="p-2 text-[var(--color-muted)]">✕</button>
            </div>

            <form onSubmit={handleSubmitRecommendation} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Submission Type</label>
                  <select
                    value={submissionForm.submissionType}
                    onChange={(e) => setSubmissionForm({ ...submissionForm, submissionType: e.target.value as SubmissionType })}
                    className="w-full p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]"
                  >
                    <option value="prescription">Prescription</option>
                    <option value="treatment_recommendation">Treatment Recommendation</option>
                    <option value="diagnosis">Provisional Diagnosis</option>
                    <option value="medical_note">Medical Note</option>
                    <option value="follow_up">Follow-up Plan</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Patient Name</label>
                  <input
                    type="text"
                    value={submissionForm.patientName}
                    onChange={(e) => setSubmissionForm({ ...submissionForm, patientName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Clinical Title / Summary</label>
                <input
                  type="text"
                  value={submissionForm.title}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, title: e.target.value })}
                  placeholder="e.g. Antihypertensive Dose Adjustment"
                  className="w-full p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]"
                  required
                />
              </div>

              {submissionForm.submissionType === 'prescription' && (
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)]">
                  <input
                    type="text"
                    placeholder="Medicine Name (e.g. Telmisartan)"
                    value={submissionForm.medName}
                    onChange={(e) => setSubmissionForm({ ...submissionForm, medName: e.target.value })}
                    className="p-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)]"
                  />
                  <input
                    type="text"
                    placeholder="Dosage (e.g. 40 mg)"
                    value={submissionForm.medDosage}
                    onChange={(e) => setSubmissionForm({ ...submissionForm, medDosage: e.target.value })}
                    className="p-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)]"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Detailed Observations & Recommendation</label>
                <textarea
                  rows={4}
                  value={submissionForm.clinicalDetails}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, clinicalDetails: e.target.value })}
                  placeholder="Enter clinical rationale, vitals context, and recommended treatment plan..."
                  className="w-full p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowSubmitModal(false)} className="btn-outline flex-1 py-2.5 rounded-xl min-h-[44px]">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 py-2.5 rounded-xl font-semibold min-h-[44px]">
                  Submit to Senior Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SENIOR DOCTOR REVIEW DECISION */}
      {reviewingSubmission && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
              <div>
                <h3 className="text-lg font-display font-semibold text-[var(--color-ink)]">
                  Senior Doctor Clinical Review
                </h3>
                <p className="text-xs text-[var(--color-muted)]">
                  Submitted by {reviewingSubmission.juniorDoctorName} • Patient: {reviewingSubmission.patientName}
                </p>
              </div>
              <button onClick={() => setReviewingSubmission(null)} className="p-2 text-[var(--color-muted)]">✕</button>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)] text-xs space-y-2">
              <p className="font-semibold text-[var(--color-ink)]">{reviewingSubmission.title}</p>
              <p className="text-[var(--color-muted)] leading-relaxed">{reviewingSubmission.clinicalDetails}</p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block">
                Senior Consultant Review Notes (Required for Reject / Modification)
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter approval sign-off notes, rejection reason, or requested modifications..."
                className="w-full p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleSeniorDecision('approved')}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <CheckCircle2 size={14} /> Approve
              </button>
              <button
                type="button"
                onClick={() => handleSeniorDecision('modification_requested')}
                className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <RefreshCw size={14} /> Request Edit
              </button>
              <button
                type="button"
                onClick={() => handleSeniorDecision('rejected')}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <XCircle size={14} /> Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: JUNIOR DOCTOR REVISE & RESUBMIT */}
      {resubmittingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
              <h3 className="text-lg font-display font-semibold text-[var(--color-ink)]">
                Revise & Resubmit Recommendation
              </h3>
              <button onClick={() => setResubmittingItem(null)} className="p-2 text-[var(--color-muted)]">✕</button>
            </div>

            {resubmittingItem.seniorReviewNotes && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 text-xs text-amber-900 dark:text-amber-200">
                <strong>Senior Feedback:</strong> {resubmittingItem.seniorReviewNotes}
              </div>
            )}

            <form onSubmit={handleResubmitModified} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Title</label>
                <input
                  type="text"
                  value={resubmitForm.title}
                  onChange={(e) => setResubmitForm({ ...resubmitForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Revised Clinical Details</label>
                <textarea
                  rows={4}
                  value={resubmitForm.clinicalDetails}
                  onChange={(e) => setResubmitForm({ ...resubmitForm, clinicalDetails: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] resize-none"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setResubmittingItem(null)} className="btn-outline flex-1 py-2.5 rounded-xl min-h-[44px]">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 py-2.5 rounded-xl font-semibold min-h-[44px]">
                  Resubmit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
