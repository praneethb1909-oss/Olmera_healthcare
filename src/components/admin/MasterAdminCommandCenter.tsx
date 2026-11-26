import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck, Coins, Users, Stethoscope, Building2, Plus, Edit2, Trash2,
  Search, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Clock, Lock, RefreshCw, History, X
} from 'lucide-react';
import {
  masterAdminService,
  MasterAdminActor,
  CreditSummary,
  CreditTransaction,
  MasterPatientRecord,
  MasterDoctorRecord,
  MasterHospitalRecord
} from '../../services/admin/masterAdminService';
import { auditLogger, SecurityAuditEntry } from '../../services/auth/auditLogger';
import { sessionManager } from '../../services/auth/sessionManager';
import { useAuth } from '../../contexts/AuthContext';

type CommandTab = 'overview' | 'credits' | 'patients' | 'doctors' | 'hospitals' | 'audit';

export function MasterAdminCommandCenter() {
  const { user, hospitalAdminProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<CommandTab>('overview');

  const actor: MasterAdminActor = useMemo(() => {
    const activeSess = sessionManager.getActiveSession()?.user || hospitalAdminProfile;
    return {
      staffId: activeSess?.staffId || user?.uid || 'OLM-MASTER-01',
      email: activeSess?.email || user?.email || '',
      fullName: activeSess?.fullName || user?.displayName || 'Master Admin',
      role: activeSess?.role || 'super_admin',
    };
  }, [user, hospitalAdminProfile]);

  const isAuthorized = masterAdminService.isMasterAdmin(actor);

  // Data States
  const [creditSummary, setCreditSummary] = useState<CreditSummary>(() => masterAdminService.getCreditSummary());
  const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>(() => masterAdminService.getCreditHistory());
  const [patients, setPatients] = useState<MasterPatientRecord[]>(() => masterAdminService.getPatients());
  const [doctors, setDoctors] = useState<MasterDoctorRecord[]>(() => masterAdminService.getDoctors());
  const [hospitals, setHospitals] = useState<MasterHospitalRecord[]>(() => masterAdminService.getHospitals());
  const [auditEntries, setAuditEntries] = useState<SecurityAuditEntry[]>([]);

  // Feedback Banner
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & Filter States
  const [creditSearch, setCreditSearch] = useState('');
  const [creditTypeFilter, setCreditTypeFilter] = useState<'all' | 'allocation' | 'usage'>('all');

  const [patientSearch, setPatientSearch] = useState('');
  const [patientStatusFilter, setPatientStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorRoleFilter, setDoctorRoleFilter] = useState<'all' | 'senior_consultant' | 'junior_resident'>('all');

  const [hospitalSearch, setHospitalSearch] = useState('');
  const [hospitalStatusFilter, setHospitalStatusFilter] = useState<'all' | 'operational' | 'maintenance'>('all');

  // Credits Form States
  const [creditMode, setCreditMode] = useState<'allocation' | 'usage'>('allocation');
  const [creditAmount, setCreditAmount] = useState('5000');
  const [creditRecipient, setCreditRecipient] = useState('');
  const [creditPurpose, setCreditPurpose] = useState('');

  // CRUD Modal States
  const [patientModal, setPatientModal] = useState<{ open: boolean; editing: MasterPatientRecord | null }>({ open: false, editing: null });
  const [patientForm, setPatientForm] = useState({
    fullName: '', email: '', phone: '', age: 30, gender: 'Male' as MasterPatientRecord['gender'], bloodGroup: 'O+', city: 'Visakhapatnam', status: 'active' as MasterPatientRecord['status']
  });

  const [doctorModal, setDoctorModal] = useState<{ open: boolean; editing: MasterDoctorRecord | null }>({ open: false, editing: null });
  const [doctorForm, setDoctorForm] = useState({
    fullName: '', email: '', phone: '', specialization: 'Cardiology', qualification: 'MBBS, MD', experienceYears: 5, hospitalName: 'Olmera Institute of Medical Sciences', hierarchyRole: 'senior_consultant' as MasterDoctorRecord['hierarchyRole'], status: 'active' as MasterDoctorRecord['status']
  });

  const [hospitalModal, setHospitalModal] = useState<{ open: boolean; editing: MasterHospitalRecord | null }>({ open: false, editing: null });
  const [hospitalForm, setHospitalForm] = useState({
    name: '', city: 'Visakhapatnam', code: '', totalBeds: 120, icuBeds: 20, contactEmail: '', status: 'operational' as MasterHospitalRecord['status']
  });

  // Delete Confirmation Prompt
  const [deleteTarget, setDeleteTarget] = useState<{
    entityType: 'patient' | 'doctor' | 'hospital';
    id: string;
    label: string;
  } | null>(null);

  const refreshAll = async () => {
    setCreditSummary(masterAdminService.getCreditSummary());
    setCreditHistory(masterAdminService.getCreditHistory());
    setPatients(masterAdminService.getPatients());
    setDoctors(masterAdminService.getDoctors());
    setHospitals(masterAdminService.getHospitals());
    const logs = await auditLogger.getRecentLogs(40);
    setAuditEntries(logs);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const notify = (type: 'success' | 'error', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 5000);
  };

  // Strict RBAC Screen Guard
  if (!isAuthorized) {
    return (
      <div className="card p-10 bg-[var(--color-surface)] border border-rose-300 dark:border-rose-900/60 rounded-3xl text-center space-y-4 max-w-xl mx-auto my-12">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto">
          <Lock size={28} />
        </div>
        <h2 className="text-2xl font-display font-semibold text-[var(--color-ink)]">
          Master Admin Access Restricted
        </h2>
        <p className="text-xs sm:text-sm text-[var(--color-muted)]">
          This command center is restricted exclusively to authenticated Master Admin accounts. Unauthorized access attempts are logged.
        </p>
      </div>
    );
  }

  // Filtered Lists
  const filteredCredits = creditHistory.filter(tx => {
    const matchesType = creditTypeFilter === 'all' || tx.type === creditTypeFilter;
    const q = creditSearch.trim().toLowerCase();
    const matchesQuery = !q || tx.recipientOrTarget.toLowerCase().includes(q) || tx.purpose.toLowerCase().includes(q) || tx.performedBy.toLowerCase().includes(q);
    return matchesType && matchesQuery;
  });

  const filteredPatients = patients.filter(p => {
    const matchesStatus = patientStatusFilter === 'all' || p.status === patientStatusFilter;
    const q = patientSearch.trim().toLowerCase();
    const matchesQuery = !q || p.fullName.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.city.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const filteredDoctors = doctors.filter(d => {
    const matchesRole = doctorRoleFilter === 'all' || d.hierarchyRole === doctorRoleFilter;
    const q = doctorSearch.trim().toLowerCase();
    const matchesQuery = !q || d.fullName.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q) || d.hospitalName.toLowerCase().includes(q) || d.email.toLowerCase().includes(q);
    return matchesRole && matchesQuery;
  });

  const filteredHospitals = hospitals.filter(h => {
    const matchesStatus = hospitalStatusFilter === 'all' || h.status === hospitalStatusFilter;
    const q = hospitalSearch.trim().toLowerCase();
    const matchesQuery = !q || h.name.toLowerCase().includes(q) || h.city.toLowerCase().includes(q) || h.code.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  // Handlers
  const handleCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res =
      creditMode === 'allocation'
        ? await masterAdminService.allocateCredits(actor, {
            amount: Number(creditAmount),
            recipientOrTarget: creditRecipient,
            purpose: creditPurpose,
          })
        : await masterAdminService.recordCreditUsage(actor, {
            amount: Number(creditAmount),
            recipientOrTarget: creditRecipient,
            purpose: creditPurpose,
          });

    if (!res.success) {
      notify('error', res.error || 'Credit operation failed.');
      return;
    }

    setCreditRecipient('');
    setCreditPurpose('');
    await refreshAll();
    notify(
      'success',
      creditMode === 'allocation'
        ? `Allocated ${Number(creditAmount).toLocaleString()} credits successfully.`
        : `Recorded ${Number(creditAmount).toLocaleString()} credits usage.`
    );
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = patientModal.editing
      ? await masterAdminService.updatePatient(actor, patientModal.editing.id, patientForm)
      : await masterAdminService.addPatient(actor, patientForm);

    if (!res.success) {
      notify('error', res.error || 'Failed to save patient record.');
      return;
    }
    setPatientModal({ open: false, editing: null });
    await refreshAll();
    notify('success', patientModal.editing ? 'Patient record updated.' : 'New patient registered.');
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = doctorModal.editing
      ? await masterAdminService.updateDoctor(actor, doctorModal.editing.id, doctorForm)
      : await masterAdminService.addDoctor(actor, doctorForm);

    if (!res.success) {
      notify('error', res.error || 'Failed to save doctor record.');
      return;
    }
    setDoctorModal({ open: false, editing: null });
    await refreshAll();
    notify('success', doctorModal.editing ? 'Doctor profile updated.' : 'New doctor registered.');
  };

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
    await refreshAll();
    notify('success', hospitalModal.editing ? 'Hospital facility updated.' : 'New hospital registered.');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    let res: { success: boolean; error?: string } = { success: false };

    if (deleteTarget.entityType === 'patient') {
      res = await masterAdminService.deletePatient(actor, deleteTarget.id);
    } else if (deleteTarget.entityType === 'doctor') {
      res = await masterAdminService.deleteDoctor(actor, deleteTarget.id);
    } else {
      res = await masterAdminService.deleteHospital(actor, deleteTarget.id);
    }

    if (!res.success) {
      notify('error', res.error || 'Delete operation failed.');
      return;
    }

    const label = deleteTarget.label;
    setDeleteTarget(null);
    await refreshAll();
    notify('success', `Deleted "${label}" and recorded audit entry.`);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-ui text-[var(--color-ink)] pb-12">
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
      <div className="card p-6 sm:p-8 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-mist)]/60 border border-[var(--color-line)] text-xs font-semibold text-[var(--color-primary)]">
              <ShieldCheck size={14} /> Master Admin Command Center • RBAC Verified
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--color-ink)]">
              Centralized Network Governance & Credits
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-muted)]">
              Authenticated as <strong>{actor.fullName}</strong> ({actor.email}) • Full CRUD, Credits Management & Tamper-Evident Audit
            </p>
          </div>

          <button
            type="button"
            onClick={refreshAll}
            className="btn-outline px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 self-start lg:self-auto min-h-[44px]"
          >
            <RefreshCw size={14} /> Refresh Live Data
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-[var(--color-line)]">
          {[
            { id: 'overview', label: 'Monitoring Overview', icon: ShieldCheck },
            { id: 'credits', label: `Credits (${creditSummary.availableCredits.toLocaleString()})`, icon: Coins },
            { id: 'patients', label: `Patients (${patients.length})`, icon: Users },
            { id: 'doctors', label: `Doctors (${doctors.length})`, icon: Stethoscope },
            { id: 'hospitals', label: `Hospitals (${hospitals.length})`, icon: Building2 },
            { id: 'audit', label: `Audit Log (${auditEntries.length})`, icon: History },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as CommandTab)}
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

      {/* TAB 1: MONITORING OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div onClick={() => setActiveTab('credits')} className="card p-5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl cursor-pointer hover:border-[var(--color-primary)] transition-all">
              <div className="flex items-center justify-between text-[var(--color-primary)] mb-2">
                <Coins size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Available Balance</span>
              </div>
              <p className="text-2xl font-display font-semibold text-[var(--color-ink)]">{creditSummary.availableCredits.toLocaleString()}</p>
              <p className="text-xs text-[var(--color-muted)] mt-1">Network AI & Telemetry Credits</p>
            </div>

            <div onClick={() => setActiveTab('patients')} className="card p-5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl cursor-pointer hover:border-[var(--color-primary)] transition-all">
              <div className="flex items-center justify-between text-[var(--color-primary)] mb-2">
                <Users size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Patients</span>
              </div>
              <p className="text-2xl font-display font-semibold text-[var(--color-ink)]">{patients.length}</p>
              <p className="text-xs text-[var(--color-muted)] mt-1">{patients.filter(p => p.status === 'active').length} active profiles</p>
            </div>

            <div onClick={() => setActiveTab('doctors')} className="card p-5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl cursor-pointer hover:border-[var(--color-primary)] transition-all">
              <div className="flex items-center justify-between text-[var(--color-primary)] mb-2">
                <Stethoscope size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Doctors</span>
              </div>
              <p className="text-2xl font-display font-semibold text-[var(--color-ink)]">{doctors.length}</p>
              <p className="text-xs text-[var(--color-muted)] mt-1">{doctors.filter(d => d.status === 'active').length} active practitioners</p>
            </div>

            <div onClick={() => setActiveTab('hospitals')} className="card p-5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl cursor-pointer hover:border-[var(--color-primary)] transition-all">
              <div className="flex items-center justify-between text-[var(--color-primary)] mb-2">
                <Building2 size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Hospitals</span>
              </div>
              <p className="text-2xl font-display font-semibold text-[var(--color-ink)]">{hospitals.length}</p>
              <p className="text-xs text-[var(--color-muted)] mt-1">{hospitals.reduce((acc, h) => acc + h.totalBeds, 0)} total network beds</p>
            </div>
          </div>

          {/* Real-time snapshot cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
                <h2 className="text-lg font-display font-semibold">Recent Credit Activity</h2>
                <button onClick={() => setActiveTab('credits')} className="text-xs font-semibold text-[var(--color-primary)] hover:underline">Manage Credits →</button>
              </div>
              <div className="space-y-2.5">
                {creditHistory.slice(0, 4).map(tx => (
                  <div key={tx.id} className="p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)] flex items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-[var(--color-ink)]">{tx.recipientOrTarget}</p>
                      <p className="text-[11px] text-[var(--color-muted)]">{tx.purpose}</p>
                    </div>
                    <span className={`font-mono font-bold shrink-0 ${tx.type === 'allocation' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.type === 'allocation' ? '+' : '-'}{tx.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
                <h2 className="text-lg font-display font-semibold">Latest Security Audit Events</h2>
                <button onClick={() => setActiveTab('audit')} className="text-xs font-semibold text-[var(--color-primary)] hover:underline">Full Audit Log →</button>
              </div>
              <div className="space-y-2.5">
                {auditEntries.slice(0, 4).map(log => (
                  <div key={log.id} className="p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)] flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--color-ink)] truncate">{log.details}</p>
                      <p className="text-[10px] font-mono text-[var(--color-muted)]">{log.eventType} • {log.email}</p>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--color-muted)] shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CREDITS MANAGEMENT */}
      {activeTab === 'credits' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Available Credit Balance</p>
              <p className="text-3xl font-display font-semibold text-[var(--color-primary)] mt-1">{creditSummary.availableCredits.toLocaleString()}</p>
              <p className="text-[11px] text-[var(--color-muted)] mt-1">Updated {new Date(creditSummary.lastUpdatedAt).toLocaleString()}</p>
            </div>
            <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Total Allocated</p>
              <p className="text-3xl font-display font-semibold text-emerald-700 dark:text-emerald-400 mt-1">+{creditSummary.totalAllocatedCredits.toLocaleString()}</p>
              <p className="text-[11px] text-[var(--color-muted)] mt-1">Cumulative master allocations</p>
            </div>
            <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Total Consumed</p>
              <p className="text-3xl font-display font-semibold text-[var(--color-ink)] mt-1">{creditSummary.totalUsedCredits.toLocaleString()}</p>
              <p className="text-[11px] text-[var(--color-muted)] mt-1">Across OCR, AI triage & hospital hubs</p>
            </div>
          </div>

          {/* Credit Allocation / Usage Form */}
          <form onSubmit={handleCreditSubmit} className="card p-6 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] pb-3">
              <h2 className="text-lg font-display font-semibold">Allocate or Track Credits</h2>
              <div className="inline-flex p-1 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCreditMode('allocation')}
                  className={`px-3 py-1.5 rounded-lg ${creditMode === 'allocation' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-muted)]'}`}
                >
                  Allocate Credits
                </button>
                <button
                  type="button"
                  onClick={() => setCreditMode('usage')}
                  className={`px-3 py-1.5 rounded-lg ${creditMode === 'usage' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-muted)]'}`}
                >
                  Record Usage
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Credit Amount</label>
                <input
                  type="number"
                  min={1}
                  max={10000000}
                  value={creditAmount}
                  onChange={e => setCreditAmount(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] font-mono text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">
                  {creditMode === 'allocation' ? 'Recipient Hospital / Unit' : 'Consuming Module / Hub'}
                </label>
                <input
                  type="text"
                  value={creditRecipient}
                  onChange={e => setCreditRecipient(e.target.value)}
                  placeholder="e.g. Olmera Care Hospital Srikakulam"
                  className="w-full p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">Purpose / Reference</label>
                <input
                  type="text"
                  value={creditPurpose}
                  onChange={e => setCreditPurpose(e.target.value)}
                  placeholder="e.g. Monthly Diagnostic OCR Allocation"
                  className="w-full p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-sm"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-accent px-6 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 min-h-[44px]">
              {creditMode === 'allocation' ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
              <span>{creditMode === 'allocation' ? 'Allocate Credits to Balance' : 'Record Credit Consumption'}</span>
            </button>
          </form>

          {/* Credit Usage History */}
          <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-display font-semibold">Credit Usage & Allocation History</h2>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
                  <input
                    type="text"
                    value={creditSearch}
                    onChange={e => setCreditSearch(e.target.value)}
                    placeholder="Search history..."
                    className="pl-8 pr-3 py-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-xs"
                  />
                </div>
                <select
                  value={creditTypeFilter}
                  onChange={e => setCreditTypeFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-xs"
                >
                  <option value="all">All Types</option>
                  <option value="allocation">Allocations</option>
                  <option value="usage">Usage</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--color-line)] text-[var(--color-muted)] uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Recipient / Target</th>
                    <th className="py-3 px-3">Purpose</th>
                    <th className="py-3 px-3 text-right">Amount</th>
                    <th className="py-3 px-3 text-right">Balance After</th>
                    <th className="py-3 px-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-line)]">
                  {filteredCredits.map(tx => (
                    <tr key={tx.id} className="hover:bg-[var(--color-surface-subtle)]/50">
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${tx.type === 'allocation' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold">{tx.recipientOrTarget}</td>
                      <td className="py-3 px-3 text-[var(--color-muted)]">{tx.purpose}</td>
                      <td className={`py-3 px-3 text-right font-mono font-bold ${tx.type === 'allocation' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'allocation' ? '+' : '-'}{tx.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">{tx.balanceAfter.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono text-[11px] text-[var(--color-muted)] whitespace-nowrap">
                        {new Date(tx.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PATIENTS CRUD */}
      {activeTab === 'patients' && (
        <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-display font-semibold">Centralized Patient Registry</h2>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  placeholder="Search patients..."
                  className="pl-8 pr-3 py-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-xs"
                />
              </div>
              <select
                value={patientStatusFilter}
                onChange={e => setPatientStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-xs"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setPatientForm({ fullName: '', email: '', phone: '', age: 30, gender: 'Male', bloodGroup: 'O+', city: 'Visakhapatnam', status: 'active' });
                  setPatientModal({ open: true, editing: null });
                }}
                className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px]"
              >
                <Plus size={14} /> Add Patient
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--color-line)] text-[var(--color-muted)] uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3">Patient</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Demographics</th>
                  <th className="py-3 px-3">City</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {filteredPatients.map(pt => (
                  <tr key={pt.id} className="hover:bg-[var(--color-surface-subtle)]/50">
                    <td className="py-3 px-3">
                      <p className="font-semibold text-[var(--color-ink)]">{pt.fullName}</p>
                      <p className="text-[10px] font-mono text-[var(--color-muted)]">{pt.id}</p>
                    </td>
                    <td className="py-3 px-3">
                      <p>{pt.email}</p>
                      <p className="text-[11px] font-mono text-[var(--color-muted)]">{pt.phone}</p>
                    </td>
                    <td className="py-3 px-3">{pt.age} yrs • {pt.gender} • {pt.bloodGroup}</td>
                    <td className="py-3 px-3">{pt.city}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${pt.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600'}`}>
                        {pt.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPatientForm({
                              fullName: pt.fullName, email: pt.email, phone: pt.phone, age: pt.age,
                              gender: pt.gender, bloodGroup: pt.bloodGroup, city: pt.city, status: pt.status
                            });
                            setPatientModal({ open: true, editing: pt });
                          }}
                          className="p-2 rounded-lg border border-[var(--color-line)] hover:border-[var(--color-primary)] text-[var(--color-primary)]"
                          title="Edit patient"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ entityType: 'patient', id: pt.id, label: pt.fullName })}
                          className="p-2 rounded-lg border border-[var(--color-line)] hover:border-rose-400 text-rose-600"
                          title="Delete patient"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DOCTORS CRUD */}
      {activeTab === 'doctors' && (
        <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-display font-semibold">Centralized Doctor Directory</h2>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  type="text"
                  value={doctorSearch}
                  onChange={e => setDoctorSearch(e.target.value)}
                  placeholder="Search doctors..."
                  className="pl-8 pr-3 py-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-xs"
                />
              </div>
              <select
                value={doctorRoleFilter}
                onChange={e => setDoctorRoleFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-xs"
              >
                <option value="all">All Roles</option>
                <option value="senior_consultant">Senior Consultant</option>
                <option value="junior_resident">Junior Resident</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setDoctorForm({
                    fullName: '', email: '', phone: '', specialization: 'Cardiology', qualification: 'MBBS, MD',
                    experienceYears: 5, hospitalName: 'Olmera Institute of Medical Sciences', hierarchyRole: 'senior_consultant', status: 'active'
                  });
                  setDoctorModal({ open: true, editing: null });
                }}
                className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px]"
              >
                <Plus size={14} /> Add Doctor
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--color-line)] text-[var(--color-muted)] uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3">Doctor</th>
                  <th className="py-3 px-3">Specialization</th>
                  <th className="py-3 px-3">Hospital</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {filteredDoctors.map(doc => (
                  <tr key={doc.id} className="hover:bg-[var(--color-surface-subtle)]/50">
                    <td className="py-3 px-3">
                      <p className="font-semibold text-[var(--color-ink)]">{doc.fullName}</p>
                      <p className="text-[11px] text-[var(--color-muted)]">{doc.email}</p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-medium">{doc.specialization}</p>
                      <p className="text-[10px] text-[var(--color-muted)]">{doc.qualification} • {doc.experienceYears} yrs</p>
                    </td>
                    <td className="py-3 px-3">{doc.hospitalName}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-[var(--color-mist)]/60 text-[var(--color-primary)] text-[10px] font-semibold uppercase">
                        {doc.hierarchyRole === 'senior_consultant' ? 'Senior' : 'Junior'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${doc.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-50 text-rose-700'}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setDoctorForm({
                              fullName: doc.fullName, email: doc.email, phone: doc.phone, specialization: doc.specialization,
                              qualification: doc.qualification, experienceYears: doc.experienceYears, hospitalName: doc.hospitalName,
                              hierarchyRole: doc.hierarchyRole, status: doc.status
                            });
                            setDoctorModal({ open: true, editing: doc });
                          }}
                          className="p-2 rounded-lg border border-[var(--color-line)] hover:border-[var(--color-primary)] text-[var(--color-primary)]"
                          title="Edit doctor"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ entityType: 'doctor', id: doc.id, label: doc.fullName })}
                          className="p-2 rounded-lg border border-[var(--color-line)] hover:border-rose-400 text-rose-600"
                          title="Delete doctor"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: HOSPITALS CRUD */}
      {activeTab === 'hospitals' && (
        <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-display font-semibold">Registered Hospitals Network</h2>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  type="text"
                  value={hospitalSearch}
                  onChange={e => setHospitalSearch(e.target.value)}
                  placeholder="Search hospitals..."
                  className="pl-8 pr-3 py-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-xs"
                />
              </div>
              <select
                value={hospitalStatusFilter}
                onChange={e => setHospitalStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-xs"
              >
                <option value="all">All Status</option>
                <option value="operational">Operational</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setHospitalForm({ name: '', city: 'Visakhapatnam', code: '', totalBeds: 120, icuBeds: 20, contactEmail: '', status: 'operational' });
                  setHospitalModal({ open: true, editing: null });
                }}
                className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px]"
              >
                <Plus size={14} /> Add Hospital
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--color-line)] text-[var(--color-muted)] uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3">Hospital Name</th>
                  <th className="py-3 px-3">Code & City</th>
                  <th className="py-3 px-3">Beds (Total / ICU)</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {filteredHospitals.map(h => (
                  <tr key={h.id} className="hover:bg-[var(--color-surface-subtle)]/50">
                    <td className="py-3 px-3 font-semibold text-[var(--color-ink)]">{h.name}</td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-[var(--color-primary)]">{h.code}</span> • {h.city}
                    </td>
                    <td className="py-3 px-3 font-mono">{h.totalBeds} / {h.icuBeds} ICU</td>
                    <td className="py-3 px-3">{h.contactEmail}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${h.status === 'operational' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-50 text-amber-800'}`}>
                        {h.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setHospitalForm({
                              name: h.name, city: h.city, code: h.code, totalBeds: h.totalBeds,
                              icuBeds: h.icuBeds, contactEmail: h.contactEmail, status: h.status
                            });
                            setHospitalModal({ open: true, editing: h });
                          }}
                          className="p-2 rounded-lg border border-[var(--color-line)] hover:border-[var(--color-primary)] text-[var(--color-primary)]"
                          title="Edit hospital"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ entityType: 'hospital', id: h.id, label: h.name })}
                          className="p-2 rounded-lg border border-[var(--color-line)] hover:border-rose-400 text-rose-600"
                          title="Delete hospital"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl space-y-4">
          <h2 className="text-lg font-display font-semibold border-b border-[var(--color-line)] pb-3">
            Tamper-Evident Security & CRUD Audit Trail
          </h2>
          <div className="space-y-2.5">
            {auditEntries.map(log => (
              <div key={log.id} className="p-3.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-line)] font-mono text-[10px] font-bold text-[var(--color-primary)]">
                      {log.eventType}
                    </span>
                    <span className="font-semibold text-[var(--color-ink)]">{log.email}</span>
                    <span className="text-[10px] font-mono text-[var(--color-muted)]">SHA256:{log.checksum}</span>
                  </div>
                  <p className="text-[var(--color-muted)]">{log.details}</p>
                </div>
                <span className="text-[11px] font-mono text-[var(--color-muted)] shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PATIENT */}
      {patientModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
              <h3 className="text-lg font-display font-semibold">{patientModal.editing ? 'Edit Patient Record' : 'Register New Patient'}</h3>
              <button onClick={() => setPatientModal({ open: false, editing: null })} className="p-2"><X size={18} /></button>
            </div>
            <form onSubmit={handleSavePatient} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Full Name" value={patientForm.fullName} onChange={e => setPatientForm({ ...patientForm, fullName: e.target.value })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <input type="email" placeholder="Email Address" value={patientForm.email} onChange={e => setPatientForm({ ...patientForm, email: e.target.value })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <input type="text" placeholder="Phone Number" value={patientForm.phone} onChange={e => setPatientForm({ ...patientForm, phone: e.target.value })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <input type="number" min={0} max={125} placeholder="Age" value={patientForm.age} onChange={e => setPatientForm({ ...patientForm, age: Number(e.target.value) })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <select value={patientForm.gender} onChange={e => setPatientForm({ ...patientForm, gender: e.target.value as any })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <input type="text" placeholder="Blood Group (e.g. O+)" value={patientForm.bloodGroup} onChange={e => setPatientForm({ ...patientForm, bloodGroup: e.target.value })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" />
                <input type="text" placeholder="City" value={patientForm.city} onChange={e => setPatientForm({ ...patientForm, city: e.target.value })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <select value={patientForm.status} onChange={e => setPatientForm({ ...patientForm, status: e.target.value as any })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setPatientModal({ open: false, editing: null })} className="btn-outline flex-1 py-2.5 rounded-xl min-h-[44px]">Cancel</button>
                <button type="submit" className="btn-primary flex-1 py-2.5 rounded-xl font-semibold min-h-[44px]">Save Patient</button>
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
              <h3 className="text-lg font-display font-semibold">{doctorModal.editing ? 'Edit Doctor Profile' : 'Register New Doctor'}</h3>
              <button onClick={() => setDoctorModal({ open: false, editing: null })} className="p-2"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveDoctor} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Full Name" value={doctorForm.fullName} onChange={e => setDoctorForm({ ...doctorForm, fullName: e.target.value })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <input type="email" placeholder="Email Address" value={doctorForm.email} onChange={e => setDoctorForm({ ...doctorForm, email: e.target.value })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <input type="text" placeholder="Phone Number" value={doctorForm.phone} onChange={e => setDoctorForm({ ...doctorForm, phone: e.target.value })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" />
                <input type="text" placeholder="Specialization" value={doctorForm.specialization} onChange={e => setDoctorForm({ ...doctorForm, specialization: e.target.value })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <input type="text" placeholder="Qualification" value={doctorForm.qualification} onChange={e => setDoctorForm({ ...doctorForm, qualification: e.target.value })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <input type="number" min={0} max={65} placeholder="Experience (Years)" value={doctorForm.experienceYears} onChange={e => setDoctorForm({ ...doctorForm, experienceYears: Number(e.target.value) })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <input type="text" placeholder="Hospital Affiliation" value={doctorForm.hospitalName} onChange={e => setDoctorForm({ ...doctorForm, hospitalName: e.target.value })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <select value={doctorForm.hierarchyRole} onChange={e => setDoctorForm({ ...doctorForm, hierarchyRole: e.target.value as any })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]">
                  <option value="senior_consultant">Senior Consultant</option>
                  <option value="junior_resident">Junior Resident</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setDoctorModal({ open: false, editing: null })} className="btn-outline flex-1 py-2.5 rounded-xl min-h-[44px]">Cancel</button>
                <button type="submit" className="btn-primary flex-1 py-2.5 rounded-xl font-semibold min-h-[44px]">Save Doctor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT HOSPITAL */}
      {hospitalModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
              <h3 className="text-lg font-display font-semibold">{hospitalModal.editing ? 'Edit Hospital Facility' : 'Register New Hospital'}</h3>
              <button onClick={() => setHospitalModal({ open: false, editing: null })} className="p-2"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveHospital} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Hospital Name" value={hospitalForm.name} onChange={e => setHospitalForm({ ...hospitalForm, name: e.target.value })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] sm:col-span-2" required />
                <input type="text" placeholder="City" value={hospitalForm.city} onChange={e => setHospitalForm({ ...hospitalForm, city: e.target.value })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <input type="text" placeholder="Facility Code (e.g. OLM-VZG)" value={hospitalForm.code} onChange={e => setHospitalForm({ ...hospitalForm, code: e.target.value })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] font-mono" required />
                <input type="number" min={1} placeholder="Total Beds" value={hospitalForm.totalBeds} onChange={e => setHospitalForm({ ...hospitalForm, totalBeds: Number(e.target.value) })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <input type="number" min={0} placeholder="ICU Beds" value={hospitalForm.icuBeds} onChange={e => setHospitalForm({ ...hospitalForm, icuBeds: Number(e.target.value) })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <input type="email" placeholder="Contact Email" value={hospitalForm.contactEmail} onChange={e => setHospitalForm({ ...hospitalForm, contactEmail: e.target.value })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]" required />
                <select value={hospitalForm.status} onChange={e => setHospitalForm({ ...hospitalForm, status: e.target.value as any })} className="p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)]">
                  <option value="operational">Operational</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setHospitalModal({ open: false, editing: null })} className="btn-outline flex-1 py-2.5 rounded-xl min-h-[44px]">Cancel</button>
                <button type="submit" className="btn-primary flex-1 py-2.5 rounded-xl font-semibold min-h-[44px]">Save Hospital</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION PROMPT FOR ALL DELETE OPERATIONS */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-rose-300 dark:border-rose-900/60 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={28} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-display font-semibold text-[var(--color-ink)]">
                Confirm Permanent Deletion
              </h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                Are you sure you want to delete the {deleteTarget.entityType} record for{' '}
                <strong className="text-[var(--color-ink)]">{deleteTarget.label}</strong>? This action will be recorded in the security audit log.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="btn-outline flex-1 py-2.5 rounded-xl text-xs font-semibold min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold min-h-[44px]"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
