import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush } from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';

// Custom Tooltip to show posture quality status
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const isGood = payload[0].payload.quality === 'good';
    return (
      <div className="bg-white p-3 rounded-lg shadow-md border border-slate-200 text-sm">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        <p className="text-indigo-600">Torso Lean: {payload[0].value}°</p>
        <p className="text-rose-500">Shoulder Dev: {payload[1].value}°</p>
        <p className={`mt-2 font-bold ${isGood ? 'text-emerald-600' : 'text-rose-600'}`}>
          Status: {isGood ? 'GOOD POSTURE' : 'BAD POSTURE'}
        </p>
      </div>
    );
  }
  return null;
};

export function PostureHistoryChart({ historyData = [] }) {
  const chartData = historyData.map((item, idx) => ({
    time: new Date(item.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    torsoLean: item.features?.torso_lateral_lean_angle || 0,
    shoulderTilt: item.features?.shoulder_tilt_angle !== undefined ? (item.features.shoulder_tilt_angle + 170) : 0,
    quality: item.overall_quality || 'good'
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <LineChartIcon className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-800 text-base">Session Posture Trend Summary</h3>
        </div>
        <span className="text-xs font-medium text-slate-400">Total Frames Captured: {chartData.length}</span>
      </div>

      <div className="h-80 w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTorso" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTilt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
              <YAxis domain={[-45, 45]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} unit="°" />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="torsoLean" name="Torso Lean Angle (°)" stroke="#6366f1" fillOpacity={1} fill="url(#colorTorso)" strokeWidth={2} />
              <Area type="monotone" dataKey="shoulderTilt" name="Shoulder Tilt Dev (°)" stroke="#f43f5e" fillOpacity={1} fill="url(#colorTilt)" strokeWidth={2} />
              <Brush 
                dataKey="time" 
                height={30} 
                stroke="#818cf8"
                fill="#f8fafc"
                tickFormatter={() => ''}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Accumulating live stream data points...
          </div>
        )}
      </div>
    </div>
  );
}
