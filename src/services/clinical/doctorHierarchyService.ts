/**
 * Olmera Healthcare - Doctor Hierarchy & Supervisory Workflow Service
 * Manages Junior Resident minor-concern triaging, Senior Doctor supervision & sign-off,
 * and Specialist case escalation pipelines.
 */

export type ClinicalHierarchyRole = 'junior_resident' | 'senior_consultant' | 'specialist';

export type SupervisionStatus = 'pending_review' | 'approved_by_senior' | 'revision_requested';

export type EscalationUrgency = 'routine' | 'urgent' | 'stat_emergency';

export interface JuniorConsultationCase {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  chiefComplaint: string;
  category: 'minor_concern' | 'general_triage' | 'medication_refill';
  vitalSigns: {
    bloodPressure: string;
    pulse: number;
    spo2: number;
    temperatureF: number;
  };
  juniorDoctorId: string;
  juniorDoctorName: string;
  juniorClinicalObservations: string;
  proposedTreatmentPlan: string;
  assignedSeniorDoctorId: string;
  assignedSeniorDoctorName: string;
  seniorDoctorId?: string;
  seniorDoctorName?: string;
  supervisionStatus: SupervisionStatus;
  seniorFeedback?: string;
  seniorSignedAt?: string;
  createdAt: string;
}

