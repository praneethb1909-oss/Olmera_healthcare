/**
 * Olmera Healthcare - Senior & Junior Doctor Management, RBAC & Supervision Service
 *
 * Enforces:
 * - Senior Doctor creation, editing, activation/deactivation of Junior Doctor accounts
 * - Mandatory mapping of every Junior Doctor to a responsible Senior Doctor
 * - Individual login verification for Senior and Junior Doctors
 * - Mandatory Senior Doctor approval gate before any Junior Doctor prescription,
 *   diagnosis, treatment recommendation, or medical note becomes an official decision
 * - Complete immutable audit history with timestamps
 */

export type DoctorHierarchyRole = 'senior_consultant' | 'junior_resident';

export type SubmissionType =
  | 'prescription'
  | 'treatment_recommendation'
  | 'diagnosis'
  | 'medical_note'
  | 'follow_up';

export type SubmissionStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'modification_requested';

export interface DoctorAccount {
  id: string;
  fullName: string;
  email: string;
  accessCode: string; // Individual login credential
  hierarchyRole: DoctorHierarchyRole;
  qualification: string;
  specialization: string;
  experienceYears: number;
  licenseNumber: string;
  hospitalId: string;
  hospitalName: string;
  phone: string;
  bio: string;
  status: 'active' | 'deactivated';
  assignedSeniorDoctorId?: string;
  assignedSeniorDoctorName?: string;
  assignedPatientIds: string[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface SubmissionHistoryEntry {
  id: string;
  action: 'submitted' | 'approved' | 'rejected' | 'modification_requested' | 'resubmitted';
  actorId: string;
  actorName: string;
  actorRole: DoctorHierarchyRole;
  notes: string;
  timestamp: string;
}

export interface ClinicalSubmission {
  id: string;
  submissionType: SubmissionType;
  patientId: string;
  patientName: string;
  title: string;
  clinicalDetails: string;
  medicationList?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  juniorDoctorId: string;
  juniorDoctorName: string;
  seniorDoctorId: string;
  seniorDoctorName: string;
  status: SubmissionStatus;
  isOfficialDecision: boolean;
  visibleToPatient: boolean;
  seniorReviewNotes?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  history: SubmissionHistoryEntry[];
}

export interface DoctorActivityEntry {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorRole: DoctorHierarchyRole;
  seniorDoctorId?: string;
  actionType:
    | 'account_created'
    | 'account_updated'
    | 'account_status_changed'
    | 'patient_communication'
    | 'follow_up_updated'
    | 'clinical_submission'
    | 'senior_review'
    | 'doctor_login';
  patientId?: string;
  patientName?: string;
  summary: string;
  timestamp: string;
}

export type DoctorRBACAction =
  | 'create_junior_doctor'
  | 'edit_junior_doctor'
  | 'deactivate_junior_doctor'
  | 'approve_submission'
  | 'reject_submission'
  | 'request_modification'
  | 'assign_patient'
  | 'submit_clinical_recommendation'
  | 'view_assigned_patients'
  | 'communicate_with_assigned_patient'
  | 'manage_follow_ups'
  | 'publish_official_decision_directly';

const DOCTORS_STORAGE_KEY = 'olmera_doctor_accounts_v1';
const SUBMISSIONS_STORAGE_KEY = 'olmera_clinical_submissions_v1';
const ACTIVITY_STORAGE_KEY = 'olmera_doctor_activity_log_v1';
const ACTIVE_DOCTOR_SESSION_KEY = 'olmera_active_doctor_profile';

const DEFAULT_DOCTORS: DoctorAccount[] = [
  {
    id: 'doc-sr-01',
    fullName: 'Dr. A Suresh',
    email: 'suresh.a@olmera.health',
    accessCode: 'senior123',
    hierarchyRole: 'senior_consultant',
    qualification: 'MBBS, MD (General Medicine), DM (Cardiology)',
    specialization: 'Interventional Cardiology',
    experienceYears: 18,
    licenseNumber: 'APMC-2008-14920',
    hospitalId: 'hosp-2',
    hospitalName: 'Olmera Institute of Medical Sciences (OIMS)',
    phone: '+91 891 274 8810',
    bio: 'Senior Consultant Cardiologist leading clinical supervision, complex cardiac triage, and resident mentorship across the Olmera network.',
    status: 'active',
    assignedPatientIds: ['demo-patient-uid', 'pt-101', 'pt-102', 'pt-103'],
    createdAt: '2025-01-10T08:00:00.000Z',
    updatedAt: '2026-11-20T09:30:00.000Z',
  },
  {
    id: 'doc-jr-01',
    fullName: 'Dr. Rahul Varma',
    email: 'rahul.varma@olmera.health',
    accessCode: 'junior123',
    hierarchyRole: 'junior_resident',
    qualification: 'MBBS, MD Resident (Internal Medicine)',
    specialization: 'Internal Medicine & Primary Triage',
    experienceYears: 3,
    licenseNumber: 'APMC-2023-51042',
    hospitalId: 'hosp-2',
    hospitalName: 'Olmera Institute of Medical Sciences (OIMS)',
    phone: '+91 98480 41209',
    bio: 'Junior Resident physician managing outpatient follow-ups, patient monitoring, and supervised diagnostic triage under Dr. A Suresh.',
    status: 'active',
    assignedSeniorDoctorId: 'doc-sr-01',
    assignedSeniorDoctorName: 'Dr. A Suresh',
    assignedPatientIds: ['demo-patient-uid', 'pt-101'],
    createdAt: '2026-02-14T10:00:00.000Z',
    updatedAt: '2026-11-21T14:20:00.000Z',
  },
  {
    id: 'doc-jr-02',
    fullName: 'Dr. Sneha Reddy',
    email: 'sneha.reddy@olmera.health',
    accessCode: 'junior123',
    hierarchyRole: 'junior_resident',
    qualification: 'MBBS, DNB Resident (Cardiology)',
    specialization: 'Preventive Cardiology & Follow-up Care',
    experienceYears: 2,
    licenseNumber: 'APMC-2024-62918',
    hospitalId: 'hosp-2',
    hospitalName: 'Olmera Institute of Medical Sciences (OIMS)',
    phone: '+91 98491 77320',
    bio: 'Junior Resident specializing in post-discharge cardiac telemetry monitoring and medication adherence follow-ups.',
    status: 'active',
    assignedSeniorDoctorId: 'doc-sr-01',
    assignedSeniorDoctorName: 'Dr. A Suresh',
    assignedPatientIds: ['pt-102', 'pt-103'],
    createdAt: '2026-04-02T09:15:00.000Z',
    updatedAt: '2026-11-22T11:00:00.000Z',
  },
];

const DEFAULT_SUBMISSIONS: ClinicalSubmission[] = [
  {
    id: 'sub-201',
    submissionType: 'prescription',
    patientId: 'demo-patient-uid',
    patientName: 'Demo Patient',
    title: 'Hypertension & Lipid Control Regimen Adjustment',
    clinicalDetails:
      'Patient reports mild morning dizziness after starting evening dose. Recommend shifting Telmisartan to 08:00 AM and continuing Atorvastatin 20mg at night.',
    medicationList: [
      { name: 'Telmisartan', dosage: '40 mg', frequency: 'Once daily (Morning 1-0-0)', duration: '30 days' },
      { name: 'Atorvastatin Calcium', dosage: '20 mg', frequency: 'Once daily (Night 0-0-1)', duration: '30 days' },
    ],
    juniorDoctorId: 'doc-jr-01',
    juniorDoctorName: 'Dr. Rahul Varma',
    seniorDoctorId: 'doc-sr-01',
    seniorDoctorName: 'Dr. A Suresh',
    status: 'pending_review',
    isOfficialDecision: false,
    visibleToPatient: false,
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    history: [
      {
        id: 'hist-201-1',
        action: 'submitted',
        actorId: 'doc-jr-01',
        actorName: 'Dr. Rahul Varma',
        actorRole: 'junior_resident',
        notes: 'Submitted prescription timing adjustment for Senior Consultant review.',
        timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
      },
    ],
  },
  {
    id: 'sub-202',
    submissionType: 'diagnosis',
    patientId: 'pt-102',
    patientName: 'Ananya Rao',
    title: 'Post-Viral Reactive Airway Assessment',
    clinicalDetails:
      'Spirometry shows mild reversible bronchospasm (FEV1/FVC 72%). Suggest short-course inhaled budesonide and follow-up PFT in 14 days.',
    juniorDoctorId: 'doc-jr-02',
    juniorDoctorName: 'Dr. Sneha Reddy',
    seniorDoctorId: 'doc-sr-01',
    seniorDoctorName: 'Dr. A Suresh',
    status: 'approved',
    isOfficialDecision: true,
    visibleToPatient: true,
    seniorReviewNotes: 'Approved. Confirmed mild reactive airway pattern; proceed with 14-day follow-up.',
    createdAt: new Date(Date.now() - 26 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 22 * 3600000).toISOString(),
    reviewedAt: new Date(Date.now() - 22 * 3600000).toISOString(),
    history: [
      {
        id: 'hist-202-1',
        action: 'submitted',
        actorId: 'doc-jr-02',
        actorName: 'Dr. Sneha Reddy',
        actorRole: 'junior_resident',
        notes: 'Submitted provisional diagnosis and inhaler plan.',
        timestamp: new Date(Date.now() - 26 * 3600000).toISOString(),
      },
      {
        id: 'hist-202-2',
        action: 'approved',
        actorId: 'doc-sr-01',
        actorName: 'Dr. A Suresh',
        actorRole: 'senior_consultant',
        notes: 'Approved. Confirmed mild reactive airway pattern; proceed with 14-day follow-up.',
        timestamp: new Date(Date.now() - 22 * 3600000).toISOString(),
      },
    ],
  },
];

const DEFAULT_ACTIVITY: DoctorActivityEntry[] = [
  {
    id: 'act-1',
    doctorId: 'doc-jr-01',
    doctorName: 'Dr. Rahul Varma',
    doctorRole: 'junior_resident',
    seniorDoctorId: 'doc-sr-01',
    actionType: 'clinical_submission',
    patientId: 'demo-patient-uid',
    patientName: 'Demo Patient',
    summary: 'Submitted prescription adjustment for Hypertension & Lipid Control (Pending Senior Review).',
    timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 'act-2',
    doctorId: 'doc-jr-02',
    doctorName: 'Dr. Sneha Reddy',
    doctorRole: 'junior_resident',
    seniorDoctorId: 'doc-sr-01',
    actionType: 'follow_up_updated',
    patientId: 'pt-102',
    patientName: 'Ananya Rao',
    summary: 'Scheduled 14-day PFT follow-up check and confirmed patient inhaler technique.',
    timestamp: new Date(Date.now() - 20 * 3600000).toISOString(),
  },
];

export class DoctorManagementService {
  private getDoctorsStore(): DoctorAccount[] {
    try {
      const raw = localStorage.getItem(DOCTORS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Doctor accounts store read warning:', e);
    }
    localStorage.setItem(DOCTORS_STORAGE_KEY, JSON.stringify(DEFAULT_DOCTORS));
    return [...DEFAULT_DOCTORS];
  }

  private saveDoctorsStore(doctors: DoctorAccount[]): void {
    localStorage.setItem(DOCTORS_STORAGE_KEY, JSON.stringify(doctors));
  }

  private getSubmissionsStore(): ClinicalSubmission[] {
    try {
      const raw = localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Submissions store read warning:', e);
    }
    localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(DEFAULT_SUBMISSIONS));
    return [...DEFAULT_SUBMISSIONS];
  }

  private saveSubmissionsStore(submissions: ClinicalSubmission[]): void {
    localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(submissions));
  }

  private getActivityStore(): DoctorActivityEntry[] {
    try {
      const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Activity store read warning:', e);
    }
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(DEFAULT_ACTIVITY));
    return [...DEFAULT_ACTIVITY];
  }

