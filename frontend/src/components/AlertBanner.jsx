import React from 'react';
import { AlertCircle, HeartPulse, Info } from 'lucide-react';

export function AlertBanner({ postureData }) {
  if (!postureData || postureData.posture_quality === 'good' || !postureData.health_message) {
    return (
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 mb-6 flex items-center space-x-3 text-emerald-800">
        <HeartPulse className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <p className="text-xs md:text-sm font-medium">
          <strong className="font-semibold">Optimal Ergonomic Alignment:</strong> Current sitting posture is in healthy neutral alignment. Continue maintaining upright spine posture.
        </p>
      </div>
    );
  }

  const { posture_label, health_message } = postureData;

  return (
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 flex items-start space-x-3 text-rose-900 shadow-sm animate-pulse">
      <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700">Posture Risk Warning</h4>
        <p className="text-xs md:text-sm font-medium text-rose-900 mt-0.5">
          {health_message}
        </p>
      </div>
    </div>
  );
}
