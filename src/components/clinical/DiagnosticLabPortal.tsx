import { useState, useEffect } from 'react';
import { 
  TestTube2, CheckCircle2, Clock, UploadCloud, Plus, 
  FileCheck, AlertCircle, RefreshCw, User, Sparkles
} from 'lucide-react';
import { 
  partnerService, 
  DiagnosticRequisition, 
  StructuredBiomarker 
} from '../../services/clinical/partnerService';

export function DiagnosticLabPortal() {
  const [requisitions, setRequisitions] = useState<DiagnosticRequisition[]>([]);
  const [selectedReq, setSelectedReq] = useState<DiagnosticRequisition | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [summaryReport, setSummaryReport] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Structured Biomarkers Form
  const [biomarkers, setBiomarkers] = useState<StructuredBiomarker[]>([
    { name: 'Fasting Blood Sugar (FBS)', value: '118', unit: 'mg/dL', referenceRange: '70 - 100', status: 'high' },
    { name: 'HbA1c', value: '6.4', unit: '%', referenceRange: '< 5.7', status: 'high' },
    { name: 'Serum Creatinine', value: '0.9', unit: 'mg/dL', referenceRange: '0.6 - 1.2', status: 'normal' }
  ]);

  const reloadData = () => {
    const list = partnerService.getRequisitions();
    setRequisitions(list);
    if (!selectedReq && list.length > 0) {
      setSelectedReq(list[0]);
    } else if (selectedReq) {
      const refreshed = list.find(r => r.id === selectedReq.id);
      if (refreshed) setSelectedReq(refreshed);
    }
  };

  useEffect(() => {
    reloadData();
  }, []);

  const handleUpdateStatus = (status: DiagnosticRequisition['status']) => {
    if (!selectedReq) return;
    partnerService.updateRequisitionStatus(selectedReq.id, status);
    reloadData();
  };

  const handlePublishResults = async () => {
    if (!selectedReq) return;
    setIsSubmitting(true);
    try {
      partnerService.uploadDiagnosticReport(
        selectedReq.id,
        biomarkers,
        summaryReport || `Complete ${selectedReq.testName} analysis finalized.`
      );
      setSuccessToast(`Report successfully dispatched to ${selectedReq.patientName}'s clinical health record.`);
      reloadData();
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Failed to publish report:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddBiomarkerRow = () => {
    setBiomarkers(prev => [
      ...prev,
      { name: '', value: '', unit: '', referenceRange: '', status: 'normal' }
    ]);
  };

  const handleBiomarkerChange = (index: number, field: keyof StructuredBiomarker, val: string) => {
    setBiomarkers(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const filtered = requisitions.filter(r => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn font-ui">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
              Diagnostic Lab Network Partner
            </span>
            <span className="text-xs text-[var(--color-muted)]">• Metropolis & PathKind Integration</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--color-ink)]">
            Laboratory Coordination & Diagnostic Publishing
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Manage sample logistics, input structured biomarker values, and publish verified reports into patient digital records.
          </p>
        </div>

        <button
          onClick={reloadData}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] text-xs font-semibold hover:bg-[var(--color-surface-subtle)] min-h-[44px] transition-colors self-start md:self-auto"
        >
          <RefreshCw size={14} /> Refresh Requisitions
        </button>
      </div>

      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          {successToast}
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Requisition Queue (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)]">
            <span className="text-xs font-semibold text-[var(--color-muted)]">Filter Status:</span>
            <div className="flex gap-1">
              {(['all', 'pending', 'sample_collected', 'processing', 'completed'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize min-h-[32px] transition-colors ${
                    filterStatus === s
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-subtle)]'
                  }`}
                >
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map(req => {
              const isSelected = selectedReq?.id === req.id;
              return (
                <div
                  key={req.id}
                  onClick={() => setSelectedReq(req)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--color-surface)] border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 shadow-sm'
                      : 'bg-[var(--color-surface)] border-[var(--color-line)] hover:border-[var(--color-primary)]/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h4 className="font-semibold text-sm text-[var(--color-ink)]">{req.patientName}</h4>
                      <p className="text-xs text-[var(--color-primary)] font-medium">{req.testName}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-surface-subtle)] border border-[var(--color-line)] text-[var(--color-ink)]">
                      {req.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--color-muted)] pt-2 border-t border-[var(--color-line)]">
                    <span>Requisition ID: {req.id}</span>
                    <span>Requested: {new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Biomarker Entry & Report Publishing (7 Cols) */}
        <div className="lg:col-span-7">
          {selectedReq ? (
            <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] space-y-5 shadow-sm">
              <div className="border-b border-[var(--color-line)] pb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                      Order Requisition #{selectedReq.id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 capitalize">
                      {selectedReq.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-[var(--color-ink)]">
                    {selectedReq.testName}
                  </h3>
                  <p className="text-xs text-[var(--color-muted)]">
                    Patient: {selectedReq.patientName} • Referring Doctor: Dr. {selectedReq.referringDoctorName}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 items-end">
                  <span className="text-[10px] text-[var(--color-muted)] font-medium">Lifecycle Stage:</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('sample_collected')}
                      className="px-2.5 py-1 text-[11px] rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-[var(--color-ink)] hover:bg-[var(--color-primary-subtle)]"
                    >
                      Sample Collected
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('processing')}
                      className="px-2.5 py-1 text-[11px] rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-[var(--color-ink)] hover:bg-[var(--color-primary-subtle)]"
                    >
                      Processing
                    </button>
                  </div>
                </div>
              </div>

              {/* Structured Biomarkers Entry Form */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-1.5">
                    <TestTube2 size={14} className="text-[var(--color-primary)]" /> Structured Biomarker Measurements
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddBiomarkerRow}
                    className="text-xs text-[var(--color-primary)] font-semibold flex items-center gap-1 hover:underline"
                  >
                    <Plus size={14} /> Add Parameter
                  </button>
                </div>

                <div className="space-y-2">
                  {biomarkers.map((bm, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 p-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)] text-xs">
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={bm.name}
                          onChange={e => handleBiomarkerChange(idx, 'name', e.target.value)}
                          placeholder="Test / Analyte Name"
                          className="w-full p-2 text-xs rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-ink)]"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={bm.value}
                          onChange={e => handleBiomarkerChange(idx, 'value', e.target.value)}
                          placeholder="Observed"
                          className="w-full p-2 text-xs rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-ink)] font-bold text-[var(--color-primary)]"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={bm.unit}
                          onChange={e => handleBiomarkerChange(idx, 'unit', e.target.value)}
                          placeholder="Units"
                          className="w-full p-2 text-xs rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-ink)]"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={bm.referenceRange}
                          onChange={e => handleBiomarkerChange(idx, 'referenceRange', e.target.value)}
                          placeholder="Ref Range"
                          className="w-full p-2 text-xs rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-ink)]"
                        />
                      </div>
                      <div className="col-span-2">
                        <select
                          value={bm.status}
                          onChange={e => handleBiomarkerChange(idx, 'status', e.target.value)}
                          className="w-full p-2 text-xs rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-ink)] font-medium"
                        >
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lab Summary & Pathologist Sign-off */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--color-ink)]">
                  Pathologist Clinical Summary / Remarks
                </label>
                <textarea
                  value={summaryReport}
                  onChange={e => setSummaryReport(e.target.value)}
                  placeholder="e.g. Findings indicate borderline glycemic elevation. Advise physician correlation."
                  rows={3}
                  className="w-full p-3 text-xs rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              {/* Publish Action Button */}
              <button
                type="button"
                onClick={handlePublishResults}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold uppercase tracking-wider min-h-[44px] shadow-sm hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Verifying & Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud size={16} /> Publish Report to Patient Record
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] text-[var(--color-muted)] text-xs">
              Select an open requisition to capture laboratory biomarkers and sign off clinical results.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
