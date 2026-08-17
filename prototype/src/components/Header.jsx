import React from 'react';
import { Activity, RefreshCw, Smartphone } from 'lucide-react';

export default function Header({ onRefreshDevices, availableDevicesCount }) {
  return (
    <header className="clean-card header-container">
      <div className="header-title-area">
        <div className="header-icon-box">
          <Activity size={24} />
        </div>
        <div>
          <h1 className="header-title">AI Posture & Postural Health Monitor</h1>
          <p className="header-subtitle">3-Camera Real-Time Vision & Feature Fusion Dashboard</p>
        </div>
      </div>

      <div className="header-actions">
        <div className="status-badge-clean">
          <span className="status-dot-green"></span>
          <span>3-Camera Vision Active</span>
        </div>

        <button 
          className="btn-clean" 
          onClick={onRefreshDevices} 
          title="Rescan connected cameras (USB Mobile / PC Webcams)"
        >
          <RefreshCw size={16} />
          <span>Rescan Cameras ({availableDevicesCount})</span>
        </button>

        <div className="btn-clean btn-clean-primary">
          <Smartphone size={16} />
          <span>USB Mobile + PC Cam</span>
        </div>
      </div>
    </header>
  );
}
