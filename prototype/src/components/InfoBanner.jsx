import React from 'react';
import { Terminal } from 'lucide-react';

export default function InfoBanner() {
  return (
    <div className="tactical-panel info-banner">
      <Terminal size={22} className="info-icon" />
      <div className="info-content">
        <h4 className="info-title">[HARDWARE_BRIDGE // USB MOBILE CAMERA SETUP]</h4>
        <p className="info-text">
          <span className="info-highlight">CONNECTING PHYSICAL HARDWARE:</span> Plug your mobile phone via USB and start <span className="info-highlight">DroidCam</span>, <span className="info-highlight">Iriun Webcam</span>, or native Android 14+ Webcam mode. Click <span className="info-highlight">"RESCAN CAMERAS"</span> above to map device feeds to the 3-view feature fusion matrix.
        </p>
      </div>
    </div>
  );
}
