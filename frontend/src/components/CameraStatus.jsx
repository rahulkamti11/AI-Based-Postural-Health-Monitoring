import React from 'react';
import { Camera, ShieldCheck, AlertCircle } from 'lucide-react';

export function CameraStatus({ analysisMode, contributingCameras = [], isConnected }) {
  const getModeBadgeColor = (mode) => {
    if (!mode) return 'bg-gray-100 text-gray-700 border-gray-300';
    if (mode.includes('Full')) return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    if (mode.includes('Partial')) return 'bg-amber-50 text-amber-700 border-amber-300';
    return 'bg-blue-50 text-blue-700 border-blue-300';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-base">Multi-Camera Stream Status</h3>
            <p className="text-xs text-slate-500">
              Active WebSocket Connection: 
              <span className={`ml-1.5 font-medium ${isConnected ? 'text-emerald-600' : 'text-rose-500'}`}>
                {isConnected ? '● Connected (ws://localhost:8000)' : '○ Disconnected / Reconnecting...'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getModeBadgeColor(analysisMode)}`}>
            {analysisMode || 'Detecting Active Cameras...'}
          </span>

          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <span className="text-xs text-slate-500 font-medium">Contributing Cameras:</span>
            {contributingCameras.length > 0 ? (
              contributingCameras.map(cam => (
                <span key={cam} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium uppercase">
                  {cam}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 font-normal">None</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