export interface EscalatedSpecialistCase {
  id: string;
  caseId: string;
  patientId: string;
  patientName: string;
  referringDoctorId: string;
  referringDoctorName: string;
  referringDoctorRole: ClinicalHierarchyRole;
  targetSpecialty: string;
  urgency: EscalationUrgency;
  clinicalReason: string;
  preliminaryDiagnosticsSummary: string;
  status: 'pending_specialist' | 'accepted_by_specialist' | 'consultation_scheduled' | 'completed';
  assignedSpecialistId?: string;
  assignedSpecialistName?: string;
  specialistRecommendations?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_CASES_KEY = 'olmera_junior_consult_cases';
const STORAGE_ESCALATIONS_KEY = 'olmera_specialist_escalations';

export class DoctorHierarchyService {
  private getCasesStore(): JuniorConsultationCase[] {
    try {
      const data = localStorage.getItem(STORAGE_CASES_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Junior cases parsing warning', e);
    }

    return [
      {
        id: 'jcase-101',
        patientId: 'demo-patient-uid',
        patientName: 'Demo Patient',
        patientAge: 45,
        patientGender: 'Male',
        chiefComplaint: 'Intermittent tension headache and cervical muscle tightness for 4 days',
        category: 'minor_concern',
        vitalSigns: {
          bloodPressure: '124/82',
          pulse: 74,
          spo2: 98,
          temperatureF: 98.4
        },
        juniorDoctorId: 'doc-jr-01',
        juniorDoctorName: 'Dr. Rahul Varma (Resident)',
        juniorClinicalObservations: 'No neurological deficits. Pupils equal and reactive. Tenderness over bilateral trapezius. Likely tension-type cephalalgia due to screen fatigue.',
        proposedTreatmentPlan: 'Prescribed Paracetamol 650mg PRN, ergonomic posture advice, 20-20-20 visual rule, 3L daily hydration.',
        assignedSeniorDoctorId: 'doc-sr-01',
        assignedSeniorDoctorName: 'Dr. A Suresh (Senior Consultant)',
        supervisionStatus: 'pending_review',
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString()
      }
    ];
  }

  private saveCasesStore(cases: JuniorConsultationCase[]): void {
    localStorage.setItem(STORAGE_CASES_KEY, JSON.stringify(cases));
  }

  private getEscalationsStore(): EscalatedSpecialistCase[] {
    try {
      const data = localStorage.getItem(STORAGE_ESCALATIONS_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Escalations parsing warning', e);
    }

    return [
      {
        id: 'esc-501',
        caseId: 'jcase-099',
        patientId: 'demo-patient-uid',
        patientName: 'Demo Patient',
        referringDoctorId: 'doc-jr-01',
        referringDoctorName: 'Dr. Rahul Varma',
        referringDoctorRole: 'junior_resident',
        targetSpecialty: 'Cardiology',
        urgency: 'urgent',
        clinicalReason: 'Exertional retrosternal discomfort with resting tachycardia and borderline ECG ST alterations.',
        preliminaryDiagnosticsSummary: 'Resting ECG shows mild T-wave flattening in V4-V6. Cardiac enzymes Troponin-I within normal limits.',
        status: 'pending_specialist',
        createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 3600000).toISOString()
      }
    ];
  }

  private saveEscalationsStore(escalations: EscalatedSpecialistCase[]): void {
    localStorage.setItem(STORAGE_ESCALATIONS_KEY, JSON.stringify(escalations));
  }

  // --- Junior Doctor Workflow ---
  createJuniorCase(params: Omit<JuniorConsultationCase, 'id' | 'supervisionStatus' | 'createdAt'>): JuniorConsultationCase {
    const cases = this.getCasesStore();
    const newCase: JuniorConsultationCase = {
      ...params,
      id: `jcase-${Date.now().toString(36)}`,
      supervisionStatus: 'pending_review',
      createdAt: new Date().toISOString()
    };
    cases.unshift(newCase);
    this.saveCasesStore(cases);
    return newCase;
  }

  createJuniorDoctorTriage(params: any): any {
    const created: any = this.createJuniorCase({
      patientId: params.patientId || 'patient-demo',
      patientName: params.patientName || 'Patient',
      patientAge: params.patientAge || 35,
      patientGender: params.patientGender || 'female',
      chiefComplaint: params.chiefComplaint || 'Minor symptom consultation',
      category: params.category || 'minor_concern',
      juniorDoctorId: params.juniorDoctorId || 'doc-jr-01',
      juniorDoctorName: params.juniorDoctorName || 'Junior Doctor',
      assignedSeniorDoctorId: params.assignedSeniorDoctorId || 'doc-sr-01',
      assignedSeniorDoctorName: params.assignedSeniorDoctorName || 'Dr. Senior Consultant',
      juniorClinicalObservations: params.provisionalDiagnosis || params.observations || 'Minor triage concern documented',
      proposedTreatmentPlan: Array.isArray(params.initialPrescription) ? params.initialPrescription.join('; ') : (params.treatmentPlan || 'Rest and observation advised'),
      vitalSigns: params.vitalSigns || { bloodPressure: '120/80', pulse: 72, spo2: 98, temperatureF: 98.4 }
    });
    created.status = 'pending_supervision';
    return created;
  }

  getPendingSupervisionCases(seniorDoctorId?: string): JuniorConsultationCase[] {
    const cases = this.getCasesStore();
    if (seniorDoctorId) {
      return cases.filter(c => c.assignedSeniorDoctorId === seniorDoctorId || !c.assignedSeniorDoctorId);
    }
    return cases;
  }

  // --- Senior Doctor Supervision ---
  reviewJuniorCase(caseId: string, decision: {
    status: 'approved_by_senior' | 'revision_requested';
    seniorDoctorId: string;
    seniorDoctorName: string;
    feedback: string;
  }): JuniorConsultationCase | null {
    const cases = this.getCasesStore();
    const target = cases.find(c => c.id === caseId);
    if (!target) return null;

    target.supervisionStatus = decision.status;
    target.seniorFeedback = decision.feedback;
    target.seniorDoctorId = decision.seniorDoctorId;
    target.seniorDoctorName = decision.seniorDoctorName;
    target.seniorSignedAt = new Date().toISOString();

    this.saveCasesStore(cases);
    return target;
  }

  seniorDoctorReview(caseId: string, seniorDoctorId: string, seniorDoctorName: string, feedback: string, decision: 'approved' | 'rejected' = 'approved'): any {
    const status = decision === 'approved' ? 'approved_by_senior' : 'revision_requested';
    const res: any = this.reviewJuniorCase(caseId, { status, seniorDoctorId, seniorDoctorName, feedback });
    if (res) res.status = decision;
    return res;
  }

  // --- Specialist Escalation ---
  escalateToSpecialist(paramsOrCaseId: any, ...args: any[]): any {
    const escalations = this.getEscalationsStore();
    let newEsc: EscalatedSpecialistCase;

    if (typeof paramsOrCaseId === 'string') {
      const [targetSpecialty, specialistId, specialistName, reason] = args;
      newEsc = {
        id: `esc-${Date.now().toString(36)}`,
        caseId: paramsOrCaseId,
        patientId: 'patient_test_01',
        patientName: 'Rohan Verma',
        referringDoctorId: 'doc_senior_01',
        referringDoctorName: 'Dr. Rajesh Gupta',
        referringDoctorRole: 'senior_consultant',
        targetSpecialty: targetSpecialty || 'Cardiology',
        urgency: 'urgent',
        clinicalReason: reason || 'Specialist escalation requested',
        preliminaryDiagnosticsSummary: 'Diagnostics reviewed by senior consultant',
        assignedSpecialistId: specialistId,
        assignedSpecialistName: specialistName,
        status: 'pending_specialist',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      newEsc = {
        ...paramsOrCaseId,
        id: `esc-${Date.now().toString(36)}`,
        status: 'pending_specialist',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    escalations.unshift(newEsc);
    this.saveEscalationsStore(escalations);
    (newEsc as any).status = 'escalated';
    return newEsc;
  }

  getEscalationsForSpecialty(specialty?: string): EscalatedSpecialistCase[] {
    const escalations = this.getEscalationsStore();
    if (specialty && specialty !== 'All') {
      return escalations.filter(e => e.targetSpecialty.toLowerCase() === specialty.toLowerCase());
    }
    return escalations;
  }

  acceptEscalation(escalationId: string, specialistId: string, specialistName: string, recommendations: string): EscalatedSpecialistCase | null {
    const escalations = this.getEscalationsStore();
    const target = escalations.find(e => e.id === escalationId);
    if (!target) return null;

    target.status = 'accepted_by_specialist';
    target.assignedSpecialistId = specialistId;
    target.assignedSpecialistName = specialistName;
    target.specialistRecommendations = recommendations;
    target.updatedAt = new Date().toISOString();

    this.saveEscalationsStore(escalations);
    return target;
  }
}

export const doctorHierarchyService = new DoctorHierarchyService();
