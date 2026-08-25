import React from 'react';
import { Activity, CheckCircle2, AlertTriangle, Cpu, HelpCircle } from 'lucide-react';

export function PostureLiveView({ postureData }) {
  if (!postureData) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-pulse" />
        <p className="text-slate-500 font-medium text-sm">Waiting for live posture stream payload...</p>
      </div>
    );
  }

  const {
    posture_label,
    posture_quality,
    confidence = 0.95,
    decided_by = 'hybrid_fusion',
    rule_triggered,
    features = {}
  } = postureData;

  const isGood = posture_quality === 'good';

  const formatLabel = (lbl) => {
    if (!lbl) return 'Detecting...';
    return lbl.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Current Live Posture State</h2>
          <div className="flex items-center space-x-3 mt-1">
            <h1 className="text-2xl font-bold text-slate-800">{formatLabel(posture_label)}</h1>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
              isGood ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {isGood ? <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> : <AlertTriangle className="w-3.5 h-3.5 mr-1" />}
              {posture_quality ? posture_quality.toUpperCase() : 'UNKNOWN'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-xs text-slate-400 font-medium">Confidence Score</p>
            <p className="text-xl font-extrabold text-slate-700">{Math.round((confidence || 0.95) * 100)}%</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <div>
              <p className="text-[10px] text-slate-400 font-medium uppercase">Decision Layer</p>
              <p className="text-xs font-bold text-slate-700 capitalize">
                {decided_by ? decided_by.replace('_', ' ') : 'Hybrid Engine'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {rule_triggered && (
        <div className="mt-4 p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg flex items-center justify-between text-xs text-indigo-800">
          <span className="font-semibold">Rule Triggered:</span>
          <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-900">{rule_triggered}</span>
        </div>
      )}

      {/* Live Feature Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-lg text-center">
          <p className="text-xs text-slate-500 font-medium">Torso Lean Angle</p>
          <p className="text-lg font-bold text-slate-800 mt-0.5">
            {features.torso_lateral_lean_angle !== undefined ? `${features.torso_lateral_lean_angle}°` : 'N/A'}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">&gt;15° Left / &lt;-15° Right</p>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-lg text-center">
          <p className="text-xs text-slate-500 font-medium">Shoulder Tilt Angle</p>
          <p className="text-lg font-bold text-slate-800 mt-0.5">
            {features.shoulder_tilt_angle !== undefined ? `${features.shoulder_tilt_angle}°` : 'N/A'}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Level Baseline ≈ -170°</p>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-lg text-center">
          <p className="text-xs text-slate-500 font-medium">Head Lateral Offset</p>
          <p className="text-lg font-bold text-slate-800 mt-0.5">
            {features.head_lateral_offset !== undefined ? `${features.head_lateral_offset}` : 'N/A'}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Nose vs Shoulder Mid</p>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-lg text-center">
          <p className="text-xs text-slate-500 font-medium">Symmetry Ratio</p>
          <p className="text-lg font-bold text-slate-800 mt-0.5">
            {features.shoulder_symmetry_ratio !== undefined ? `${features.shoulder_symmetry_ratio}` : 'N/A'}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">L/R Ear Distance Ratio</p>
        </div>
      </div>
    </div>
  );
}
