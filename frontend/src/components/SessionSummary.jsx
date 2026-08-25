import React from 'react';
import { Clock, ShieldCheck, AlertTriangle, Activity } from 'lucide-react';

export function SessionSummary({
  sessionSeconds = 0,
  goodSeconds = 0,
  badSeconds = 0,
  badPostureInstances = 0,
  mostFrequentBadLabel = 'None'
}) {
  const formatTime = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalTracked = goodSeconds + badSeconds;
  const score = totalTracked > 0 ? Math.round((goodSeconds / totalTracked) * 100) : 100;

  const scoreColor = score >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                     score >= 60 ? 'text-amber-600 bg-amber-50 border-amber-200' :
                     'text-rose-600 bg-rose-50 border-rose-200';

  const formatLabel = (lbl) => {
    if (!lbl || lbl === 'None' || lbl === 'neutral_spinal_alignment') return 'Optimal Spine Alignment';
    return lbl.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="clean-card p-6 mb-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Activity size={22} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Active Ergonomic Session Analytics</h3>
            <p className="text-xs text-slate-500">Real-time health score and continuous monitoring summary</p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-xl border font-bold text-sm flex items-center gap-2 ${scoreColor}`}>
          <ShieldCheck size={18} />
          <span>Posture Score: {score}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Session Timer */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Session Duration</span>
            <Clock size={16} className="text-indigo-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono">{formatTime(sessionSeconds)}</p>
          <span className="text-[11px] text-slate-400 mt-1">Continuous Monitoring</span>
        </div>

        {/* Good vs Bad Ratio */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Good vs Bad Ratio</span>
            <ShieldCheck size={16} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600">{formatTime(goodSeconds)}</span>
            <span className="text-xs font-bold text-slate-400">/ {formatTime(badSeconds)}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${score}%` }}></div>
          </div>
        </div>

        {/* Bad Posture Instances */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Bad Posture Alerts</span>
            <AlertTriangle size={16} className="text-rose-500" />
          </div>
          <p className="text-2xl font-extrabold text-rose-600">{badPostureInstances} <span className="text-xs font-normal text-slate-500">events</span></p>
          <span className="text-[11px] text-slate-400 mt-1">Continuous Misalignments</span>
        </div>

        {/* Primary Misalignment Risk */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Top Misalignment Risk</span>
            <Activity size={16} className="text-amber-500" />
          </div>
          <p className="text-sm font-bold text-slate-800 line-clamp-1">{formatLabel(mostFrequentBadLabel)}</p>
          <span className="text-[11px] text-slate-400 mt-1">Most Frequent Posture Strain</span>
        </div>
      </div>
    </div>
  );
}

export default SessionSummary;
