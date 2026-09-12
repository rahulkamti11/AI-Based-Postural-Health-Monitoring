import React from 'react';
import { Activity, ShieldCheck, AlertTriangle, Clock, Target, Cpu } from 'lucide-react';

export function PostureLiveView({ postureData, systemActive, sessionSeconds, goodSeconds, badSeconds }) {
  // Utility to format seconds to HH:MM:SS
  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
  };

  const score = sessionSeconds > 0 ? Math.round((goodSeconds / sessionSeconds) * 100) : 100;
  const isGood = !postureData || postureData.overall_quality === 'good';
  
  let boxClass = 'bg-slate-50 border-slate-200';
  let iconClass = 'bg-slate-200 text-slate-500';
  let titleClass = 'text-slate-800';
  let descClass = 'text-slate-500';
  let Icon = Activity;
  let title = 'System Standby';
  let message = 'Monitoring is currently paused. Click "Start Monitoring" in the header to begin.';
  let showConfidence = false;

  if (systemActive) {
    if (isGood) {
      boxClass = 'bg-emerald-50/50 border-emerald-200';
      iconClass = 'bg-emerald-100 text-emerald-600';
      titleClass = 'text-emerald-800';
      descClass = 'text-emerald-700';
      Icon = ShieldCheck;
      title = 'Optimal Alignment';
    } else {
      boxClass = 'bg-rose-50 border-rose-200';
      iconClass = 'bg-rose-100 text-rose-600 animate-pulse';
      titleClass = 'text-rose-800';
      descClass = 'text-rose-700';
      Icon = AlertTriangle;
      title = 'Posture Risk Detected';
    }
    message = postureData?.feedback?.message || "Current sitting posture is in healthy neutral alignment. Continue maintaining upright spine posture.";
    showConfidence = !!postureData?.quality_confidence;
  }

  const features = postureData?.features || {};

  return (
    <div className={`border rounded-xl p-6 mb-6 shadow-sm transition-colors duration-300 ${boxClass}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/60">
        
        {/* Left Status Area */}
        <div className="flex items-start space-x-4 flex-1">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${iconClass}`}>
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <h3 className={`text-xl font-bold ${titleClass}`}>
                {title}
              </h3>
              {showConfidence && (
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${isGood ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>
                  {Math.round(postureData.quality_confidence * 100)}% CONFIDENCE
                </span>
              )}
            </div>
            <p className={`text-sm font-medium ${descClass}`}>
              {message}
            </p>
          </div>
        </div>

        {/* Right Analytics Area */}
        <div className="flex items-center space-x-6 border-t md:border-t-0 md:border-l border-slate-200/60 pt-4 md:pt-0 md:pl-6">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center"><Clock size={12} className="mr-1"/> Session</span>
            <span className={`text-2xl font-bold ${!systemActive ? 'text-slate-400' : 'text-slate-800'}`}>{formatTime(sessionSeconds || 0)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center"><Target size={12} className="mr-1"/> Score</span>
            <div className="flex items-baseline space-x-1">
              <span className={`text-2xl font-bold ${!systemActive && sessionSeconds === 0 ? 'text-slate-400' : (score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-500' : 'text-rose-600')}`}>
                {sessionSeconds > 0 || systemActive ? `${score}%` : '--'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Live Feature Metrics */}
      <div className="mt-5">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>Live Telemetry Streams</span>
          {systemActive && postureData?.decided_by && (
            <span className="flex items-center text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">
              <Cpu size={10} className="mr-1" />
              {postureData.decided_by.replace(/_/g, ' ')}
            </span>
          )}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/60 border border-slate-200/60 p-3.5 rounded-lg text-center backdrop-blur-sm">
            <p className="text-xs text-slate-500 font-medium">Torso Lean Angle</p>
            <p className={`text-lg font-bold mt-0.5 ${!systemActive ? 'text-slate-400' : 'text-slate-800'}`}>
              {systemActive && features.torso_lateral_lean_angle !== undefined ? `${features.torso_lateral_lean_angle}°` : '--'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">&gt;15° Left / &lt;-15° Right</p>
          </div>

          <div className="bg-white/60 border border-slate-200/60 p-3.5 rounded-lg text-center backdrop-blur-sm">
            <p className="text-xs text-slate-500 font-medium">Shoulder Tilt Angle</p>
            <p className={`text-lg font-bold mt-0.5 ${!systemActive ? 'text-slate-400' : 'text-slate-800'}`}>
              {systemActive && features.shoulder_tilt_angle !== undefined ? `${features.shoulder_tilt_angle}°` : '--'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Level Baseline ≈ -170°</p>
          </div>

          <div className="bg-white/60 border border-slate-200/60 p-3.5 rounded-lg text-center backdrop-blur-sm">
            <p className="text-xs text-slate-500 font-medium">Head Lateral Offset</p>
            <p className={`text-lg font-bold mt-0.5 ${!systemActive ? 'text-slate-400' : 'text-slate-800'}`}>
              {systemActive && features.head_lateral_offset !== undefined ? `${features.head_lateral_offset}` : '--'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Nose vs Shoulder Mid</p>
          </div>

          <div className="bg-white/60 border border-slate-200/60 p-3.5 rounded-lg text-center backdrop-blur-sm">
            <p className="text-xs text-slate-500 font-medium">Symmetry Ratio</p>
            <p className={`text-lg font-bold mt-0.5 ${!systemActive ? 'text-slate-400' : 'text-slate-800'}`}>
              {systemActive && features.shoulder_symmetry_ratio !== undefined ? `${features.shoulder_symmetry_ratio}` : '--'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">L/R Ear Distance Ratio</p>
          </div>
        </div>
      </div>
    </div>
  );
}
