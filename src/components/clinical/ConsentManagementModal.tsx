import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, X, Building2, Calendar, Check, AlertTriangle, 
  Trash2, Lock, Plus, FileText, Activity 
} from 'lucide-react';
import { consentService, ConsentRecord, ConsentScope } from '../../services/clinical/consentService';
import { useAuth } from '../../contexts/AuthContext';

interface ConsentManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_HOSPITALS = [
  { id: 'hosp-1', name: 'Olmera Rajam Care Center' },
  { id: 'hosp-2', name: 'Olmera Vizag Multi-Specialty' },
  { id: 'hosp-3', name: 'Medicover Hospitals - Srikakulam' },
  { id: 'hosp-4', name: 'Queens NRI Hospital Srikakulam' },
  { id: 'hosp-5', name: 'Apollo Hospitals Vizag' }
];

const SCOPES_CONFIG: Array<{ id: ConsentScope; label: string; desc: string }> = [
  { id: 'medical_history', label: 'Past Medical History', desc: 'Diagnoses, chronic conditions, and previous clinical visits' },
  { id: 'diagnostic_reports', label: 'Diagnostic Lab & Imaging', desc: 'Blood panels, biochemistry, radiology, and pathology' },
  { id: 'prescriptions', label: 'Active Prescriptions', desc: 'Current drug regimens, dosages, and adherence logs' },
  { id: 'clinical_notes', label: 'Physician Case Notes', desc: 'Outpatient consultation notes and clinical impressions' },
  { id: 'vitals_telemetry', label: 'Continuous Vitals', desc: 'Blood pressure, glucose monitoring, and wearable telemetry' }
];

