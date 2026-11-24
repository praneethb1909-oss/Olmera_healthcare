import React, { useState, useEffect } from 'react';
import { 
  UserCheck, Shield, AlertTriangle, CheckCircle2, ChevronRight, 
  Send, User, Clock, ArrowRight, MessageSquare, Sparkles, Filter, X 
} from 'lucide-react';
import { 
  doctorHierarchyService, 
  JuniorConsultationCase, 
  EscalatedSpecialistCase,
  ClinicalHierarchyRole 
} from '../../services/clinical/doctorHierarchyService';
import { useAuth } from '../../contexts/AuthContext';

interface DoctorHierarchyConsoleProps {
  initialTab?: 'junior_triage' | 'senior_supervision' | 'specialist_escalations';
  currentDoctorId?: string;
  doctorRole?: string;
  onSelectCase?: (caseId: string) => void;
}

export function DoctorHierarchyConsole({ initialTab = 'senior_supervision' }: DoctorHierarchyConsoleProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'junior_triage' | 'senior_supervision' | 'specialist_escalations'>(initialTab);
  
  // Data
  const [juniorCases, setJuniorCases] = useState<JuniorConsultationCase[]>([]);
  const [escalations, setEscalations] = useState<EscalatedSpecialistCase[]>([]);

  // Selected case for review
  const [selectedJuniorCase, setSelectedJuniorCase] = useState<JuniorConsultationCase | null>(null);
  const [seniorFeedback, setSeniorFeedback] = useState('Treatment plan reviewed and approved. Monitor blood pressure daily.');
  
  // New Junior Case Form State
  const [showNewJuniorCaseModal, setShowNewJuniorCaseModal] = useState(false);
  const [newCaseData, setNewCaseData] = useState({
    patientName: 'K. Lakshmi',
    patientAge: 38,
    patientGender: 'Female',
    chiefComplaint: 'Mild dry throat and episodic headache for 2 days',
    category: 'minor_concern' as JuniorConsultationCase['category'],
    bp: '122/80',
    pulse: 74,
    spo2: 98,
    temp: 98.6,
    observations: 'Pharynx non-hyperemic. Clear lung fields. Mild tension over nuchal muscles.',
    plan: 'Prescribed warm saline gargles, Paracetamol 500mg SOS, 3L daily fluid intake.'
  });

  // New Specialist Escalation Form State
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateData, setEscalateData] = useState({
    patientName: 'Demo Patient',
    specialty: 'Cardiology',
    urgency: 'urgent' as EscalatedSpecialistCase['urgency'],
    clinicalReason: 'Recurrent exertional chest pressure with borderline ST changes on resting ECG.',
    diagnosticsSummary: 'Resting ECG shows non-specific ST-T wave abnormalities in anterolateral leads. Troponin-I within normal limits.'
  });

  const loadData = () => {
    setJuniorCases(doctorHierarchyService.getPendingSupervisionCases());
    setEscalations(doctorHierarchyService.getEscalationsForSpecialty());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveCase = (status: 'approved_by_senior' | 'revision_requested') => {
    if (!selectedJuniorCase) return;
    doctorHierarchyService.reviewJuniorCase(selectedJuniorCase.id, {
      status,
      seniorDoctorId: user?.uid || 'doc-sr-01',
      seniorDoctorName: user?.displayName || 'Dr. A Suresh (Senior Consultant)',
      feedback: seniorFeedback
    });
    setSelectedJuniorCase(null);
    loadData();
  };

  const handleCreateJuniorCase = (e: React.FormEvent) => {
    e.preventDefault();
    doctorHierarchyService.createJuniorCase({
      patientId: `pt-${Date.now().toString(36)}`,
      patientName: newCaseData.patientName,
      patientAge: Number(newCaseData.patientAge),
      patientGender: newCaseData.patientGender,
      chiefComplaint: newCaseData.chiefComplaint,
      category: newCaseData.category,
      vitalSigns: {
        bloodPressure: newCaseData.bp,
        pulse: Number(newCaseData.pulse),
        spo2: Number(newCaseData.spo2),
        temperatureF: Number(newCaseData.temp)
      },
      juniorDoctorId: user?.uid || 'doc-jr-01',
      juniorDoctorName: user?.displayName || 'Dr. Rahul Varma (Resident)',
      juniorClinicalObservations: newCaseData.observations,
      proposedTreatmentPlan: newCaseData.plan,
      assignedSeniorDoctorId: 'doc-sr-01',
      assignedSeniorDoctorName: 'Dr. A Suresh (Senior Consultant)'
    });
    setShowNewJuniorCaseModal(false);
    loadData();
  };

  const handleCreateEscalation = (e: React.FormEvent) => {
    e.preventDefault();
    doctorHierarchyService.escalateToSpecialist({
      caseId: `case-${Date.now().toString(36)}`,
      patientId: 'demo-patient-uid',
      patientName: escalateData.patientName,
      referringDoctorId: user?.uid || 'doc-jr-01',
      referringDoctorName: user?.displayName || 'Dr. Attending Physician',
      referringDoctorRole: 'junior_resident',
      targetSpecialty: escalateData.specialty,
      urgency: escalateData.urgency,
      clinicalReason: escalateData.clinicalReason,
      preliminaryDiagnosticsSummary: escalateData.diagnosticsSummary
    });
    setShowEscalateModal(false);
    loadData();
  };

  const handleAcceptEscalation = (escId: string) => {
    const recs = prompt('Enter specialist recommendations or scheduling notes for this patient:', 'Accepted. Scheduled for comprehensive 2D Echocardiogram & TMT tomorrow at 10:30 AM.');
    if (recs) {
      doctorHierarchyService.acceptEscalation(
        escId,
        user?.uid || 'spec-01',
        user?.displayName || 'Dr. Specialist Consultant',
        recs
      );
      loadData();
    }
  };

  return (
    <div className="card p-6 sm:p-8 bg-[var(--color-surface)] border-[var(--color-line)] rounded-3xl shadow-sm space-y-6 font-ui text-[var(--color-ink)] animate-fadeIn">
      
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-line)]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--color-surface-subtle)] text-[var(--color-primary)] rounded-full text-xs font-semibold mb-2 border border-[var(--color-line)]">
            <Shield size={14} /> Clinical Hierarchy & Care Escalation Hub
          </div>
          <h3 className="text-2xl font-display font-semibold text-[var(--color-ink)]">
            Doctor Supervision & Escalation Matrix
          </h3>
          <p className="text-xs sm:text-sm text-[var(--color-muted)]">
            Supervised Junior Doctor consultations, Senior Consultant sign-offs, and Specialist escalation pathways.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-[var(--color-surface-subtle)] rounded-2xl border border-[var(--color-line)] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('senior_supervision')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'senior_supervision' 
                ? 'bg-[var(--color-primary)] text-white shadow-sm' 
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            Senior Supervision ({juniorCases.filter(c => c.supervisionStatus === 'pending_review').length})
          </button>
          <button
            onClick={() => setActiveTab('junior_triage')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'junior_triage' 
                ? 'bg-[var(--color-primary)] text-white shadow-sm' 
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            Junior Resident Triage
          </button>
          <button
            onClick={() => setActiveTab('specialist_escalations')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'specialist_escalations' 
                ? 'bg-[var(--color-primary)] text-white shadow-sm' 
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            Specialist Escalations ({escalations.filter(e => e.status === 'pending_specialist').length})
          </button>
        </div>
      </div>

      {/* --- TAB 1: SENIOR DOCTOR SUPERVISION CONSOLE --- */}
      {activeTab === 'senior_supervision' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Junior Resident Consultations Awaiting Senior Sign-off
            </span>
          </div>

          {juniorCases.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-[var(--color-line)] rounded-2xl text-xs text-[var(--color-muted)]">
              No junior cases currently awaiting supervision.
            </div>
          ) : (
            <div className="space-y-3">
              {juniorCases.map(c => (
                <div 
                  key={c.id}
                  className="p-4 bg-[var(--color-surface-subtle)] border border-[var(--color-line)] rounded-2xl space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-semibold text-sm text-[var(--color-ink)]">
                          {c.patientName} ({c.patientAge} Yrs, {c.patientGender})
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-bold">
                          {c.category.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          c.supervisionStatus === 'approved_by_senior'
                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}>
                          {c.supervisionStatus.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <p className="text-xs text-[var(--color-ink)] font-medium mt-1">
                        Chief Complaint: <span className="font-normal">{c.chiefComplaint}</span>
                      </p>

                      <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
                        Examined by: <strong className="text-[var(--color-ink)]">{c.juniorDoctorName}</strong> • BP: {c.vitalSigns.bloodPressure} | Pulse: {c.vitalSigns.pulse} | SpO2: {c.vitalSigns.spo2}%
                      </p>
                    </div>

                    {c.supervisionStatus === 'pending_review' && (
                      <button
                        onClick={() => setSelectedJuniorCase(c)}
                        className="px-3 py-1.5 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-xl hover:opacity-90 shadow-sm"
                      >
                        Review & Sign Off
                      </button>
                    )}
                  </div>

                  <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl text-xs space-y-1">
                    <p><strong>Junior Observations:</strong> {c.juniorClinicalObservations}</p>
                    <p><strong>Proposed Plan:</strong> {c.proposedTreatmentPlan}</p>
                    {c.seniorFeedback && (
                      <p className="text-emerald-700 dark:text-emerald-400 pt-1 border-t border-[var(--color-line)]">
                        <strong>Senior Consultant Feedback:</strong> {c.seniorFeedback} (Signed by {c.seniorDoctorName})
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: JUNIOR RESIDENT TRIAGE WORKSPACE --- */}
      {activeTab === 'junior_triage' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Minor Concerns Consultation & Triage Workspace
            </span>
            <button
              onClick={() => setShowNewJuniorCaseModal(true)}
              className="px-3.5 py-1.5 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-xl hover:opacity-90 shadow-sm flex items-center gap-1.5"
            >
              <Sparkles size={14} />
              <span>Document Minor Concern Case</span>
            </button>
          </div>

          <div className="p-4 bg-[var(--color-surface-subtle)] border border-[var(--color-line)] rounded-2xl text-xs leading-relaxed text-[var(--color-muted)]">
            Junior Residents evaluate walk-ins or calls for minor symptoms (cold, tension headache, mild sprains, medication refills). Every case is automatically queued for Senior Doctor review before discharge.
          </div>

          <div className="space-y-3">
            {juniorCases.map(c => (
              <div key={c.id} className="p-4 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-sm">{c.patientName}</span>
                  <span className="font-mono text-[10px] text-[var(--color-muted)]">{c.id}</span>
                </div>
                <p className="text-xs text-[var(--color-ink)]">
                  <strong>Complaint:</strong> {c.chiefComplaint}
                </p>
                <div className="flex justify-between items-center pt-2 border-t border-[var(--color-line)] text-[11px] text-[var(--color-muted)]">
                  <span>Assigned Senior: {c.assignedSeniorDoctorName}</span>
                  <span className="capitalize font-semibold text-[var(--color-primary)]">{c.supervisionStatus.replace(/_/g, ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 3: SPECIALIST ESCALATION PIPELINE --- */}
      {activeTab === 'specialist_escalations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Specialist Case Escalation Queue ({escalations.length})
            </span>
            <button
              onClick={() => setShowEscalateModal(true)}
              className="px-3.5 py-1.5 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-xl hover:opacity-90 shadow-sm flex items-center gap-1.5"
            >
              <AlertTriangle size={14} />
              <span>Escalate New Patient Case</span>
            </button>
          </div>

          <div className="space-y-3">
            {escalations.map(esc => (
              <div 
                key={esc.id} 
                className="p-4 bg-[var(--color-surface-subtle)] border border-[var(--color-line)] rounded-2xl space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-semibold text-sm text-[var(--color-ink)]">
                        {esc.patientName}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 text-[10px] font-bold">
                        Specialty: {esc.targetSpecialty}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        esc.urgency === 'stat_emergency' 
                          ? 'bg-rose-50 text-rose-800' 
                          : 'bg-amber-50 text-amber-800'
                      }`}>
                        Urgency: {esc.urgency}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--color-ink)] mt-1">
                      <strong>Escalation Rationale:</strong> {esc.clinicalReason}
                    </p>

                    <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
                      Diagnostics: {esc.preliminaryDiagnosticsSummary}
                    </p>
                  </div>

                  {esc.status === 'pending_specialist' && (
                    <button
                      onClick={() => handleAcceptEscalation(esc.id)}
                      className="px-3.5 py-1.5 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-xl hover:opacity-90 shadow-sm shrink-0"
                    >
                      Accept & Advise
                    </button>
                  )}
                </div>

                {esc.specialistRecommendations && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200">
                    <strong>Specialist Guidance ({esc.assignedSpecialistName}):</strong> {esc.specialistRecommendations}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Senior Review Modal */}
      {selectedJuniorCase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] text-[var(--color-ink)] w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-[var(--color-line)] space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-line)]">
              <h4 className="font-display font-semibold text-base">Senior Supervision Sign-off</h4>
              <button onClick={() => setSelectedJuniorCase(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="text-xs space-y-2 p-3 bg-[var(--color-surface-subtle)] rounded-xl border border-[var(--color-line)]">
              <p><strong>Patient:</strong> {selectedJuniorCase.patientName} ({selectedJuniorCase.patientAge} Yrs)</p>
              <p><strong>Observations:</strong> {selectedJuniorCase.juniorClinicalObservations}</p>
              <p><strong>Junior Proposed Plan:</strong> {selectedJuniorCase.proposedTreatmentPlan}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                Senior Doctor Guidance / Sign-off Comments
              </label>
              <textarea
                value={seniorFeedback}
                onChange={(e) => setSeniorFeedback(e.target.value)}
                className="input-field w-full text-xs font-semibold h-20"
                placeholder="Add supervisory feedback or prescription adjustments..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => handleApproveCase('revision_requested')}
                className="px-3.5 py-2 border border-amber-300 text-amber-700 text-xs font-semibold rounded-xl hover:bg-amber-50"
              >
                Request Junior Revision
              </button>
              <button
                onClick={() => handleApproveCase('approved_by_senior')}
                className="px-4 py-2 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-xl hover:opacity-90 shadow-sm"
              >
                Approve & Sign Off
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Junior Case Modal */}
      {showNewJuniorCaseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] text-[var(--color-ink)] w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-[var(--color-line)] space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-line)]">
              <h4 className="font-display font-semibold text-base">Document Minor Concern Encounter</h4>
              <button onClick={() => setShowNewJuniorCaseModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateJuniorCase} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newCaseData.patientName}
                  onChange={(e) => setNewCaseData({ ...newCaseData, patientName: e.target.value })}
                  placeholder="Patient Name"
                  className="input-field"
                  required
                />
                <input
                  type="number"
                  value={newCaseData.patientAge}
                  onChange={(e) => setNewCaseData({ ...newCaseData, patientAge: Number(e.target.value) })}
                  placeholder="Age"
                  className="input-field"
                  required
                />
              </div>
              <input
                type="text"
                value={newCaseData.chiefComplaint}
                onChange={(e) => setNewCaseData({ ...newCaseData, chiefComplaint: e.target.value })}
                placeholder="Chief Complaint (e.g. Mild dry cough for 3 days)"
                className="input-field w-full"
                required
              />
              <textarea
                value={newCaseData.observations}
                onChange={(e) => setNewCaseData({ ...newCaseData, observations: e.target.value })}
                placeholder="Clinical Observations..."
                className="input-field w-full h-16"
                required
              />
              <textarea
                value={newCaseData.plan}
                onChange={(e) => setNewCaseData({ ...newCaseData, plan: e.target.value })}
                placeholder="Proposed Treatment Plan..."
                className="input-field w-full h-16"
                required
              />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNewJuniorCaseModal(false)} className="px-3 py-1.5 border rounded-xl">Cancel</button>
                <button type="submit" className="btn-primary px-4 py-1.5 text-xs">Submit for Senior Approval</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Escalate Case Modal */}
      {showEscalateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] text-[var(--color-ink)] w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-[var(--color-line)] space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-line)]">
              <h4 className="font-display font-semibold text-base">Escalate Case to Specialist</h4>
              <button onClick={() => setShowEscalateModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateEscalation} className="space-y-3 text-xs">
              <input
                type="text"
                value={escalateData.patientName}
                onChange={(e) => setEscalateData({ ...escalateData, patientName: e.target.value })}
                placeholder="Patient Name"
                className="input-field w-full"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={escalateData.specialty}
                  onChange={(e) => setEscalateData({ ...escalateData, specialty: e.target.value })}
                  className="input-field"
                >
                  <option value="Cardiology">Cardiology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Oncology">Oncology</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Pediatrics">Pediatrics</option>
                </select>
                <select
                  value={escalateData.urgency}
                  onChange={(e) => setEscalateData({ ...escalateData, urgency: e.target.value as any })}
                  className="input-field"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent (Within 24h)</option>
                  <option value="stat_emergency">STAT Emergency</option>
                </select>
              </div>
              <textarea
                value={escalateData.clinicalReason}
                onChange={(e) => setEscalateData({ ...escalateData, clinicalReason: e.target.value })}
                placeholder="Clinical reason for escalation..."
                className="input-field w-full h-16"
                required
              />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowEscalateModal(false)} className="px-3 py-1.5 border rounded-xl">Cancel</button>
                <button type="submit" className="btn-primary px-4 py-1.5 text-xs">Dispatch Escalation</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
