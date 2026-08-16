import React from 'react';
import { Cpu, RefreshCw, Radio, Terminal } from 'lucide-react';

export default function Header({ onRefreshDevices, availableDevicesCount }) {
  return (
    <header className="tactical-panel header-container">
      <div className="header-title-area">
        <div className="header-icon-box">
          <Cpu size={26} />
        </div>
        <div>
          <h1 className="header-title">POSTURE AI // MULTI-VIEW TACTICAL VISION</h1>
          <p className="header-subtitle">
            [SYS.MODE: 3-CAM FEATURE FUSION] &nbsp;|&nbsp; [CORE: MEDIAPIPE_POSE_V1]
          </p>
        </div>
      </div>

      <div className="header-actions">
        <div className="status-badge-tactical">
          <span className="status-dot-pulse"></span>
          <span>ONLINE // 3-CAM ACTIVE</span>
        </div>

        <button 
          className="btn-tactical" 
          onClick={onRefreshDevices} 
          title="Rescan connected hardware (USB Mobile / PC Webcams)"
        >
          <RefreshCw size={16} />
          <span>RESCAN CAMERAS [{availableDevicesCount}]</span>
        </button>

        <div className="btn-tactical btn-tactical-amber">
          <Radio size={16} />
          <span>3-CAM MULTI-FEED</span>
        </div>
      </div>
    </header>
  );
}
