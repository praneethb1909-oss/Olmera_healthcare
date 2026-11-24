import { useState } from 'react';
import {
  Database, Download, Upload, Copy, Check,
  AlertCircle, CheckCircle2, ShieldCheck, FileCode, RefreshCw
} from 'lucide-react';
import { fhirService, FHIRBundle } from '../../services/clinical/fhirService';

export function AdminFHIRSuite() {
  const [patientId, setPatientId] = useState('demo-patient-001');
  const [patientName, setPatientName] = useState('Priya Sharma');
  const [activeTab, setActiveTab] = useState<'export' | 'ingest'>('export');
  const [exportedBundle, setExportedBundle] = useState<FHIRBundle | null>(null);
  const [importJson, setImportJson] = useState('');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; issues: string[] } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateBundle = () => {
    const bundle = fhirService.exportPatientRecordToFHIR({
      patientId,
      fullName: patientName,
      gender: 'female',
      birthDate: '1989-05-14',
      phone: '+91 98765 43210',
      conditions: [
        {
          code: 'E11.9',
          display: 'Type 2 diabetes mellitus without complications',
          recordedDate: '2025-01-15'
        },
        {
          code: 'I10',
          display: 'Essential (primary) hypertension',
          recordedDate: '2025-01-15'
        }
      ],
      medications: [
        {
          code: '860975',
          display: 'Metformin hydrochloride 500 MG Oral Tablet',
          dosageInstruction: 'Take 1 tablet twice daily with meals'
        },
        {
          code: '197361',
          display: 'Amlodipine 5 MG Oral Tablet',
          dosageInstruction: 'Take 1 tablet once daily in the morning'
        }
      ],
      observations: [
        {
          code: '8480-6',
          display: 'Systolic blood pressure',
          value: 128,
          unit: 'mmHg',
          effectiveDateTime: new Date().toISOString()
        },
        {
          code: '8462-4',
          display: 'Diastolic blood pressure',
          value: 82,
          unit: 'mmHg',
          effectiveDateTime: new Date().toISOString()
        },
        {
          code: '4548-4',
          display: 'Hemoglobin A1c/Hemoglobin.total in Blood',
          value: 6.8,
          unit: '%',
          effectiveDateTime: new Date().toISOString()
        }
      ]
    });

    setExportedBundle(bundle);
  };

  const handleCopyJSON = () => {
    if (!exportedBundle) return;
    navigator.clipboard.writeText(JSON.stringify(exportedBundle, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    if (!exportedBundle) return;
    const blob = new Blob([JSON.stringify(exportedBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FHIR_R4_Export_${patientId}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleValidateBundle = () => {
    if (!importJson.trim()) return;
    try {
      const parsed = JSON.parse(importJson);
      const res = fhirService.validateFHIRBundle(parsed);
      setValidationResult(res);
    } catch (e: any) {
      setValidationResult({
        valid: false,
        issues: [`Syntax Error: Malformed JSON payload - ${e.message}`]
      });
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-ui">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
              HL7 FHIR Release 4
            </span>
            <span className="text-xs text-[var(--color-muted)]">• Cross-Provider Health Information Exchange</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--color-ink)]">
            FHIR R4 Interoperability Suite
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Export standards-compliant clinical documents and validate external electronic health records (EHR).
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] self-start md:self-auto">
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold min-h-[38px] transition-colors ${activeTab === 'export'
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
          >
            Export Record (FHIR R4)
          </button>
          <button
            onClick={() => setActiveTab('ingest')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold min-h-[38px] transition-colors ${activeTab === 'ingest'
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
          >
            Ingest & Validate Bundle
          </button>
        </div>
      </div>

      {activeTab === 'export' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-4 p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] space-y-4 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-[var(--color-ink)]">
              Export Parameters
            </h3>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-ink)]">
                Patient ID
              </label>
              <input
                type="text"
                value={patientId}
                onChange={e => setPatientId(e.target.value)}
                className="w-full p-3 text-xs rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-ink)]">
                Full Name
              </label>
              <input
                type="text"
                value={patientName}
                onChange={e => setPatientName(e.target.value)}
                className="w-full p-3 text-xs rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)] text-xs text-[var(--color-muted)] space-y-1">
              <p className="font-semibold text-[var(--color-ink)]">Included FHIR Resources:</p>
              <p>• Patient (Demographics & Telecom)</p>
              <p>• Condition (ICD-10 coded diagnoses)</p>
              <p>• MedicationRequest (RxNorm active drugs)</p>
              <p>• Observation (LOINC vitals & labs)</p>
            </div>

            <button
              onClick={handleGenerateBundle}
              className="w-full py-3.5 px-4 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold uppercase tracking-wider min-h-[44px] shadow-sm hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <Database size={14} /> Generate Standard FHIR Bundle
            </button>
          </div>

          {/* JSON Viewer */}
          <div className="lg:col-span-8 p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] space-y-4 shadow-sm flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode size={18} className="text-[var(--color-primary)]" />
                <span className="text-xs font-bold text-[var(--color-ink)]">
                  FHIR R4 JSON Bundle Document
                </span>
                {exportedBundle && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    {exportedBundle.entry.length} Entries
                  </span>
                )}
              </div>

              {exportedBundle && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyJSON}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)] min-h-[36px]"
                  >
                    {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={handleDownloadJSON}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold hover:opacity-90 min-h-[36px]"
                  >
                    <Download size={12} /> Download
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 bg-[var(--color-bg)] p-4 rounded-xl border border-[var(--color-line)] font-mono text-[11px] overflow-auto max-h-[500px] text-[var(--color-ink)]">
              {exportedBundle ? (
                <pre>{JSON.stringify(exportedBundle, null, 2)}</pre>
              ) : (
                <div className="h-full flex items-center justify-center text-[var(--color-muted)] text-xs py-12">
                  Click "Generate Standard FHIR Bundle" to serialize patient clinical record.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Ingest & Validation Workspace */
        <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-[var(--color-ink)]">
              Validate External FHIR R4 Bundle
            </h3>
            <button
              onClick={() => {
                setImportJson(JSON.stringify(fhirService.exportPatientRecordToFHIR({
                  patientId: 'ext-8831',
                  fullName: 'Ananya Roy',
                  gender: 'female',
                  birthDate: '1992-08-20',
                  conditions: [{ code: 'J45.909', display: 'Unspecified asthma' }]
                }), null, 2));
              }}
              className="text-xs text-[var(--color-primary)] font-semibold hover:underline"
            >
              Load Sample Partner Bundle
            </button>
          </div>

          <textarea
            value={importJson}
            onChange={e => setImportJson(e.target.value)}
            placeholder="Paste raw FHIR R4 JSON Bundle here..."
            rows={10}
            className="w-full p-4 font-mono text-xs rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-primary)]"
          />

          <div className="flex items-center justify-between">
            <button
              onClick={handleValidateBundle}
              className="py-3 px-6 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold uppercase tracking-wider min-h-[44px] shadow-sm hover:opacity-95 transition-all flex items-center gap-2"
            >
              <ShieldCheck size={14} /> Validate FHIR Schema
            </button>

            {validationResult && (
              <div className="flex items-center gap-2">
                {validationResult.valid ? (
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Compliant FHIR R4 Bundle
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1.5">
                    <AlertCircle size={14} /> Non-Compliant Bundle ({validationResult.issues.length} issues)
                  </span>
                )}
              </div>
            )}
          </div>

          {validationResult && !validationResult.valid && (
            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1.5">
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400">
                Validation Failures:
              </p>
              {validationResult.issues.map((err, i) => (
                <p key={i} className="text-xs text-rose-600 dark:text-rose-300 font-mono">
                  • {err}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
