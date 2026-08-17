import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import CameraCard from './components/CameraCard';
import InfoBanner from './components/InfoBanner';

export default function App() {
  const [availableDevices, setAvailableDevices] = useState([]);
  const [systemActive, setSystemActive] = useState(false); // Turned OFF by default on load

  const [cam1DeviceId, setCam1DeviceId] = useState('');
  const [cam2DeviceId, setCam2DeviceId] = useState('');
  const [cam3DeviceId, setCam3DeviceId] = useState('');

  const [cam1Fps, setCam1Fps] = useState(0);
  const [cam2Fps, setCam2Fps] = useState(0);
  const [cam3Fps, setCam3Fps] = useState(0);

  // Scan for connected camera devices safely with smart brand/label matching
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
        // 1. Identify PC Built-in Laptop Camera (non-Iriun / non-DroidCam)
        const builtInCam = videoDevices.find(d => {
          const label = (d.label || '').toLowerCase();
          const isVirtual = label.includes('iriun') || label.includes('droidcam') || label.includes('virtual');
          return !isVirtual;
        }) || videoDevices[0];

        // 2. Identify External Mobile/Iriun/DroidCam Cameras
        const externalCams = videoDevices.filter(d => d.deviceId !== builtInCam.deviceId);

        // Assign Camera 1 (Front View - Center): ALWAYS Laptop Built-in Camera
        if (!cam1DeviceId || !videoDevices.some(d => d.deviceId === cam1DeviceId)) {
          setCam1DeviceId(builtInCam.deviceId);
        }

        // Assign Camera 2 (Left-Side View): External Cam 1 (e.g. Iriun Webcam 1)
        if (!cam2DeviceId || !videoDevices.some(d => d.deviceId === cam2DeviceId)) {
          setCam2DeviceId(externalCams.length > 0 ? externalCams[0].deviceId : '');
        }

        // Assign Camera 3 (Right-Side View): External Cam 2 (e.g. Iriun Webcam #2)
        if (!cam3DeviceId || !videoDevices.some(d => d.deviceId === cam3DeviceId)) {
          setCam3DeviceId(externalCams.length > 1 ? externalCams[1].deviceId : '');
        }
      } else {
        // Fallback: Default ID ONLY for Cam 1 (Laptop Built-in Camera)
        setCam1DeviceId('default');
        setCam2DeviceId('');
        setCam3DeviceId('');
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
      {/* Header Bar with System Start/Stop Toggle (Off by default) */}
      <Header
        systemActive={systemActive}
        onToggleSystem={() => setSystemActive(prev => !prev)}
        onRefreshDevices={refreshDevices}
        availableDevicesCount={availableDevices.length}
      />

      {/* 3-Camera Preview Grid: [Left-Side (Cam 2) | Front Center (Cam 1) | Right-Side (Cam 3)] */}
      <div className="camera-grid">
        {/* Left Column: Left-Side View (Cam 2 - Iriun Webcam 1) */}
        <CameraCard
          camId="cam2"
          tagLabel="CAM 2"
          tagClass="tag-cam2"
          title="Camera 2 (Left-Side View)"
          availableDevices={availableDevices}
          selectedDeviceId={cam2DeviceId}
          onSelectDevice={setCam2DeviceId}
          onFpsUpdate={setCam2Fps}
          systemActive={systemActive}
        />

        {/* Center Column: Front View (Cam 1 - Laptop Built-in Camera) */}
        <CameraCard
          camId="cam1"
          tagLabel="CAM 1"
          tagClass="tag-cam1"
          title="Camera 1 (Front View)"
          availableDevices={availableDevices}
          selectedDeviceId={cam1DeviceId}
          onSelectDevice={setCam1DeviceId}
          onFpsUpdate={setCam1Fps}
          systemActive={systemActive}
        />

        {/* Right Column: Right-Side View (Cam 3 - Iriun Webcam #2) */}
        <CameraCard
          camId="cam3"
          tagLabel="CAM 3"
          tagClass="tag-cam3"
          title="Camera 3 (Right-Side View)"
          availableDevices={availableDevices}
          selectedDeviceId={cam3DeviceId}
          onSelectDevice={setCam3DeviceId}
          onFpsUpdate={setCam3Fps}
          systemActive={systemActive}
        />
      </div>

      {/* USB Mobile Camera Instructions Banner */}
      <InfoBanner />
    </div>
  );
}
