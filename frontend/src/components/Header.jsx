import React from 'react';
import { Activity, RefreshCw, PlayCircle, PauseCircle, Volume2, VolumeX, Bell, BellOff } from 'lucide-react';

export function Header({
  systemActive,
  onToggleSystem,
  onRefreshDevices,
  availableDevicesCount,
  audioAlertEnabled,
  onToggleAudioAlert,
  visualAlertEnabled,
  onToggleVisualAlert
}) {
  return (
    <header className="clean-card header-container mb-6">
      <div className="header-title-area">
        <div className="header-icon-box">
          <Activity size={24} />
        </div>
        <div>
          <h1 className="header-title">AI-Based Sitting Posture Detection and Postural Health Monitoring System</h1>
          <p className="header-subtitle">3-Camera Real-Time Vision & Feature Fusion Dashboard</p>
        </div>
      </div>

      <div className="header-actions">
        {/* Togglable Audio Alert Button */}
        <button
          className={`btn-clean ${audioAlertEnabled ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}
          onClick={onToggleAudioAlert}
          title="Toggle audio alert chime for continuous sitting > 60s"
        >
          {audioAlertEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span>Audio Alert (60s): {audioAlertEnabled ? 'ON' : 'OFF'}</span>
        </button>

        {/* Togglable Visual Alert Popup Button */}
        <button
          className={`btn-clean ${visualAlertEnabled ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-slate-100 text-slate-500'}`}
          onClick={onToggleVisualAlert}
          title="Toggle visual popup modal for bad posture > 30s"
        >
          {visualAlertEnabled ? <Bell size={16} /> : <BellOff size={16} />}
          <span>Visual Alert (30s): {visualAlertEnabled ? 'ON' : 'OFF'}</span>
        </button>

        <div className={`status-badge-clean ${systemActive ? '' : 'status-stopped'}`}>
          <span className={systemActive ? 'status-dot-green' : 'status-dot-red'}></span>
          <span>{systemActive ? 'Monitoring Active' : 'Monitoring Stopped'}</span>
        </div>

        <button
          className={`btn-clean ${systemActive ? 'btn-clean-stop' : 'btn-clean-start'}`}
          onClick={onToggleSystem}
          title="Click to Start / Stop posture monitoring and camera feeds"
        >
          {systemActive ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
          <span>{systemActive ? 'Stop Monitoring' : 'Start Monitoring'}</span>
        </button>

        <button 
          className="btn-clean" 
          onClick={onRefreshDevices} 
          title="Rescan connected cameras (USB Mobile / PC Webcams)"
        >
          <RefreshCw size={16} />
          <span>Rescan Cameras ({availableDevicesCount})</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
