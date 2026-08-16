import React from 'react';
import { Camera, Layers, Activity, Cpu } from 'lucide-react';

export default function StatsBar({ cam1Active, cam2Active, cam3Active, cam1Fps, cam2Fps, cam3Fps }) {
  return (
    <div className="stats-bar">
      <div className="tactical-panel stat-card" style={{ borderLeftColor: '#c084fc' }}>
        <div className="stat-icon" style={{ color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.3)' }}>
          <Camera size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-label">FEED_02 // LEFT-SIDE VIEW</span>
          <span className="stat-value" style={{ color: cam2Active ? '#c084fc' : '#94a3b8' }}>
            {cam2Active ? `${cam2Fps} FPS [ONLINE]` : 'OFFLINE'}
          </span>
        </div>
      </div>

      <div className="tactical-panel stat-card" style={{ borderLeftColor: '#00f5d4' }}>
        <div className="stat-icon" style={{ color: '#00f5d4', borderColor: 'rgba(0, 245, 212, 0.3)' }}>
          <Camera size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-label">FEED_01 // FRONT CENTER VIEW</span>
          <span className="stat-value" style={{ color: cam1Active ? '#00f5d4' : '#94a3b8' }}>
            {cam1Active ? `${cam1Fps} FPS [ONLINE]` : 'OFFLINE'}
          </span>
        </div>
      </div>

      <div className="tactical-panel stat-card" style={{ borderLeftColor: '#10b981' }}>
        <div className="stat-icon" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <Camera size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-label">FEED_03 // RIGHT-SIDE VIEW</span>
          <span className="stat-value" style={{ color: cam3Active ? '#10b981' : '#94a3b8' }}>
            {cam3Active ? `${cam3Fps} FPS [ONLINE]` : 'OFFLINE'}
          </span>
        </div>
      </div>

      <div className="tactical-panel stat-card" style={{ borderLeftColor: '#ffb703' }}>
        <div className="stat-icon" style={{ color: '#ffb703', borderColor: 'rgba(255, 183, 3, 0.3)' }}>
          <Cpu size={20} />
        </div>
        <div className="stat-info">
          <span className="stat-label">SYSTEM_CORE // VISION PIPELINE</span>
          <span className="stat-value" style={{ color: '#ffb703' }}>
            LOCAL BROWSER WASM
          </span>
        </div>
      </div>
    </div>
  );
}
