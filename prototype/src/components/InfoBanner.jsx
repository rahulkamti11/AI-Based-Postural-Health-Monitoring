import React from 'react';
import { Info } from 'lucide-react';

export default function InfoBanner() {
  return (
    <div className="clean-card info-banner">
      <Info size={20} className="info-icon" />
      <div className="info-content">
        <h4 className="info-title">USB Mobile Camera & Multi-Camera Setup Guidance</h4>
        <p className="info-text">
          <span className="info-highlight">Connecting Mobile Cameras:</span> Plug your mobile phone via USB and start <span className="info-highlight">DroidCam</span>, <span className="info-highlight">Iriun Webcam</span>, or Android 14+ USB Webcam mode. Click <span className="info-highlight">"Rescan Cameras"</span> above to map device feeds across Left-Side, Front (Center), and Right-Side views.
        </p>
      </div>
    </div>
  );
}
