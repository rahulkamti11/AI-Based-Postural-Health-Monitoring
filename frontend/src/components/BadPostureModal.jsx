import React from 'react';
import { AlertOctagon, X, CheckCircle2, ShieldAlert } from 'lucide-react';

export function BadPostureModal({
  isOpen,
  onClose,
  postureLabel = 'thoracic_kyphotic_slouch',
  consecutiveBadSeconds = 30
}) {
  if (!isOpen) return null;

  const formatLabel = (lbl) => {
    if (!lbl) return 'Spinal Misalignment';
    return lbl.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="clean-card max-w-md w-full p-6 border-rose-300 shadow-2xl relative bg-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
          title="Dismiss Alert"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 text-rose-600 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
            <AlertOctagon size={28} />
          </div>
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-rose-500">Ergonomic Warning</span>
            <h3 className="font-extrabold text-slate-900 text-lg">Sustained Bad Posture Alert!</h3>
          </div>
        </div>

        <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl p-4 mb-4">
          <p className="text-sm text-slate-800 font-semibold mb-1">
            Detected Misalignment: <span className="text-rose-700 font-bold">{formatLabel(postureLabel)}</span>
          </p>
          <p className="text-xs text-rose-600">
            You have been sitting in bad posture for <strong className="underline">{consecutiveBadSeconds} seconds continuously</strong>. Prolonged misalignment increases spinal strain and risks long-term back/neck pain.
          </p>
        </div>

        <div className="space-y-2 mb-6">
          <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Recommended Posture Corrections</h4>
          <div className="flex items-start gap-2.5 text-xs text-slate-700">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            <span>Sit straight with back supported firmly against your chair lumbar rest.</span>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-slate-700">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            <span>Align shoulders level and keep head directly centered above torso.</span>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-slate-700">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            <span>Take a short 1-minute stretch break to relieve shoulder muscle fatigue.</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
        >
          <ShieldAlert size={18} />
          <span>I Have Corrected My Posture</span>
        </button>
      </div>
    </div>
  );
}

export default BadPostureModal;
