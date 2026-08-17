import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import CameraCard from './components/CameraCard';
import InfoBanner from './components/InfoBanner';

export default function App() {
  const [availableDevices, setAvailableDevices] = useState([]);
  const [cam1DeviceId, setCam1DeviceId] = useState('');
  const [cam2DeviceId, setCam2DeviceId] = useState('');
  const [cam3DeviceId, setCam3DeviceId] = useState('');

  const [cam1Fps, setCam1Fps] = useState(0);
  const [cam2Fps, setCam2Fps] = useState(0);
  const [cam3Fps, setCam3Fps] = useState(0);

  // Scan for connected camera devices safely
  const refreshDevices = useCallback(async () => {
    try {
      let devices = await navigator.mediaDevices.enumerateDevices();
      let videoDevices = devices.filter(dev => dev.kind === 'videoinput');

      // Request permission if labels are hidden/empty
      if (videoDevices.length === 0 || videoDevices.some(d => !d.label)) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
          tempStream.getTracks().forEach(t => t.stop());
          devices = await navigator.mediaDevices.enumerateDevices();
          videoDevices = devices.filter(dev => dev.kind === 'videoinput');
        } catch (permErr) {
          console.warn('Initial camera permission prompt deferred or rejected:', permErr);
        }
      }

      setAvailableDevices(videoDevices);

      if (videoDevices.length > 0) {
        if (!cam1DeviceId || !videoDevices.some(d => d.deviceId === cam1DeviceId)) {
          setCam1DeviceId(videoDevices[0].deviceId);
        }
        if (!cam2DeviceId || !videoDevices.some(d => d.deviceId === cam2DeviceId)) {
          setCam2DeviceId(videoDevices.length > 1 ? videoDevices[1].deviceId : videoDevices[0].deviceId);
        }
        if (!cam3DeviceId || !videoDevices.some(d => d.deviceId === cam3DeviceId)) {
          if (videoDevices.length > 2) {
            setCam3DeviceId(videoDevices[2].deviceId);
          } else if (videoDevices.length > 1) {
            setCam3DeviceId(videoDevices[1].deviceId);
          } else {
            setCam3DeviceId(videoDevices[0].deviceId);
          }
        }
      } else {
        // Fallback default trigger so getUserMedia({ video: true }) still runs
        setCam1DeviceId('default');
        setCam2DeviceId('default');
        setCam3DeviceId('default');
      }
    } catch (err) {
      console.error('Error scanning video devices:', err);
    }
  }, [cam1DeviceId, cam2DeviceId, cam3DeviceId]);

  useEffect(() => {
    refreshDevices();
  }, []);

  return (
    <div className="app-container">
      {/* Header Bar */}
      <Header
        onRefreshDevices={refreshDevices}
        availableDevicesCount={availableDevices.length}
      />

      {/* 3-Camera Preview Grid: [Left-Side | Front (Center) | Right-Side] */}
      <div className="camera-grid">
        {/* Left Column: Left-Side View */}
        <CameraCard
          camId="cam2"
          tagLabel="CAM 2"
          tagClass="tag-cam2"
          title="Camera 2 (Left-Side View)"
          subtitle="Captures left neck angle & slouch inclination"
          availableDevices={availableDevices}
          selectedDeviceId={cam2DeviceId}
          onSelectDevice={setCam2DeviceId}
          onFpsUpdate={setCam2Fps}
        />

        {/* Center Column: Front View */}
        <CameraCard
          camId="cam1"
          tagLabel="CAM 1"
          tagClass="tag-cam1"
          title="Camera 1 (Front View)"
          subtitle="Captures front body alignment & shoulder tilt"
          availableDevices={availableDevices}
          selectedDeviceId={cam1DeviceId}
          onSelectDevice={setCam1DeviceId}
          onFpsUpdate={setCam1Fps}
        />

        {/* Right Column: Right-Side View */}
        <CameraCard
          camId="cam3"
          tagLabel="CAM 3"
          tagClass="tag-cam3"
          title="Camera 3 (Right-Side View)"
          subtitle="Captures right neck angle & slouch inclination"
          availableDevices={availableDevices}
          selectedDeviceId={cam3DeviceId}
          onSelectDevice={setCam3DeviceId}
          onFpsUpdate={setCam3Fps}
        />
      </div>

      {/* USB Mobile Camera Instructions Banner */}
      <InfoBanner />
    </div>
  );
}
