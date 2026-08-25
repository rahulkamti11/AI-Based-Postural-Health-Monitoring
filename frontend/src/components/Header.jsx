import React from 'react';
import { Activity, RefreshCw, PlayCircle, PauseCircle } from 'lucide-react';

export function Header({ systemActive, onToggleSystem, onRefreshDevices, availableDevicesCount }) {
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