export function ConsentManagementModal({ isOpen, onClose }: ConsentManagementModalProps) {
  const { user } = useAuth();
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(AVAILABLE_HOSPITALS[1].id);
  const [selectedScopes, setSelectedScopes] = useState<ConsentScope[]>([
    'medical_history', 'diagnostic_reports', 'prescriptions'
  ]);
  const [validityDays, setValidityDays] = useState(30);
  const [purpose, setPurpose] = useState('Cross-specialty referral review and care continuity');

  useEffect(() => {
    if (user && isOpen) {
      setConsents(consentService.getConsentsForPatient(user.uid));
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const toggleScope = (scope: ConsentScope) => {
    setSelectedScopes(prev => 
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const handleGrantConsent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const hosp = AVAILABLE_HOSPITALS.find(h => h.id === selectedHospital) || AVAILABLE_HOSPITALS[0];
    consentService.grantConsent({
      patientId: user.uid,
      patientName: user.displayName || 'Valued Patient',
      targetHospitalId: hosp.id,
      targetHospitalName: hosp.name,
      scopes: selectedScopes,
      validityDays,
      purposeOfAccess: purpose
    });

    setConsents(consentService.getConsentsForPatient(user.uid));
    setShowGrantForm(false);
  };

  const handleRevoke = (consentId: string) => {
    if (!user) return;
    if (confirm('Revoke this hospital’s access to your medical records? They will immediately lose access to your data.')) {
      consentService.revokeConsent(consentId, user.uid);
      setConsents(consentService.getConsentsForPatient(user.uid));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 font-ui">
      <div className="bg-[var(--color-surface)] text-[var(--color-ink)] w-full max-w-2xl rounded-3xl shadow-2xl border border-[var(--color-line)] max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn">
        
        {/* Header */}
        <div className="p-6 bg-[var(--color-primary)] text-white flex items-center justify-between border-b border-black/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <ShieldCheck size={20} className="text-[var(--color-mist)]" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-white">
                Consent-Based Health Record Sharing
              </h3>
              <p className="text-xs text-[var(--color-mist)] mt-0.5">
                Grant or revoke permission for accredited hospitals to access your records
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            aria-label="Close Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          
          {/* Compliance Banner */}
          <div className="p-4 bg-[var(--color-surface-subtle)] border border-[var(--color-line)] rounded-2xl flex items-start gap-3 text-xs leading-relaxed">
            <Lock size={16} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
            <span>
              <strong>Patient Data Sovereignty:</strong> You retain complete control over who can inspect your EHR. Consents are cryptographically signed, timestamped, and immediately revokable at any moment under DPDP & HIPAA regulations.
            </span>
          </div>

          {!showGrantForm ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Active Facility Permissions ({consents.filter(c => c.status === 'active').length})
                </span>
                <button
                  onClick={() => setShowGrantForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm"
                >
                  <Plus size={14} />
                  <span>Grant New Sharing Consent</span>
                </button>
              </div>

              {consents.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-[var(--color-line)] rounded-2xl">
                  <Building2 size={32} className="mx-auto text-[var(--color-muted)] mb-2" />
                  <p className="text-sm font-semibold text-[var(--color-ink)]">No active hospital consents</p>
                  <p className="text-xs text-[var(--color-muted)] mt-1">
                    Your records are private and only viewable by your primary registered facility.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {consents.map(c => (
                    <div 
                      key={c.id} 
                      className={`p-4 rounded-2xl border transition-all ${
                        c.status === 'active' 
                          ? 'bg-[var(--color-surface)] border-[var(--color-line)] shadow-sm' 
                          : 'bg-[var(--color-surface-subtle)]/60 border-dashed border-[var(--color-line)] opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Building2 size={16} className="text-[var(--color-primary)]" />
                            <h4 className="font-display font-semibold text-sm text-[var(--color-ink)]">
                              {c.targetHospitalName}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              c.status === 'active' 
                                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}>
                              {c.status}
                            </span>
                          </div>

                          <p className="text-xs text-[var(--color-muted)]">
                            Purpose: {c.purposeOfAccess}
                          </p>

                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {c.scopes.map((s, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-[var(--color-surface-subtle)] border border-[var(--color-line)] text-[10px] font-medium rounded-md">
                                {s.replace('_', ' ')}
                              </span>
                            ))}
                          </div>

                          <p className="text-[10px] text-[var(--color-muted)] pt-1">
                            Expires: {new Date(c.expiresAt).toLocaleDateString()} • ID: {c.id}
                          </p>
                        </div>

                        {c.status === 'active' && (
                          <button
                            onClick={() => handleRevoke(c.id)}
                            className="px-3 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Trash2 size={13} />
                            <span>Revoke</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleGrantConsent} className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-line)]">
                <h4 className="font-display font-semibold text-sm">Authorize Hospital Access</h4>
                <button 
                  type="button" 
                  onClick={() => setShowGrantForm(false)} 
                  className="text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Select Accredited Hospital
                </label>
                <select
                  value={selectedHospital}
                  onChange={(e) => setSelectedHospital(e.target.value)}
                  className="input-field w-full text-xs font-semibold"
                >
                  {AVAILABLE_HOSPITALS.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Clinical Data Access Scopes
                </label>
                <div className="space-y-2 pt-1">
                  {SCOPES_CONFIG.map(sc => (
                    <label 
                      key={sc.id} 
                      className="p-3 bg-[var(--color-surface-subtle)] border border-[var(--color-line)] rounded-xl flex items-start gap-3 cursor-pointer hover:bg-[var(--color-surface)] transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(sc.id)}
                        onChange={() => toggleScope(sc.id)}
                        className="mt-0.5 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                      />
                      <div>
                        <span className="font-semibold text-xs text-[var(--color-ink)] block">{sc.label}</span>
                        <span className="text-[11px] text-[var(--color-muted)]">{sc.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Consent Validity Duration
                  </label>
                  <select
                    value={validityDays}
                    onChange={(e) => setValidityDays(Number(e.target.value))}
                    className="input-field w-full text-xs font-semibold"
                  >
                    <option value={7}>7 Days (Single Treatment Episode)</option>
                    <option value={30}>30 Days (Consultation & Follow-up)</option>
                    <option value={90}>90 Days (Quarterly Chronic Care)</option>
                    <option value={365}>1 Year (Long-term Care Program)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Clinical Purpose
                  </label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="input-field w-full text-xs font-semibold"
                    placeholder="e.g. Second opinion consultation"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGrantForm(false)}
                  className="px-4 py-2 border border-[var(--color-line)] rounded-xl text-xs font-semibold"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={selectedScopes.length === 0}
                  className="px-5 py-2 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 shadow-sm"
                >
                  Confirm & Authorize Sharing
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[var(--color-surface-subtle)] border-t border-[var(--color-line)] flex items-center justify-between text-xs text-[var(--color-muted)]">
          <span>Protected under NABH Clinical EHR Protocols</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-line)] text-[var(--color-ink)] rounded-xl font-semibold hover:bg-[var(--color-surface-subtle)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
