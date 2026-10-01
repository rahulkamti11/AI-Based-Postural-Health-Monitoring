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
  const isStandby = postureData?.overall_quality === 'standby' || postureData?.posture_label === 'offline';
  
  let boxClass = 'bg-slate-50 border-slate-200';
  let iconClass = 'bg-slate-200 text-slate-500';
  let titleClass = 'text-slate-800';
  let descClass = 'text-slate-500';
  let Icon = Activity;
  let title = 'System Standby';
  let message = 'Monitoring is currently paused. Click "Start Monitoring" in the header to begin.';
  let showConfidence = false;

  if (systemActive) {
    boxClass = 'bg-slate-50 border-slate-200';
    iconClass = 'bg-indigo-100 text-indigo-600';
    titleClass = 'text-slate-800';
    descClass = 'text-slate-500';
    Icon = Activity;
    title = 'Live Posture Monitoring';
    message = postureData?.feedback?.message || 'Analyzing video feeds for ergonomic alignment...';
    showConfidence = false;
  }

  const frontFeats = postureData?.features_used?.front || {};
  const sideFeats = postureData?.features_used?.left || postureData?.features_used?.right || {};

  const isFrontGood = !postureData || postureData.front_quality === 'good';
  const isSideGood = !postureData || postureData.side_quality === 'good';

  return (
    <div className={`border rounded-xl p-6 mb-6 shadow-sm transition-colors duration-300 ${boxClass}`}>
      
      {/* TOP ROW: Overall Title/Message & Analytics */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-slate-200/60">
        
        {/* Title Area */}
        <div className="flex items-start space-x-4 flex-1">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${iconClass}`}>
            <Icon className="w-7 h-7" />
          </div>
          <div className="flex flex-col justify-center pt-1">
            <div className="flex items-center space-x-2">
              <h3 className={`text-xl font-bold ${titleClass}`}>
                {title}
              </h3>
              {systemActive && showConfidence && (
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${isGood ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>
                  {Math.round(postureData.quality_confidence * 100)}% OVERALL
                </span>
              )}
            </div>
            <p className={`text-sm font-medium mt-1 ${descClass}`}>
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

      {/* MIDDLE ROW: DUAL BOXES (Always Visible) */}
      <div className="mt-6 flex flex-col sm:flex-row items-stretch gap-4">
        
        {/* Front Status Box */}
        <div className={`flex-1 flex flex-col p-5 rounded-xl border-2 ${!systemActive || postureData?.front_quality === 'standby' ? 'bg-slate-100 border-slate-200 opacity-70' : (isFrontGood ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200')}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-bold uppercase tracking-widest ${!systemActive || postureData?.front_quality === 'standby' ? 'text-slate-500' : (isFrontGood ? 'text-emerald-600' : 'text-rose-600')}`}>
                Front View
              </span>
            </div>
            {systemActive && postureData?.front_confidence > 0 && postureData?.front_quality !== 'standby' && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isFrontGood ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>
                {Math.round(postureData.front_confidence * 100)}% CONF
              </span>
            )}
          </div>
          
          <div className="flex flex-col">
            <h4 className={`text-2xl font-black uppercase tracking-wide ${!systemActive || postureData?.front_quality === 'standby' ? 'text-slate-600' : (isFrontGood ? 'text-emerald-800' : 'text-rose-800')}`}>
              {!systemActive || postureData?.front_quality === 'standby' ? (postureData?.front_label === 'no_person' ? 'No Person' : 'Standby') : (isFrontGood ? 'Good Posture' : 'Bad Posture')}
            </h4>
            
            {systemActive && postureData?.front_quality !== 'standby' && (
              <span className={`text-sm font-semibold mt-1 capitalize ${isFrontGood ? 'text-emerald-600' : 'text-rose-600'}`}>
                Detected: {postureData?.front_label === 'normal' ? 'Optimal Alignment' : postureData?.front_label?.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            )}
          </div>
        </div>
        
        {/* Side Status Box */}
        <div className={`flex-1 flex flex-col p-5 rounded-xl border-2 ${!systemActive || postureData?.side_quality === 'standby' ? 'bg-slate-100 border-slate-200 opacity-70' : (isSideGood ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200')}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-bold uppercase tracking-widest ${!systemActive || postureData?.side_quality === 'standby' ? 'text-slate-500' : (isSideGood ? 'text-emerald-600' : 'text-rose-600')}`}>
                Side View
              </span>
            </div>
            {systemActive && postureData?.side_confidence > 0 && postureData?.side_quality !== 'standby' && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isSideGood ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>
                {Math.round(postureData.side_confidence * 100)}% CONF
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <h4 className={`text-2xl font-black uppercase tracking-wide ${!systemActive || postureData?.side_quality === 'standby' ? 'text-slate-600' : (isSideGood ? 'text-emerald-800' : 'text-rose-800')}`}>
              {!systemActive || postureData?.side_quality === 'standby' ? (postureData?.side_label === 'no_person' ? 'No Person' : 'Standby') : (isSideGood ? 'Good Posture' : 'Bad Posture')}
            </h4>
            
            {systemActive && postureData?.side_quality !== 'standby' && (
              <span className={`text-sm font-semibold mt-1 capitalize ${isSideGood ? 'text-emerald-600' : 'text-rose-600'}`}>
                Detected: {postureData?.side_label === 'normal' ? 'Optimal Alignment' : postureData?.side_label?.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Live Biomechanical Telemetry */}
      <div className="mt-5">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>Live Biomechanical Telemetry</span>
          {systemActive && postureData?.decided_by && (
            <span className="flex items-center text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">
              <Cpu size={10} className="mr-1" />
              {postureData.decided_by.replace(/_/g, ' ')}
            </span>
          )}
        </h4>

        {/* Front Camera Telemetry */}
        <div className="mb-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
            Front View Metrics (Coronal Plane)
          </span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/60 border border-slate-200/60 p-3.5 rounded-lg text-center backdrop-blur-sm">
              <p className="text-xs text-slate-500 font-medium">Torso Lateral Lean</p>
              <p className={`text-lg font-bold mt-0.5 ${!systemActive || frontFeats.torso_lean_abs === undefined ? 'text-slate-400' : 'text-slate-800'}`}>
                {systemActive && frontFeats.torso_lean_abs !== undefined ? `${frontFeats.torso_lean_abs}°` : '--'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Threshold: &gt; 15.0° alert</p>
            </div>

            <div className="bg-white/60 border border-slate-200/60 p-3.5 rounded-lg text-center backdrop-blur-sm">
              <p className="text-xs text-slate-500 font-medium">Shoulder Tilt Angle</p>
              <p className={`text-lg font-bold mt-0.5 ${!systemActive || frontFeats.shoulder_tilt_abs === undefined ? 'text-slate-400' : 'text-slate-800'}`}>
                {systemActive && frontFeats.shoulder_tilt_abs !== undefined ? `${frontFeats.shoulder_tilt_abs}°` : '--'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Level Baseline: 0.0°</p>
            </div>

            <div className="bg-white/60 border border-slate-200/60 p-3.5 rounded-lg text-center backdrop-blur-sm">
              <p className="text-xs text-slate-500 font-medium">Head Lateral Offset</p>
              <p className={`text-lg font-bold mt-0.5 ${!systemActive || frontFeats.head_lateral_offset_norm === undefined ? 'text-slate-400' : 'text-slate-800'}`}>
                {systemActive && frontFeats.head_lateral_offset_norm !== undefined ? `${frontFeats.head_lateral_offset_norm}` : '--'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Norm. by Shoulder Width</p>
            </div>

            <div className="bg-white/60 border border-slate-200/60 p-3.5 rounded-lg text-center backdrop-blur-sm">
              <p className="text-xs text-slate-500 font-medium">Symmetry Deviation</p>
              <p className={`text-lg font-bold mt-0.5 ${!systemActive || frontFeats.shoulder_symmetry_deviation === undefined ? 'text-slate-400' : 'text-slate-800'}`}>
                {systemActive && frontFeats.shoulder_symmetry_deviation !== undefined ? `${frontFeats.shoulder_symmetry_deviation}` : '--'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">0.0 = Balanced Shoulders</p>
            </div>
          </div>
        </div>

        {/* Side Camera Telemetry */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
            Side View Metrics (Sagittal Plane)
          </span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/60 border border-slate-200/60 p-3.5 rounded-lg text-center backdrop-blur-sm">
              <p className="text-xs text-slate-500 font-medium">Cervical Neck Angle</p>
              <p className={`text-lg font-bold mt-0.5 ${!systemActive || sideFeats.neck_angle_abs === undefined ? 'text-slate-400' : 'text-slate-800'}`}>
                {systemActive && sideFeats.neck_angle_abs !== undefined ? `${sideFeats.neck_angle_abs}°` : '--'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Text-Neck &ge; 45.0°</p>
            </div>

            <div className="bg-white/60 border border-slate-200/60 p-3.5 rounded-lg text-center backdrop-blur-sm">
              <p className="text-xs text-slate-500 font-medium">Torso Recline Angle</p>
              <p className={`text-lg font-bold mt-0.5 ${!systemActive || sideFeats.torso_lean_abs === undefined ? 'text-slate-400' : 'text-slate-800'}`}>
                {systemActive && sideFeats.torso_lean_abs !== undefined ? `${sideFeats.torso_lean_abs}°` : '--'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Sliding Down &ge; 20.0°</p>
            </div>

            <div className="bg-white/60 border border-slate-200/60 p-3.5 rounded-lg text-center backdrop-blur-sm">
              <p className="text-xs text-slate-500 font-medium">Head Forward Norm.</p>
              <p className={`text-lg font-bold mt-0.5 ${!systemActive || sideFeats.head_forward_norm === undefined ? 'text-slate-400' : 'text-slate-800'}`}>
                {systemActive && sideFeats.head_forward_norm !== undefined ? `${sideFeats.head_forward_norm}` : '--'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Norm. by Torso Length</p>
            </div>

            <div className="bg-white/60 border border-slate-200/60 p-3.5 rounded-lg text-center backdrop-blur-sm">
              <p className="text-xs text-slate-500 font-medium">Spine Deviation Angle</p>
              <p className={`text-lg font-bold mt-0.5 ${!systemActive || sideFeats.spine_deviation_angle === undefined ? 'text-slate-400' : 'text-slate-800'}`}>
                {systemActive && sideFeats.spine_deviation_angle !== undefined ? `${sideFeats.spine_deviation_angle}°` : '--'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Thoracic Kyphosis Angle</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
