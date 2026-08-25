import React, { useState, useEffect } from 'react';
import { postureSocket } from '../services/websocketClient';
import { CameraStatus } from '../components/CameraStatus';
import { PostureLiveView } from '../components/PostureLiveView';
import { AlertBanner } from '../components/AlertBanner';
import { PostureHistoryChart } from '../components/PostureHistoryChart';
import { Shield, Sparkles, RefreshCw } from 'lucide-react';

export function Dashboard() {
  const [postureData, setPostureData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    postureSocket.connect();

    const unsubscribeStatus = postureSocket.subscribeStatus((status) => {
      setIsConnected(status === 'connected');
    });

    const unsubscribeMessage = postureSocket.subscribe((data) => {
      setPostureData(data);
      if (data.timestamp && data.features) {
        setHistory((prev) => {
          const updated = [...prev, data];
          return updated.slice(-30); // Keep last 30 frames (~6 seconds at 5 FPS)
        });
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeMessage();
      postureSocket.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between mb-8 pb-4 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-indigo-600 rounded-lg text-white">
                <Shield className="w-5 h-5" />
              </span>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-800">
                AI Postural Health Monitoring System
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              IEEE Minor Project — Modular Multi-Camera Rule-ML Hybrid Inference Platform
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-200">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Phase 1 Real-Time Engine
            </span>
          </div>
        </header>

        {/* Top Status & Alerts */}
        <CameraStatus 
          analysisMode={postureData?.analysis_mode}
          contributingCameras={postureData?.contributing_cameras}
          isConnected={isConnected}
        />

        <AlertBanner postureData={postureData} />

        {/* Live View & Feature Cards */}
        <PostureLiveView postureData={postureData} />

        {/* Trend Visualization Chart */}
        <PostureHistoryChart historyData={history} />

        {/* Footer Documentation Reference */}
        <footer className="text-center text-xs text-slate-400 mt-8 border-t border-slate-200 pt-4">
          <p>AI Posture Health Monitoring System • IEEE Technical Standard Implementation • Phase 1 Scope</p>
        </footer>
      </div>
    </div>
  );
}

export default Dashboard;
