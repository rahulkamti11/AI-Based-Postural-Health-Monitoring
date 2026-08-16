import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
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

  // Scan for connected camera devices
  const refreshDevices = useCallback(async () => {
    try {
      // Request initial permission so device labels are visible
      const initialStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      initialStream.getTracks().forEach(t => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(dev => dev.kind === 'videoinput');
      setAvailableDevices(videoDevices);

      if (videoDevices.length > 0) {
        // Smart Default Assignment for 3 Cameras
        // Camera 1 (Front View - Center): Device 0
        if (!cam1DeviceId || !videoDevices.some(d => d.deviceId === cam1DeviceId)) {
          setCam1DeviceId(videoDevices[0].deviceId);
        }

        // Camera 2 (Left-Side View - Left): Device 1 if available, else Device 0
        if (!cam2DeviceId || !videoDevices.some(d => d.deviceId === cam2DeviceId)) {
          setCam2DeviceId(videoDevices.length > 1 ? videoDevices[1].deviceId : videoDevices[0].deviceId);
        }

        // Camera 3 (Right-Side View - Right): Device 2 if available, else Device 0 or 1
        if (!cam3DeviceId || !videoDevices.some(d => d.deviceId === cam3DeviceId)) {
          if (videoDevices.length > 2) {
            setCam3DeviceId(videoDevices[2].deviceId);
          } else if (videoDevices.length > 1) {
            setCam3DeviceId(videoDevices[1].deviceId);
          } else {
            setCam3DeviceId(videoDevices[0].deviceId);
          }
        }
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

      {/* Quick Statistics Bar */}
      <StatsBar
        cam1Active={!!cam1DeviceId}
        cam2Active={!!cam2DeviceId}
        cam3Active={!!cam3DeviceId}
        cam1Fps={cam1Fps}
        cam2Fps={cam2Fps}
        cam3Fps={cam3Fps}
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
