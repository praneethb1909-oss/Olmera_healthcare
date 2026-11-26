import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2, Stethoscope, ShieldCheck, Plus, Edit2, Trash2, Search,
  CheckCircle2, AlertTriangle, Key, UserPlus, RefreshCw, Lock, Unlock,
  Bed, Activity, X, ShieldAlert
} from 'lucide-react';
import {
  masterAdminService,
  MasterHospitalRecord,
  MasterDoctorRecord,
  MasterAdminActor
} from '../../services/admin/masterAdminService';
import { hospitalIdp, HospitalStaffProfile } from '../../services/auth/hospitalIdp';
import { HOSPITAL_ROLES, HospitalAdminRole, hasHospitalPermission } from '../../services/auth/rbac';
import { HOSPITAL_PASSWORD_RULES, validateHospitalPassword } from '../../services/auth/passwordPolicy';
import { sessionManager } from '../../services/auth/sessionManager';
import { useAuth } from '../../contexts/AuthContext';

type ManagementSection = 'facilities' | 'doctors' | 'admin_accounts';

export function HospitalManagementConsole() {
  const { user, hospitalAdminProfile } = useAuth();
  const [section, setSection] = useState<ManagementSection>('facilities');

  const actor: MasterAdminActor = useMemo(() => {
    const sess = sessionManager.getActiveSession()?.user || hospitalAdminProfile;
    return {
      staffId: sess?.staffId || user?.uid || 'ADM-SESSION',
      email: sess?.email || user?.email || '',
      fullName: sess?.fullName || user?.displayName || 'Hospital Administrator',
      role: (sess?.role as HospitalAdminRole) || 'super_admin',
    };
  }, [user, hospitalAdminProfile]);

  const canManageInfra = actor.role === 'super_admin' || hasHospitalPermission(actor.role as HospitalAdminRole, 'infra:manage');
  const canManageDoctors = actor.role === 'super_admin' || hasHospitalPermission(actor.role as HospitalAdminRole, 'doctors:manage');
  const canManageSecurity = actor.role === 'super_admin' || actor.role === 'hospital_director' || hasHospitalPermission(actor.role as HospitalAdminRole, 'security:manage');

  // Live Operational State (No dummy/static numbers)
  const [hospitals, setHospitals] = useState<MasterHospitalRecord[]>([]);
  const [doctors, setDoctors] = useState<MasterDoctorRecord[]>([]);
  const [adminAccounts, setAdminAccounts] = useState<HospitalStaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & Filter States
  const [facilitySearch, setFacilitySearch] = useState('');
  const [facilityStatusFilter, setFacilityStatusFilter] = useState<'all' | 'operational' | 'maintenance'>('all');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorHospitalFilter, setDoctorHospitalFilter] = useState<string>('all');
  const [adminSearch, setAdminSearch] = useState('');

  // Hospital CRUD Modal
  const [hospitalModal, setHospitalModal] = useState<{ open: boolean; editing: MasterHospitalRecord | null }>({ open: false, editing: null });
  const [hospitalForm, setHospitalForm] = useState({
    name: '', city: '', code: '', totalBeds: 100, icuBeds: 16, contactEmail: '', status: 'operational' as MasterHospitalRecord['status']
  });

  // Doctor CRUD Modal
  const [doctorModal, setDoctorModal] = useState<{ open: boolean; editing: MasterDoctorRecord | null }>({ open: false, editing: null });
  const [doctorForm, setDoctorForm] = useState({
    fullName: '', email: '', phone: '', specialization: '', qualification: 'MBBS, MD', experienceYears: 5,
    hospitalName: '', hierarchyRole: 'senior_consultant' as MasterDoctorRecord['hierarchyRole'], status: 'active' as MasterDoctorRecord['status']
  });

  // Create Hospital Admin Modal
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({
    fullName: '',
    email: '',
    hospitalId: 'hosp-1',
    department: 'Hospital Administration & Operations',
    role: 'hospital_administrator' as HospitalAdminRole,
    password: '',
    mfaEnabled: true
  });

  // Password Reset Modal
  const [resetTarget, setResetTarget] = useState<HospitalStaffProfile | null>(null);
  const [resetTempPassword, setResetTempPassword] = useState('');
  const [resetResult, setResetResult] = useState<{ token: string; expiresAt: number } | null>(null);

  // Confirmation Prompt Modal for Deletions & Suspensions
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const loadLiveOperationalData = async () => {
    setLoading(true);
    try {
      const liveHospitals = masterAdminService.getHospitals();
      const liveDoctors = masterAdminService.getDoctors();
      const liveAdmins = await hospitalIdp.getAllStaffAccounts();
      setHospitals(liveHospitals);
      setDoctors(liveDoctors);
      setAdminAccounts(liveAdmins);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveOperationalData();
  }, []);

  const notify = (type: 'success' | 'error', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 5000);
  };

  // Live computed metrics (derived strictly from active state)
  const liveTotals = useMemo(() => {
    const totalBeds = hospitals.reduce((sum, h) => sum + (Number(h.totalBeds) || 0), 0);
    const totalIcu = hospitals.reduce((sum, h) => sum + (Number(h.icuBeds) || 0), 0);
    const operationalHospitals = hospitals.filter(h => h.status === 'operational').length;
    const activeDoctors = doctors.filter(d => d.status === 'active').length;
    return { totalBeds, totalIcu, operationalHospitals, activeDoctors };
  }, [hospitals, doctors]);

  const getDoctorCountForHospital = (hospitalName: string) => {
    const norm = hospitalName.trim().toLowerCase();
    return doctors.filter(d => d.hospitalName.trim().toLowerCase() === norm).length;
  };

  // Filtered Lists
  const filteredHospitals = hospitals.filter(h => {
    const matchesStatus = facilityStatusFilter === 'all' || h.status === facilityStatusFilter;
    const q = facilitySearch.trim().toLowerCase();
    const matchesQ = !q || h.name.toLowerCase().includes(q) || h.city.toLowerCase().includes(q) || h.code.toLowerCase().includes(q);
    return matchesStatus && matchesQ;
  });

  const filteredDoctors = doctors.filter(d => {
    const matchesHosp = doctorHospitalFilter === 'all' || d.hospitalName === doctorHospitalFilter;
    const q = doctorSearch.trim().toLowerCase();
    const matchesQ = !q || d.fullName.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q) || d.email.toLowerCase().includes(q);
    return matchesHosp && matchesQ;
  });

  const filteredAdmins = adminAccounts.filter(a => {
    const q = adminSearch.trim().toLowerCase();
    return !q || a.fullName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.staffId.toLowerCase().includes(q) || a.hospitalName.toLowerCase().includes(q);
  });

  // --- Hospital CRUD Handlers ---
  const handleSaveHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = hospitalModal.editing
      ? await masterAdminService.updateHospital(actor, hospitalModal.editing.id, hospitalForm)
      : await masterAdminService.addHospital(actor, hospitalForm);

    if (!res.success) {
      notify('error', res.error || 'Failed to save hospital record.');
      return;
    }
    setHospitalModal({ open: false, editing: null });
    await loadLiveOperationalData();
    notify('success', hospitalModal.editing ? 'Hospital facility updated.' : 'New hospital facility registered.');
  };

  // --- Doctor CRUD Handlers ---
  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = doctorModal.editing
      ? await masterAdminService.updateDoctor(actor, doctorModal.editing.id, doctorForm)
      : await masterAdminService.addDoctor(actor, doctorForm);

    if (!res.success) {
      notify('error', res.error || 'Failed to save doctor profile.');
      return;
    }
    setDoctorModal({ open: false, editing: null });
    await loadLiveOperationalData();
    notify('success', doctorModal.editing ? 'Doctor profile updated.' : 'New doctor profile registered.');
  };

  // --- Hospital Admin Account Handlers ---
  const adminPasswordCheck = validateHospitalPassword(adminForm.password);

  const handleCreateAdminAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const hosp = hospitals.find(h => h.id === adminForm.hospitalId);
    const res = await hospitalIdp.createHospitalAdminAccount(actor, {
      ...adminForm,
      hospitalName: hosp?.name
    });

    if (!res.success) {
      notify('error', res.error || 'Failed to create hospital admin account.');
      return;
    }

    setShowCreateAdminModal(false);
    setAdminForm({
      fullName: '', email: '', hospitalId: hospitals[0]?.id || 'hosp-1',
      department: 'Hospital Administration & Operations', role: 'hospital_administrator', password: '', mfaEnabled: true
    });
    await loadLiveOperationalData();
    notify('success', `Hospital Admin account created for ${res.profile?.fullName} (${res.profile?.staffId}).`);
  };

  const handleInitiatePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;

    const res = await hospitalIdp.initiateAdminPasswordReset(
      actor,
      resetTarget.email,
      resetTempPassword.trim() || undefined
    );

    if (!res.success || !res.resetToken || !res.expiresAt) {
      notify('error', res.error || 'Password reset failed.');
      return;
    }

    setResetResult({ token: res.resetToken, expiresAt: res.expiresAt });
    setResetTempPassword('');
    await loadLiveOperationalData();
    notify('success', `Secure 15-minute password reset issued for ${resetTarget.email}.`);
  };

  const handleToggleAdminStatus = (target: HospitalStaffProfile) => {
    const nextStatus = target.status === 'active' ? 'suspended' : 'active';
    setConfirmAction({
      title: `${nextStatus === 'suspended' ? 'Suspend' : 'Activate'} Admin Account`,
      description: `Are you sure you want to change status of ${target.fullName} (${target.email}) to "${nextStatus}"? This action is audit logged.`,
      confirmLabel: nextStatus === 'suspended' ? 'Confirm Suspend' : 'Confirm Activate',
      onConfirm: async () => {
        const res = await hospitalIdp.updateHospitalAdminCredentials(actor, target.email, { status: nextStatus });
        if (!res.success) {
          notify('error', res.error || 'Status update failed.');
          return;
        }
        await loadLiveOperationalData();
        notify('success', `Admin account ${target.email} is now ${nextStatus}.`);
      }
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn font-ui text-[var(--color-ink)] pb-12">
      {/* Feedback Banner */}
      {banner && (
        <div
          role="status"
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
          <button onClick={() => setBanner(null)} className="px-2 font-bold" aria-label="Dismiss message">✕</button>
        </div>
      )}

      {/* Header + Live Telemetry Summary */}
      <div className="card p-6 sm:p-8 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-mist)]/60 border border-[var(--color-line)] text-xs font-semibold text-[var(--color-primary)]">
              <Building2 size={14} /> Live Hospital Administration & Operations
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--color-ink)]">
              Hospital Infrastructure, Practitioners & Admin Accounts
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-muted)]">
              Real-time operational state synchronized across registered facilities, clinical staff, and hospital admin credentials.
            </p>
          </div>

          <button
            type="button"
            onClick={loadLiveOperationalData}
            className="btn-outline px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 self-start lg:self-auto min-h-[44px]"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Live State
          </button>
        </div>

        {/* Live Computed Telemetry Cards (Zero Hardcoded Numbers) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Operational Hospitals</p>
            <p className="text-2xl font-display font-semibold text-[var(--color-primary)] mt-1">
              {liveTotals.operationalHospitals} <span className="text-xs font-ui text-[var(--color-muted)]">/ {hospitals.length}</span>
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Network Bed Capacity</p>
            <p className="text-2xl font-display font-semibold text-[var(--color-ink)] mt-1">
              {liveTotals.totalBeds} <span className="text-xs font-ui text-[var(--color-muted)]">({liveTotals.totalIcu} ICU)</span>
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Active Practitioners</p>
            <p className="text-2xl font-display font-semibold text-[var(--color-ink)] mt-1">
              {liveTotals.activeDoctors} <span className="text-xs font-ui text-[var(--color-muted)]">/ {doctors.length} total</span>
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Hospital Admin Accounts</p>
            <p className="text-2xl font-display font-semibold text-[var(--color-primary)] mt-1">
              {adminAccounts.filter(a => a.status === 'active').length} <span className="text-xs font-ui text-[var(--color-muted)]">active</span>
            </p>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--color-line)]">
          {[
            { id: 'facilities', label: `Facilities & Beds (${hospitals.length})`, icon: Building2 },
            { id: 'doctors', label: `Doctor Management (${doctors.length})`, icon: Stethoscope },
            { id: 'admin_accounts', label: `Hospital Admin Accounts (${adminAccounts.length})`, icon: ShieldCheck },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id as ManagementSection)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all min-h-[44px] ${
                section === tab.id
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

      {/* SECTION 1: HOSPITAL FACILITIES */}
      {section === 'facilities' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  type="text"
                  value={facilitySearch}
                  onChange={e => setFacilitySearch(e.target.value)}
                  placeholder="Search hospital name, city, or code..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-xs min-h-[44px]"
                />
              </div>
              <select
                value={facilityStatusFilter}
                onChange={e => setFacilityStatusFilter(e.target.value as any)}
                className="px-3 py-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-xs min-h-[44px]"
              >
                <option value="all">All Statuses</option>
                <option value="operational">Operational</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            {canManageInfra && (
              <button
                type="button"
                onClick={() => {
                  setHospitalForm({ name: '', city: '', code: '', totalBeds: 120, icuBeds: 20, contactEmail: '', status: 'operational' });
                  setHospitalModal({ open: true, editing: null });
                }}
                className="btn-primary px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 min-h-[44px]"
              >
                <Plus size={15} /> Add Hospital Facility
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredHospitals.map(h => {
              const liveDocCount = getDoctorCountForHospital(h.name);
              return (
                <div key={h.id} className="card p-6 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl shadow-sm space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--color-mist)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-lg text-[var(--color-ink)]">{h.name}</h3>
                        <p className="text-xs text-[var(--color-muted)]">
                          <span className="font-mono font-bold text-[var(--color-primary)]">{h.code}</span> • {h.city} • {h.contactEmail}
                        </p>
                      </div>
                    </div>

                    {canManageInfra && (
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setHospitalForm({
                              name: h.name, city: h.city, code: h.code, totalBeds: h.totalBeds,
                              icuBeds: h.icuBeds, contactEmail: h.contactEmail, status: h.status
                            });
                            setHospitalModal({ open: true, editing: h });
                          }}
                          className="p-2.5 rounded-xl border border-[var(--color-line)] hover:border-[var(--color-primary)] text-[var(--color-primary)] min-h-[40px] min-w-[40px] flex items-center justify-center"
                          aria-label={`Edit ${h.name}`}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmAction({
                            title: 'Delete Hospital Facility',
                            description: `Permanently remove "${h.name}" (${h.code}) from the Olmera network? This action will be audit logged.`,
                            confirmLabel: 'Delete Hospital',
                            onConfirm: async () => {
                              const res = await masterAdminService.deleteHospital(actor, h.id);
                              if (!res.success) notify('error', res.error || 'Delete failed.');
                              else { await loadLiveOperationalData(); notify('success', `Removed ${h.name}.`); }
                            }
                          })}
                          className="p-2.5 rounded-xl border border-[var(--color-line)] hover:border-rose-400 text-rose-600 min-h-[40px] min-w-[40px] flex items-center justify-center"
                          aria-label={`Delete ${h.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[var(--color-line)] text-xs">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Assigned Doctors</p>
                      <p className="text-lg font-display font-semibold text-[var(--color-ink)] mt-0.5">{liveDocCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Total / ICU Beds</p>
                      <p className="text-lg font-display font-semibold text-[var(--color-ink)] mt-0.5">{h.totalBeds} <span className="text-xs font-ui text-[var(--color-muted)]">/ {h.icuBeds}</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Status</p>
                      <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${h.status === 'operational' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-50 text-amber-800'}`}>
                        {h.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: DOCTOR MANAGEMENT */}
      {section === 'doctors' && (
        <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  type="text"
                  value={doctorSearch}
                  onChange={e => setDoctorSearch(e.target.value)}
                  placeholder="Search doctors by name, specialty, email..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-xs min-h-[44px]"
                />
              </div>
              <select
                value={doctorHospitalFilter}
                onChange={e => setDoctorHospitalFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-xs min-h-[44px]"
              >
                <option value="all">All Hospitals</option>
                {hospitals.map(h => (
                  <option key={h.id} value={h.name}>{h.name}</option>
                ))}
              </select>
            </div>

            {canManageDoctors && (
              <button
                type="button"
                onClick={() => {
                  setDoctorForm({
                    fullName: '', email: '', phone: '', specialization: 'Internal Medicine', qualification: 'MBBS, MD',
                    experienceYears: 5, hospitalName: hospitals[0]?.name || '', hierarchyRole: 'senior_consultant', status: 'active'
                  });
                  setDoctorModal({ open: true, editing: null });
                }}
                className="btn-primary px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 min-h-[44px]"
              >
                <Plus size={15} /> Add Doctor Profile
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--color-line)] text-[var(--color-muted)] uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3">Practitioner</th>
                  <th className="py-3 px-3">Specialty & Qualification</th>
                  <th className="py-3 px-3">Assigned Hospital</th>
                  <th className="py-3 px-3">Hierarchy Role</th>
                  <th className="py-3 px-3">Status</th>
                  {canManageDoctors && <th className="py-3 px-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {filteredDoctors.map(d => (
                  <tr key={d.id} className="hover:bg-[var(--color-surface-subtle)]/50">
                    <td className="py-3.5 px-3">
                      <p className="font-semibold text-[var(--color-ink)]">{d.fullName}</p>
                      <p className="text-[11px] text-[var(--color-muted)]">{d.email}</p>
                    </td>
                    <td className="py-3.5 px-3">
                      <p className="font-medium">{d.specialization}</p>
                      <p className="text-[10px] text-[var(--color-muted)]">{d.qualification} • {d.experienceYears} yrs</p>
                    </td>
                    <td className="py-3.5 px-3">{d.hospitalName}</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-[var(--color-mist)]/60 text-[var(--color-primary)] text-[10px] font-semibold uppercase">
                        {d.hierarchyRole === 'senior_consultant' ? 'Senior Consultant' : 'Junior Resident'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${d.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-50 text-rose-700'}`}>
                        {d.status}
                      </span>
                    </td>
                    {canManageDoctors && (
                      <td className="py-3.5 px-3 text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setDoctorForm({
                                fullName: d.fullName, email: d.email, phone: d.phone, specialization: d.specialization,
                                qualification: d.qualification, experienceYears: d.experienceYears, hospitalName: d.hospitalName,
                                hierarchyRole: d.hierarchyRole, status: d.status
                              });
                              setDoctorModal({ open: true, editing: d });
                            }}
                            className="p-2 rounded-lg border border-[var(--color-line)] hover:border-[var(--color-primary)] text-[var(--color-primary)]"
                            aria-label={`Edit ${d.fullName}`}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmAction({
                              title: 'Remove Doctor Record',
                              description: `Remove "${d.fullName}" (${d.specialization}) from active hospital practitioners? This action is permanently logged.`,
                              confirmLabel: 'Remove Doctor',
                              onConfirm: async () => {
                                const res = await masterAdminService.deleteDoctor(actor, d.id);
                                if (!res.success) notify('error', res.error || 'Delete failed.');
                                else { await loadLiveOperationalData(); notify('success', `Removed ${d.fullName}.`); }
                              }
                            })}
                            className="p-2 rounded-lg border border-[var(--color-line)] hover:border-rose-400 text-rose-600"
                            aria-label={`Remove ${d.fullName}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 3: HOSPITAL ADMIN ACCOUNT CONTROLS */}
      {section === 'admin_accounts' && (
        <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-display font-semibold">Hospital Admin Accounts & Credential Governance</h2>
              <p className="text-xs text-[var(--color-muted)]">Create institutional admin accounts, assign RBAC roles, and initiate expiring password resets.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  type="text"
                  value={adminSearch}
                  onChange={e => setAdminSearch(e.target.value)}
                  placeholder="Search admin accounts..."
                  className="pl-8 pr-3 py-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-xs min-h-[40px]"
                />
              </div>
              {canManageSecurity && (
                <button
                  type="button"
                  onClick={() => setShowCreateAdminModal(true)}
                  className="btn-accent px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[44px]"
                >
                  <UserPlus size={15} /> Create Hospital Admin
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--color-line)] text-[var(--color-muted)] uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3">Admin & Staff ID</th>
                  <th className="py-3 px-3">Hospital & Department</th>
                  <th className="py-3 px-3">RBAC Role</th>
                  <th className="py-3 px-3">Status & MFA</th>
                  {canManageSecurity && <th className="py-3 px-3 text-right">Credential Controls</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {filteredAdmins.map(acc => (
                  <tr key={acc.id} className="hover:bg-[var(--color-surface-subtle)]/50">
                    <td className="py-3.5 px-3">
                      <p className="font-semibold text-[var(--color-ink)]">{acc.fullName}</p>
                      <p className="text-[11px] text-[var(--color-muted)]">{acc.email} • <span className="font-mono text-[var(--color-primary)]">{acc.staffId}</span></p>
                    </td>
                    <td className="py-3.5 px-3">
                      <p className="font-medium">{acc.hospitalName}</p>
                      <p className="text-[10px] text-[var(--color-muted)]">{acc.department}</p>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-mist)]/60 text-[var(--color-primary)] text-[10px] font-semibold uppercase">
                        {HOSPITAL_ROLES[acc.role]?.badge || acc.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${acc.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-50 text-rose-700'}`}>
                          {acc.status}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--color-muted)]">{acc.mfaEnabled ? 'MFA ON' : 'MFA OFF'}</span>
                      </div>
                    </td>
                    {canManageSecurity && (
                      <td className="py-3.5 px-3 text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setResetTarget(acc);
                              setResetResult(null);
                              setResetTempPassword('');
                            }}
                            className="px-3 py-1.5 rounded-lg border border-[var(--color-line)] hover:border-[var(--color-primary)] text-[var(--color-primary)] text-[11px] font-semibold inline-flex items-center gap-1"
                            title="Initiate password reset"
                          >
                            <Key size={12} /> Reset Password
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleAdminStatus(acc)}
                            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 ${
                              acc.status === 'active'
                                ? 'border-rose-300 text-rose-600 hover:bg-rose-50'
                                : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {acc.status === 'active' ? <Lock size={12} /> : <Unlock size={12} />}
                            {acc.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT HOSPITAL */}
      {hospitalModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
              <h3 className="text-lg font-display font-semibold">{hospitalModal.editing ? 'Edit Hospital Facility' : 'Register Hospital Facility'}</h3>
              <button onClick={() => setHospitalModal({ open: false, editing: null })} className="p-2" aria-label="Close"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveHospital} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Hospital Name" value={hospitalForm.name} onChange={e => setHospitalForm({ ...hospitalForm, name: e.target.value })} className="p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] sm:col-span-2" required />
                <input type="text" placeholder="City" value={hospitalForm.city} onChange={e => setHospitalForm({ ...hospitalForm, city: e.target.value })} className="p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <input type="text" placeholder="Facility Code (e.g. OLM-VZG)" value={hospitalForm.code} onChange={e => setHospitalForm({ ...hospitalForm, code: e.target.value })} className="p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] font-mono" required />
                <input type="number" min={1} placeholder="Total Beds" value={hospitalForm.totalBeds} onChange={e => setHospitalForm({ ...hospitalForm, totalBeds: Number(e.target.value) })} className="p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <input type="number" min={0} placeholder="ICU Beds" value={hospitalForm.icuBeds} onChange={e => setHospitalForm({ ...hospitalForm, icuBeds: Number(e.target.value) })} className="p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <input type="email" placeholder="Contact Email" value={hospitalForm.contactEmail} onChange={e => setHospitalForm({ ...hospitalForm, contactEmail: e.target.value })} className="p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <select value={hospitalForm.status} onChange={e => setHospitalForm({ ...hospitalForm, status: e.target.value as any })} className="p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]">
                  <option value="operational">Operational</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setHospitalModal({ open: false, editing: null })} className="btn-outline flex-1 py-3 rounded-xl min-h-[44px]">Cancel</button>
                <button type="submit" className="btn-primary flex-1 py-3 rounded-xl font-semibold min-h-[44px]">Save Hospital</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT DOCTOR */}
      {doctorModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
              <h3 className="text-lg font-display font-semibold">{doctorModal.editing ? 'Edit Doctor Profile' : 'Add New Doctor Profile'}</h3>
              <button onClick={() => setDoctorModal({ open: false, editing: null })} className="p-2" aria-label="Close"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveDoctor} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Full Name" value={doctorForm.fullName} onChange={e => setDoctorForm({ ...doctorForm, fullName: e.target.value })} className="p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <input type="email" placeholder="Email Address" value={doctorForm.email} onChange={e => setDoctorForm({ ...doctorForm, email: e.target.value })} className="p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <input type="text" placeholder="Phone Number" value={doctorForm.phone} onChange={e => setDoctorForm({ ...doctorForm, phone: e.target.value })} className="p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" />
                <input type="text" placeholder="Specialization" value={doctorForm.specialization} onChange={e => setDoctorForm({ ...doctorForm, specialization: e.target.value })} className="p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <input type="text" placeholder="Qualification" value={doctorForm.qualification} onChange={e => setDoctorForm({ ...doctorForm, qualification: e.target.value })} className="p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <input type="number" min={0} max={65} placeholder="Experience (Years)" value={doctorForm.experienceYears} onChange={e => setDoctorForm({ ...doctorForm, experienceYears: Number(e.target.value) })} className="p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <select value={doctorForm.hospitalName} onChange={e => setDoctorForm({ ...doctorForm, hospitalName: e.target.value })} className="p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.name}>{h.name}</option>
                  ))}
                </select>
                <select value={doctorForm.hierarchyRole} onChange={e => setDoctorForm({ ...doctorForm, hierarchyRole: e.target.value as any })} className="p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]">
                  <option value="senior_consultant">Senior Consultant</option>
                  <option value="junior_resident">Junior Resident</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setDoctorModal({ open: false, editing: null })} className="btn-outline flex-1 py-3 rounded-xl min-h-[44px]">Cancel</button>
                <button type="submit" className="btn-primary flex-1 py-3 rounded-xl font-semibold min-h-[44px]">Save Doctor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE HOSPITAL ADMIN ACCOUNT */}
      {showCreateAdminModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
              <h3 className="text-lg font-display font-semibold">Create Hospital Admin Account</h3>
              <button onClick={() => setShowCreateAdminModal(false)} className="p-2" aria-label="Close"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateAdminAccount} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Full Name" value={adminForm.fullName} onChange={e => setAdminForm({ ...adminForm, fullName: e.target.value })} className="p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <input type="email" placeholder="Institutional Email" value={adminForm.email} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })} className="p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <select value={adminForm.hospitalId} onChange={e => setAdminForm({ ...adminForm, hospitalId: e.target.value })} className="p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]">
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
                <select value={adminForm.role} onChange={e => setAdminForm({ ...adminForm, role: e.target.value as HospitalAdminRole })} className="p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]">
                  {Object.values(HOSPITAL_ROLES).map(r => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
                <input type="text" placeholder="Department" value={adminForm.department} onChange={e => setAdminForm({ ...adminForm, department: e.target.value })} className="p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] sm:col-span-2" required />
                <input type="password" placeholder="Assign Initial Password (Policy Enforced)" value={adminForm.password} onChange={e => setAdminForm({ ...adminForm, password: e.target.value })} className="p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] sm:col-span-2" required />
              </div>

              <div className="p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)] space-y-1">
                <p className="text-[10px] font-bold uppercase text-[var(--color-muted)]">Hospital Password Policy</p>
                <div className="grid grid-cols-2 gap-1">
                  {HOSPITAL_PASSWORD_RULES.map(rule => {
                    const ok = rule.validator(adminForm.password);
                    return (
                      <span key={rule.id} className={`text-[10px] ${ok ? 'text-emerald-600 font-semibold' : 'text-[var(--color-muted)]'}`}>
                        {ok ? '✔' : '○'} {rule.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateAdminModal(false)} className="btn-outline flex-1 py-3 rounded-xl min-h-[44px]">Cancel</button>
                <button type="submit" disabled={!adminPasswordCheck.valid} className="btn-primary flex-1 py-3 rounded-xl font-semibold disabled:opacity-50 min-h-[44px]">Create Admin Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INITIATE SECURE PASSWORD RESET */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
              <h3 className="text-lg font-display font-semibold">Secure Admin Password Reset</h3>
              <button onClick={() => { setResetTarget(null); setResetResult(null); }} className="p-2" aria-label="Close"><X size={18} /></button>
            </div>

            {resetResult ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-900 dark:text-emerald-200 space-y-1.5">
                  <p className="font-semibold">Single-Use Recovery Token Issued (15-Minute Expiry)</p>
                  <p className="font-mono break-all bg-white/70 dark:bg-black/30 p-2 rounded-lg">{resetResult.token}</p>
                  <p className="text-[11px]">Expires: {new Date(resetResult.expiresAt).toLocaleTimeString()}</p>
                </div>
                <button type="button" onClick={() => { setResetTarget(null); setResetResult(null); }} className="btn-primary w-full py-3 rounded-xl font-semibold min-h-[44px]">Done</button>
              </div>
            ) : (
              <form onSubmit={handleInitiatePasswordReset} className="space-y-4 text-xs">
                <p className="text-[var(--color-muted)]">
                  Issuing a secure password reset for <strong>{resetTarget.fullName}</strong> ({resetTarget.email}). This generates a 15-minute single-use recovery token and logs the action.
                </p>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">
                    Optional Temporary Password (Leave blank for token-only reset)
                  </label>
                  <input
                    type="password"
                    value={resetTempPassword}
                    onChange={e => setResetTempPassword(e.target.value)}
                    placeholder="Optional policy-compliant temporary password"
                    className="w-full p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]"
                  />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setResetTarget(null)} className="btn-outline flex-1 py-3 rounded-xl min-h-[44px]">Cancel</button>
                  <button type="submit" className="btn-accent flex-1 py-3 rounded-xl font-semibold min-h-[44px]">Confirm Reset</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION PROMPT MODAL */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-rose-300 dark:border-rose-900/60 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert size={28} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-display font-semibold text-[var(--color-ink)]">{confirmAction.title}</h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed">{confirmAction.description}</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmAction(null)} className="btn-outline flex-1 py-2.5 rounded-xl text-xs font-semibold min-h-[44px]">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  await confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold min-h-[44px]"
              >
                {confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
