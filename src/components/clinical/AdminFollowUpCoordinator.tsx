import { useState, useEffect } from 'react';
import { 
  AlertTriangle, Calendar, CheckCircle2, Clock, Send, 
  User, RefreshCw, Filter, ShieldAlert, Sparkles, MessageSquare, Phone
} from 'lucide-react';
import { 
  followUpService, 
  FollowUpCase, 
  FollowUpRecallChannel 
} from '../../services/clinical/followUpService';

export function AdminFollowUpCoordinator() {
  const [cases, setCases] = useState<FollowUpCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<FollowUpCase | null>(null);
  const [filterRisk, setFilterRisk] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [selectedChannel, setSelectedChannel] = useState<FollowUpRecallChannel>('whatsapp');
  const [customNotes, setCustomNotes] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const reloadCases = () => {
    const list = followUpService.getFollowUpCases();
    setCases(list);
    if (!selectedCase && list.length > 0) {
      setSelectedCase(list[0]);
    } else if (selectedCase) {
      const refreshed = list.find(c => c.id === selectedCase.id);
      if (refreshed) setSelectedCase(refreshed);
    }
  };

  useEffect(() => {
    reloadCases();
  }, []);

  const overdueCount = followUpService.getOverdueCases().length;
  const highRiskCount = cases.filter(c => c.riskScore >= 70).length;

  const filteredCases = cases.filter(c => {
    if (filterRisk === 'high') return c.riskScore >= 70;
    if (filterRisk === 'medium') return c.riskScore >= 40 && c.riskScore < 70;
    if (filterRisk === 'low') return c.riskScore < 40;
    return true;
  });

  const handleSendRecall = async () => {
    if (!selectedCase) return;
    setIsSending(true);
    try {
      await followUpService.triggerRecallNotification(
        selectedCase.id, 
        selectedChannel, 
        customNotes || undefined
      );
      setSuccessToast(`Automated recall sent to ${selectedCase.patientName} via ${selectedChannel.toUpperCase()}`);
      reloadCases();
      setCustomNotes('');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (e: any) {
      console.error('Failed to trigger recall:', e);
    } finally {
      setIsSending(false);
    }
  };

  const getRiskBadge = (score: number) => {
    if (score >= 70) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
          <ShieldAlert size={12} /> High Priority ({score})
        </span>
      );
    }
    if (score >= 40) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
          Moderate ({score})
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
        Routine ({score})
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn font-ui">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
              Follow-Up & Chronic Disease Automation
            </span>
            <span className="text-xs text-[var(--color-muted)]">• AI Prioritization</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--color-ink)]">
            Patient Recall & Priority Coordinator
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Automatically detect care drop-offs, flag non-adherent chronic cases, and trigger automated reminders.
          </p>
        </div>

        <button
          onClick={reloadCases}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] text-xs font-semibold hover:bg-[var(--color-surface-subtle)] min-h-[44px] transition-colors self-start md:self-auto"
        >
          <RefreshCw size={14} /> Refresh Clinical Registry
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Active Cohort</span>
            <Calendar size={18} className="text-[var(--color-primary)]" />
          </div>
          <p className="text-2xl font-bold font-display text-[var(--color-ink)]">{cases.length}</p>
          <p className="text-[11px] text-[var(--color-muted)] mt-1">Scheduled for follow-up review</p>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Overdue Recalls</span>
            <AlertTriangle size={18} className="text-[var(--color-accent)]" />
          </div>
          <p className="text-2xl font-bold font-display text-[var(--color-accent)]">{overdueCount}</p>
          <p className="text-[11px] text-[var(--color-muted)] mt-1">Lapsed beyond recommended window</p>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">High Risk Watchlist</span>
            <ShieldAlert size={18} className="text-rose-500" />
          </div>
          <p className="text-2xl font-bold font-display text-rose-600 dark:text-rose-400">{highRiskCount}</p>
          <p className="text-[11px] text-[var(--color-muted)] mt-1">Severe vitals or missed medications</p>
        </div>
      </div>

      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          {successToast}
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Patient Recall List (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)]">
              <Filter size={14} /> Filter Risk:
            </div>
            <div className="flex gap-1">
              {(['all', 'high', 'medium', 'low'] as const).map(tier => (
                <button
                  key={tier}
                  onClick={() => setFilterRisk(tier)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize min-h-[36px] transition-colors ${
                    filterRisk === tier
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-subtle)]'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredCases.map(c => {
              const isSelected = selectedCase?.id === c.id;
              const isOverdue = new Date(c.recommendedDate) < new Date();

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--color-surface)] border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 shadow-sm'
                      : 'bg-[var(--color-surface)] border-[var(--color-line)] hover:border-[var(--color-primary)]/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-[var(--color-ink)]">{c.patientName}</h4>
                        <span className="text-[10px] text-[var(--color-muted)] font-mono">{c.patientPhone}</span>
                      </div>
                      <p className="text-xs text-[var(--color-muted)]">{c.primaryCondition}</p>
                    </div>
                    {getRiskBadge(c.riskScore)}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-muted)] pt-2 border-t border-[var(--color-line)]">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock size={12} className={isOverdue ? 'text-[var(--color-accent)]' : ''} />
                      Due: {c.recommendedDate} {isOverdue && <span className="text-[var(--color-accent)] font-bold">(Overdue)</span>}
                    </span>
                    <span>•</span>
                    <span>Last visit: {c.lastVisitDate}</span>
                    <span>•</span>
                    <span>Dr. {c.attendingDoctorName}</span>
                  </div>

                  {c.riskFactors.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {c.riskFactors.map((factor, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] bg-[var(--color-surface-subtle)] border border-[var(--color-line)] text-[var(--color-ink)]"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Recall Dispatch & Timeline Drawer (5 Cols) */}
        <div className="lg:col-span-5">
          {selectedCase ? (
            <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] space-y-5 sticky top-6 shadow-sm">
              <div className="border-b border-[var(--color-line)] pb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Recall Dispatch Hub
                  </span>
                  {getRiskBadge(selectedCase.riskScore)}
                </div>
                <h3 className="font-display text-xl font-semibold text-[var(--color-ink)]">
                  {selectedCase.patientName}
                </h3>
                <p className="text-xs text-[var(--color-muted)]">
                  Target: {selectedCase.primaryCondition} • Clinic: {selectedCase.hospitalName}
                </p>
              </div>

              {/* Clinical AI Assessment */}
              <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)] space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary)]">
                  <Sparkles size={14} /> AI Follow-Up Priority Assessment
                </div>
                <p className="text-xs text-[var(--color-ink)] leading-relaxed">
                  Patient exhibits a composite risk score of <strong className="text-[var(--color-primary)]">{selectedCase.riskScore}/100</strong>. Key clinical indicators require active follow-up consultation with Dr. {selectedCase.attendingDoctorName}.
                </p>
                <div className="space-y-1 pt-1">
                  {selectedCase.riskFactors.map((factor, i) => (
                    <div key={i} className="text-[11px] text-[var(--color-muted)] flex items-start gap-1.5">
                      <span className="text-[var(--color-accent)] font-bold">•</span>
                      <span>{factor}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recall Channel Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-[var(--color-ink)]">
                  Communication Channel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['whatsapp', 'sms', 'email'] as const).map(channel => (
                    <button
                      key={channel}
                      type="button"
                      onClick={() => setSelectedChannel(channel)}
                      className={`p-3 rounded-xl border text-xs font-semibold capitalize flex flex-col items-center gap-1.5 min-h-[44px] transition-all ${
                        selectedChannel === channel
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-subtle)] text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]'
                          : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-surface-subtle)]'
                      }`}
                    >
                      {channel === 'whatsapp' && <MessageSquare size={16} />}
                      {channel === 'sms' && <Phone size={16} />}
                      {channel === 'email' && <Send size={16} />}
                      {channel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Doctor's Note */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--color-ink)]">
                  Clinical Note / Custom Instructions (Optional)
                </label>
                <textarea
                  value={customNotes}
                  onChange={e => setCustomNotes(e.target.value)}
                  placeholder="e.g. Please bring fasting blood sugar logbook from the last 7 days."
                  rows={3}
                  className="w-full p-3 text-xs rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              {/* Dispatch Action */}
              <button
                type="button"
                onClick={handleSendRecall}
                disabled={isSending}
                className="w-full py-3.5 px-4 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold uppercase tracking-wider min-h-[44px] shadow-sm hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Dispatching Recall...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Send Clinical Recall Notice
                  </>
                )}
              </button>

              {/* Historical Log */}
              {selectedCase.recallLogs.length > 0 && (
                <div className="pt-3 border-t border-[var(--color-line)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Recent Outreach History
                  </span>
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {selectedCase.recallLogs.map(log => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-line)] text-[11px] flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-[var(--color-ink)] uppercase">
                            {log.channel}
                          </span>
                          <p className="text-[10px] text-[var(--color-muted)]">
                            {new Date(log.dispatchedAt).toLocaleString()}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 capitalize">
                          {log.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] text-[var(--color-muted)] text-xs">
              Select a patient from the cohort list to review clinical indicators and trigger a recall notice.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