  private saveActivityStore(activities: DoctorActivityEntry[]): void {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activities));
  }

  private recordActivity(entry: Omit<DoctorActivityEntry, 'id' | 'timestamp'>): void {
    const activities = this.getActivityStore();
    activities.unshift({
      ...entry,
      id: `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    });
    this.saveActivityStore(activities.slice(0, 200));
  }

  // --- RBAC Enforcement ---
  canPerformAction(role: DoctorHierarchyRole, action: DoctorRBACAction): boolean {
    const seniorOnlyActions: DoctorRBACAction[] = [
      'create_junior_doctor',
      'edit_junior_doctor',
      'deactivate_junior_doctor',
      'approve_submission',
      'reject_submission',
      'request_modification',
      'assign_patient',
      'publish_official_decision_directly',
    ];
    if (seniorOnlyActions.includes(action)) {
      return role === 'senior_consultant';
    }
    return role === 'senior_consultant' || role === 'junior_resident';
  }

  // --- Doctor Account & Session Resolution ---
  getAllDoctors(): DoctorAccount[] {
    return this.getDoctorsStore();
  }

  getDoctorById(doctorId: string): DoctorAccount | null {
    return this.getDoctorsStore().find(d => d.id === doctorId) || null;
  }

  getDoctorByEmail(email: string): DoctorAccount | null {
    const normalized = email.trim().toLowerCase();
    return this.getDoctorsStore().find(d => d.email.toLowerCase() === normalized) || null;
  }

  resolveActiveDoctor(email?: string | null, uid?: string | null): DoctorAccount {
    // 1. Check active session override
    try {
      const savedSession = localStorage.getItem(ACTIVE_DOCTOR_SESSION_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession) as DoctorAccount;
        const fresh = this.getDoctorById(parsed.id);
        if (fresh) {
          if (!email || fresh.email.toLowerCase() === email.toLowerCase()) {
            return fresh;
          }
        }
      }
    } catch {
      // ignore storage read errors
    }

    // 2. Match by email or UID
    const all = this.getDoctorsStore();
    if (email) {
      const byEmail = all.find(d => d.email.toLowerCase() === email.trim().toLowerCase());
      if (byEmail) return byEmail;
    }
    if (uid) {
      const byId = all.find(d => d.id === uid);
      if (byId) return byId;
    }

    // 3. Default to primary Senior Consultant
    return all.find(d => d.hierarchyRole === 'senior_consultant') || all[0];
  }

  authenticateDoctorLogin(
    email: string,
    accessCode: string
  ): { success: boolean; doctor?: DoctorAccount; error?: string } {
    const doctor = this.getDoctorByEmail(email);
    if (!doctor) {
      return { success: false, error: 'No registered doctor account found for this email.' };
    }
    if (doctor.status !== 'active') {
      return {
        success: false,
        error: 'This Junior Doctor account has been deactivated by the supervising Senior Doctor.',
      };
    }
    if (doctor.accessCode !== accessCode) {
      return { success: false, error: 'Invalid password / clinical access code.' };
    }

    const doctors = this.getDoctorsStore();
    const target = doctors.find(d => d.id === doctor.id);
    if (target) {
      target.lastLoginAt = new Date().toISOString();
      this.saveDoctorsStore(doctors);
    }

    localStorage.setItem(ACTIVE_DOCTOR_SESSION_KEY, JSON.stringify(doctor));
    this.recordActivity({
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      doctorRole: doctor.hierarchyRole,
      seniorDoctorId: doctor.assignedSeniorDoctorId,
      actionType: 'doctor_login',
      summary: `${doctor.fullName} signed in to ${doctor.hierarchyRole === 'senior_consultant' ? 'Senior Consultant' : 'Junior Resident'} portal.`,
    });

    return { success: true, doctor };
  }

  setActiveDoctorSession(doctor: DoctorAccount): void {
    localStorage.setItem(ACTIVE_DOCTOR_SESSION_KEY, JSON.stringify(doctor));
  }

  updateOwnProfile(
    doctorId: string,
    updates: Partial<Pick<DoctorAccount, 'fullName' | 'qualification' | 'specialization' | 'experienceYears' | 'phone' | 'bio' | 'hospitalName'>>
  ): DoctorAccount | null {
    const doctors = this.getDoctorsStore();
    const idx = doctors.findIndex(d => d.id === doctorId);
    if (idx === -1) return null;

    doctors[idx] = {
      ...doctors[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveDoctorsStore(doctors);
    localStorage.setItem(ACTIVE_DOCTOR_SESSION_KEY, JSON.stringify(doctors[idx]));
    return doctors[idx];
  }

  // --- Junior Doctor Management (Senior Doctor Only) ---
  getJuniorDoctorsForSenior(seniorDoctorId: string): DoctorAccount[] {
    return this.getDoctorsStore().filter(
      d => d.hierarchyRole === 'junior_resident' && d.assignedSeniorDoctorId === seniorDoctorId
    );
  }

  createJuniorDoctor(
    seniorDoctor: DoctorAccount,
    params: {
      fullName: string;
      email: string;
      accessCode: string;
      qualification: string;
      specialization: string;
      experienceYears: number;
      licenseNumber: string;
      phone: string;
      bio?: string;
      assignedPatientIds?: string[];
    }
  ): { success: boolean; doctor?: DoctorAccount; error?: string } {
    if (!this.canPerformAction(seniorDoctor.hierarchyRole, 'create_junior_doctor')) {
      return { success: false, error: 'RBAC Denied: Only Senior Doctors can register Junior Doctor accounts.' };
    }
    if (this.getDoctorByEmail(params.email)) {
      return { success: false, error: 'A doctor account with this email already exists.' };
    }

    const newJunior: DoctorAccount = {
      id: `doc-jr-${Date.now().toString(36)}`,
      fullName: params.fullName.trim(),
      email: params.email.trim().toLowerCase(),
      accessCode: params.accessCode.trim(),
      hierarchyRole: 'junior_resident',
      qualification: params.qualification.trim(),
      specialization: params.specialization.trim(),
      experienceYears: Number(params.experienceYears) || 1,
      licenseNumber: params.licenseNumber.trim(),
      hospitalId: seniorDoctor.hospitalId,
      hospitalName: seniorDoctor.hospitalName,
      phone: params.phone.trim(),
      bio: params.bio?.trim() || `Junior Resident supervised by ${seniorDoctor.fullName}.`,
      status: 'active',
      assignedSeniorDoctorId: seniorDoctor.id,
      assignedSeniorDoctorName: seniorDoctor.fullName,
      assignedPatientIds: params.assignedPatientIds || ['demo-patient-uid'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const doctors = this.getDoctorsStore();
    doctors.push(newJunior);
    this.saveDoctorsStore(doctors);

    this.recordActivity({
      doctorId: seniorDoctor.id,
      doctorName: seniorDoctor.fullName,
      doctorRole: seniorDoctor.hierarchyRole,
      seniorDoctorId: seniorDoctor.id,
      actionType: 'account_created',
      summary: `Registered Junior Doctor ${newJunior.fullName} (${newJunior.email}) under supervision.`,
    });

    return { success: true, doctor: newJunior };
  }

  updateJuniorDoctor(
    seniorDoctor: DoctorAccount,
    juniorId: string,
    updates: Partial<Pick<DoctorAccount, 'fullName' | 'qualification' | 'specialization' | 'experienceYears' | 'licenseNumber' | 'phone' | 'bio' | 'accessCode' | 'assignedPatientIds'>>
  ): { success: boolean; doctor?: DoctorAccount; error?: string } {
    if (!this.canPerformAction(seniorDoctor.hierarchyRole, 'edit_junior_doctor')) {
      return { success: false, error: 'RBAC Denied: Only Senior Doctors can edit Junior Doctor profiles.' };
    }

    const doctors = this.getDoctorsStore();
    const idx = doctors.findIndex(d => d.id === juniorId && d.hierarchyRole === 'junior_resident');
    if (idx === -1) return { success: false, error: 'Junior Doctor profile not found.' };

    if (doctors[idx].assignedSeniorDoctorId !== seniorDoctor.id) {
      return { success: false, error: 'Access Denied: You can only manage Junior Doctors mapped to you.' };
    }

    doctors[idx] = {
      ...doctors[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveDoctorsStore(doctors);

    this.recordActivity({
      doctorId: seniorDoctor.id,
      doctorName: seniorDoctor.fullName,
      doctorRole: seniorDoctor.hierarchyRole,
      seniorDoctorId: seniorDoctor.id,
      actionType: 'account_updated',
      summary: `Updated profile details for Junior Doctor ${doctors[idx].fullName}.`,
    });

    return { success: true, doctor: doctors[idx] };
  }

  toggleJuniorDoctorStatus(
    seniorDoctor: DoctorAccount,
    juniorId: string
  ): { success: boolean; doctor?: DoctorAccount; error?: string } {
    if (!this.canPerformAction(seniorDoctor.hierarchyRole, 'deactivate_junior_doctor')) {
      return { success: false, error: 'RBAC Denied: Only Senior Doctors can activate or deactivate Junior Doctors.' };
    }

    const doctors = this.getDoctorsStore();
    const idx = doctors.findIndex(d => d.id === juniorId && d.hierarchyRole === 'junior_resident');
    if (idx === -1) return { success: false, error: 'Junior Doctor profile not found.' };

    if (doctors[idx].assignedSeniorDoctorId !== seniorDoctor.id) {
      return { success: false, error: 'Access Denied: Junior Doctor is not mapped to your supervision.' };
    }

    const nextStatus = doctors[idx].status === 'active' ? 'deactivated' : 'active';
    doctors[idx].status = nextStatus;
    doctors[idx].updatedAt = new Date().toISOString();
    this.saveDoctorsStore(doctors);

    this.recordActivity({
      doctorId: seniorDoctor.id,
      doctorName: seniorDoctor.fullName,
      doctorRole: seniorDoctor.hierarchyRole,
      seniorDoctorId: seniorDoctor.id,
      actionType: 'account_status_changed',
      summary: `${nextStatus === 'deactivated' ? 'Deactivated' : 'Reactivated'} Junior Doctor account for ${doctors[idx].fullName}.`,
    });

    return { success: true, doctor: doctors[idx] };
  }

  // --- Clinical Submissions & Mandatory Senior Approval Workflow ---
  submitClinicalRecommendation(
    juniorDoctor: DoctorAccount,
    params: {
      submissionType: SubmissionType;
      patientId: string;
      patientName: string;
      title: string;
      clinicalDetails: string;
      medicationList?: ClinicalSubmission['medicationList'];
    }
  ): { success: boolean; submission?: ClinicalSubmission; error?: string } {
    if (!juniorDoctor.assignedSeniorDoctorId || !juniorDoctor.assignedSeniorDoctorName) {
      return {
        success: false,
        error: 'Every Junior Doctor must be mapped to a responsible Senior Doctor before submitting clinical actions.',
      };
    }

    const now = new Date().toISOString();
    const newSubmission: ClinicalSubmission = {
      id: `sub-${Date.now().toString(36)}`,
      submissionType: params.submissionType,
      patientId: params.patientId,
      patientName: params.patientName,
      title: params.title.trim(),
      clinicalDetails: params.clinicalDetails.trim(),
      medicationList: params.medicationList,
      juniorDoctorId: juniorDoctor.id,
      juniorDoctorName: juniorDoctor.fullName,
      seniorDoctorId: juniorDoctor.assignedSeniorDoctorId,
      seniorDoctorName: juniorDoctor.assignedSeniorDoctorName,
      status: 'pending_review',
      isOfficialDecision: false,
      visibleToPatient: false,
      createdAt: now,
      updatedAt: now,
      history: [
        {
          id: `hist-${Date.now().toString(36)}`,
          action: 'submitted',
          actorId: juniorDoctor.id,
          actorName: juniorDoctor.fullName,
          actorRole: 'junior_resident',
          notes: `Submitted ${params.submissionType.replace(/_/g, ' ')} for Senior Doctor review.`,
          timestamp: now,
        },
      ],
    };

    const submissions = this.getSubmissionsStore();
    submissions.unshift(newSubmission);
    this.saveSubmissionsStore(submissions);

    this.recordActivity({
      doctorId: juniorDoctor.id,
      doctorName: juniorDoctor.fullName,
      doctorRole: 'junior_resident',
      seniorDoctorId: juniorDoctor.assignedSeniorDoctorId,
      actionType: 'clinical_submission',
      patientId: params.patientId,
      patientName: params.patientName,
      summary: `Submitted ${params.submissionType.replace(/_/g, ' ')}: "${params.title}" (Awaiting Senior Approval).`,
    });

    return { success: true, submission: newSubmission };
  }

  resubmitModifiedRecommendation(
    juniorDoctor: DoctorAccount,
    submissionId: string,
    updates: { title: string; clinicalDetails: string }
  ): { success: boolean; submission?: ClinicalSubmission; error?: string } {
    const submissions = this.getSubmissionsStore();
    const target = submissions.find(s => s.id === submissionId);
    if (!target) return { success: false, error: 'Submission not found.' };
    if (target.juniorDoctorId !== juniorDoctor.id) {
      return { success: false, error: 'Access Denied: You can only revise your own submissions.' };
    }

    const now = new Date().toISOString();
    target.title = updates.title.trim();
    target.clinicalDetails = updates.clinicalDetails.trim();
    target.status = 'pending_review';
    target.isOfficialDecision = false;
    target.visibleToPatient = false;
    target.updatedAt = now;
    target.history.push({
      id: `hist-${Date.now().toString(36)}`,
      action: 'resubmitted',
      actorId: juniorDoctor.id,
      actorName: juniorDoctor.fullName,
      actorRole: 'junior_resident',
      notes: 'Revised per Senior Doctor feedback and resubmitted for approval.',
      timestamp: now,
    });

    this.saveSubmissionsStore(submissions);
    this.recordActivity({
      doctorId: juniorDoctor.id,
      doctorName: juniorDoctor.fullName,
      doctorRole: 'junior_resident',
      seniorDoctorId: target.seniorDoctorId,
      actionType: 'clinical_submission',
      patientId: target.patientId,
      patientName: target.patientName,
      summary: `Resubmitted modified ${target.submissionType.replace(/_/g, ' ')}: "${target.title}".`,
    });

    return { success: true, submission: target };
  }

  reviewClinicalSubmission(
    seniorDoctor: DoctorAccount,
    submissionId: string,
    decision: 'approved' | 'rejected' | 'modification_requested',
    notes: string
  ): { success: boolean; submission?: ClinicalSubmission; error?: string } {
    if (!this.canPerformAction(seniorDoctor.hierarchyRole, 'approve_submission')) {
      return {
        success: false,
        error: 'RBAC Denied: Only Senior Doctors can approve, reject, or request modifications.',
      };
    }

    const submissions = this.getSubmissionsStore();
    const target = submissions.find(s => s.id === submissionId);
    if (!target) return { success: false, error: 'Clinical submission not found.' };
    if (target.seniorDoctorId !== seniorDoctor.id) {
      return {
        success: false,
        error: 'Access Denied: Submission is mapped to another Senior Doctor.',
      };
    }

    const now = new Date().toISOString();
    target.status = decision;
    target.seniorReviewNotes = notes.trim();
    target.reviewedAt = now;
    target.updatedAt = now;

    // STRICT SAFETY GATE: Only Senior Doctor approval promotes to official patient-visible decision
    if (decision === 'approved') {
      target.isOfficialDecision = true;
      target.visibleToPatient = true;
    } else {
      target.isOfficialDecision = false;
      target.visibleToPatient = false;
    }

    target.history.push({
      id: `hist-${Date.now().toString(36)}`,
      action: decision,
      actorId: seniorDoctor.id,
      actorName: seniorDoctor.fullName,
      actorRole: 'senior_consultant',
      notes: notes.trim() || `Marked as ${decision.replace(/_/g, ' ')}`,
      timestamp: now,
    });

    this.saveSubmissionsStore(submissions);

    this.recordActivity({
      doctorId: seniorDoctor.id,
      doctorName: seniorDoctor.fullName,
      doctorRole: 'senior_consultant',
      seniorDoctorId: seniorDoctor.id,
      actionType: 'senior_review',
      patientId: target.patientId,
      patientName: target.patientName,
      summary: `${decision.toUpperCase()} Junior submission "${target.title}" by ${target.juniorDoctorName}.`,
    });

    return { success: true, submission: target };
  }

  getSubmissionsForDoctor(doctor: DoctorAccount): ClinicalSubmission[] {
    const all = this.getSubmissionsStore();
    if (doctor.hierarchyRole === 'senior_consultant') {
      return all.filter(s => s.seniorDoctorId === doctor.id);
    }
    return all.filter(s => s.juniorDoctorId === doctor.id);
  }

  getOfficialApprovedDecisionsForPatient(patientId: string): ClinicalSubmission[] {
    return this.getSubmissionsStore().filter(
      s => s.patientId === patientId && s.status === 'approved' && s.isOfficialDecision && s.visibleToPatient
    );
  }

  logPatientInteraction(
    doctor: DoctorAccount,
    patientId: string,
    patientName: string,
    actionType: 'patient_communication' | 'follow_up_updated',
    summary: string
  ): void {
    this.recordActivity({
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      doctorRole: doctor.hierarchyRole,
      seniorDoctorId: doctor.assignedSeniorDoctorId || doctor.id,
      actionType,
      patientId,
      patientName,
      summary,
    });
  }

  getSupervisedActivityLog(seniorDoctorId: string): DoctorActivityEntry[] {
    return this.getActivityStore().filter(
      a => a.seniorDoctorId === seniorDoctorId || a.doctorId === seniorDoctorId
    );
  }
}

export const doctorManagementService = new DoctorManagementService();
