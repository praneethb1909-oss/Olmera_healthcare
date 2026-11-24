import React from 'react';
import { TrendingUp, Activity, Calendar, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export interface ProgressDataPoint {
  visitDate: string;
  doctorName: string;
  systolicBp: number;
  diastolicBp: number;
  fastingGlucose: number;
  weightKg: number;
  clinicalNote: string;
}

interface LongitudinalProgressChartProps {
  patientName: string;
  history?: ProgressDataPoint[];
}

export function LongitudinalProgressChart({ 
  patientName,
  history = [
    {
      visitDate: '2026-08-15',
      doctorName: 'Dr. A Suresh',
      systolicBp: 138,
      diastolicBp: 88,
      fastingGlucose: 118,
      weightKg: 71.2,
      clinicalNote: 'Initial diagnosis of borderline stage 1 hypertension; commenced lifestyle modification and 40mg Telmisartan.'
    },
    {
      visitDate: '2026-09-20',
      doctorName: 'Dr. A Suresh',
      systolicBp: 130,
      diastolicBp: 84,
      fastingGlucose: 108,
      weightKg: 70.0,
      clinicalNote: 'Improved dietary sodium compliance; morning BP trended down.'
    },
    {
      visitDate: '2026-10-25',
      doctorName: 'Dr. Anita Tripathy',
      systolicBp: 124,
      diastolicBp: 82,
      fastingGlucose: 102,
      weightKg: 69.1,
      clinicalNote: 'Good medication adherence. Added 30-min evening brisk walking.'
    },
    {
      visitDate: '2026-11-20',
      doctorName: 'Dr. A Suresh',
      systolicBp: 120,
      diastolicBp: 80,
      fastingGlucose: 96,
      weightKg: 68.5,
      clinicalNote: 'Target clinical thresholds achieved. Vitals stable at optimal 120/80 mmHg and normal glycemic index.'
    }
  ]
}: LongitudinalProgressChartProps) {
  const latest = history[history.length - 1];
  const initial = history[0];

  const bpDiff = latest.systolicBp - initial.systolicBp;
  const glucoseDiff = latest.fastingGlucose - initial.fastingGlucose;
  const weightDiff = (latest.weightKg - initial.weightKg).toFixed(1);

  return (
    <div className="space-y-4 font-ui text-[var(--color-ink)] animate-fadeIn">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-line)]">
        <div>
          <h4 className="font-display font-semibold text-sm text-[var(--color-ink)] flex items-center gap-2">
            <TrendingUp size={16} className="text-[var(--color-primary)]" />
            Longitudinal Clinical Progress Trajectory (Multi-Visit)
          </h4>
          <p className="text-[11px] text-[var(--color-muted)]">
            Tracking therapeutic efficacy across consecutive clinical encounters for {patientName}
          </p>
        </div>

        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold">
          Therapeutic Response Positive
        </span>
      </div>

      {/* Trajectory Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] block">
            Systolic BP Trend
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display font-semibold text-lg text-[var(--color-ink)]">
              {latest.systolicBp} <span className="text-xs font-normal text-[var(--color-muted)]">mmHg</span>
            </span>
            <span className="flex items-center text-xs font-semibold text-emerald-600">
              <ArrowDownRight size={14} /> {Math.abs(bpDiff)} mmHg
            </span>
          </div>
          <span className="text-[10px] text-[var(--color-muted)]">From initial {initial.systolicBp} mmHg</span>
        </div>

        <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] block">
            Fasting Glucose Trend
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display font-semibold text-lg text-[var(--color-ink)]">
              {latest.fastingGlucose} <span className="text-xs font-normal text-[var(--color-muted)]">mg/dL</span>
            </span>
            <span className="flex items-center text-xs font-semibold text-emerald-600">
              <ArrowDownRight size={14} /> {Math.abs(glucoseDiff)} mg/dL
            </span>
          </div>
          <span className="text-[10px] text-[var(--color-muted)]">From initial {initial.fastingGlucose} mg/dL</span>
        </div>

        <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] block">
            Weight Trajectory
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display font-semibold text-lg text-[var(--color-ink)]">
              {latest.weightKg} <span className="text-xs font-normal text-[var(--color-muted)]">kg</span>
            </span>
            <span className="flex items-center text-xs font-semibold text-emerald-600">
              <ArrowDownRight size={14} /> {Math.abs(Number(weightDiff))} kg
            </span>
          </div>
          <span className="text-[10px] text-[var(--color-muted)]">From initial {initial.weightKg} kg</span>
        </div>
      </div>

      {/* Visual Timeline Chart Grid */}
      <div className="space-y-2 pt-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] block">
          Visit Chronology & Clinical Adjustments
        </span>

        <div className="space-y-2">
          {history.map((pt, idx) => (
            <div 
              key={idx}
              className="p-3.5 bg-[var(--color-surface-subtle)] border border-[var(--color-line)] rounded-xl flex items-start justify-between gap-4 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-[var(--color-primary)]">
                    {pt.visitDate}
                  </span>
                  <span className="text-[var(--color-muted)]">•</span>
                  <span className="font-semibold text-[var(--color-ink)]">Attending: {pt.doctorName}</span>
                </div>
                <p className="text-[11px] text-[var(--color-muted)] italic leading-relaxed">
                  "{pt.clinicalNote}"
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-right font-mono text-[11px]">
                <div className="p-1.5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg">
                  <span className="text-[9px] text-[var(--color-muted)] block uppercase">BP</span>
                  <span className="font-semibold">{pt.systolicBp}/{pt.diastolicBp}</span>
                </div>
                <div className="p-1.5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg">
                  <span className="text-[9px] text-[var(--color-muted)] block uppercase">Glucose</span>
                  <span className="font-semibold">{pt.fastingGlucose}</span>
                </div>
                <div className="p-1.5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg">
                  <span className="text-[9px] text-[var(--color-muted)] block uppercase">Weight</span>
                  <span className="font-semibold">{pt.weightKg}k</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
