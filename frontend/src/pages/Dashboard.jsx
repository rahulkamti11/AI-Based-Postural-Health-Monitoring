import React, { useState, useEffect, useCallback } from 'react';
import { postureSocket } from '../services/websocketClient';
import Header from '../components/Header';
import CameraCard from '../components/CameraCard';
import InfoBanner from '../components/InfoBanner';
import { CameraStatus } from '../components/CameraStatus';
import { PostureLiveView } from '../components/PostureLiveView';
import { AlertBanner } from '../components/AlertBanner';
import { PostureHistoryChart } from '../components/PostureHistoryChart';

export function Dashboard() {
  const [postureData, setPostureData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [history, setHistory] = useState([]);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [systemActive, setSystemActive] = useState(true);

  const [cam1DeviceId, setCam1DeviceId] = useState('');
  const [cam2DeviceId, setCam2DeviceId] = useState('');
  const [cam3DeviceId, setCam3DeviceId] = useState('');

  const [cam1Fps, setCam1Fps] = useState(0);
  const [cam2Fps, setCam2Fps] = useState(0);
  const [cam3Fps, setCam3Fps] = useState(0);

  // Scan connected camera devices safely
  const refreshDevices = useCallback(async () => {
    try {
      let devices = await navigator.mediaDevices.enumerateDevices();
      let videoDevices = devices.filter(dev => dev.kind === 'videoinput');

      if (videoDevices.length === 0 || videoDevices.some(d => !d.label)) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
          tempStream.getTracks().forEach(t => t.stop());
          devices = await navigator.mediaDevices.enumerateDevices();
          videoDevices = devices.filter(dev => dev.kind === 'videoinput');
        } catch (permErr) {
          console.warn('Camera permission prompt deferred:', permErr);
        }
      }

      setAvailableDevices(videoDevices);

      if (videoDevices.length > 0) {
        const builtInCam = videoDevices.find(d => {
          const label = (d.label || '').toLowerCase();
          const isVirtual = label.includes('iriun') || label.includes('droidcam') || label.includes('virtual');
          return !isVirtual;
        }) || videoDevices[0];

        const externalCams = videoDevices.filter(d => d.deviceId !== builtInCam.deviceId);

        if (!cam1DeviceId || !videoDevices.some(d => d.deviceId === cam1DeviceId)) {
          setCam1DeviceId(builtInCam.deviceId);
        }
        if (!cam2DeviceId || !videoDevices.some(d => d.deviceId === cam2DeviceId)) {
          setCam2DeviceId(externalCams.length > 0 ? externalCams[0].deviceId : '');
        }
        if (!cam3DeviceId || !videoDevices.some(d => d.deviceId === cam3DeviceId)) {
          setCam3DeviceId(externalCams.length > 1 ? externalCams[1].deviceId : '');
        }
      } else {
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

  useEffect(() => {
    postureSocket.connect();

    const unsubscribeStatus = postureSocket.subscribeStatus((status) => {
      setIsConnected(status === 'connected');
    });

    const unsubscribeMessage = postureSocket.subscribe((data) => {
      setPostureData(data);
      if (data.timestamp && data.features) {
        setHistory((prev) => {
          const updated = [...prev, data];
          return updated.slice(-30);
        });
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeMessage();
      postureSocket.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="app-container">
        {/* Global Monitoring Header */}
        <Header
          systemActive={systemActive}
          onToggleSystem={() => setSystemActive(prev => !prev)}
          onRefreshDevices={refreshDevices}
          availableDevicesCount={availableDevices.length}
        />

        {/* 3-Camera Preview Grid */}
        <div className="camera-grid mb-6">
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

        {/* Dynamic Camera Degradation Status & Live Stream Controls */}
        <CameraStatus 
          analysisMode={postureData?.analysis_mode}
          contributingCameras={postureData?.contributing_cameras}
          isConnected={isConnected}
        />

        {/* Clinical Ergonomic Risk Warning Banner */}
        <AlertBanner postureData={postureData} />

        {/* Real-Time Posture Live View & Feature Metric Tiles */}
        <PostureLiveView postureData={postureData} />

        {/* Real-Time Trend Visualization Graph */}
        <PostureHistoryChart historyData={history} />

        {/* Mobile & USB Setup Guidance Banner */}
        <InfoBanner />

        {/* Footer Reference */}
        <footer className="text-center text-xs text-slate-400 mt-8 border-t border-slate-200 pt-4">
          <p>AI Posture Health Monitoring System • IEEE Technical Standard Implementation • Phase 1 Scope</p>
        </footer>
      </div>
    </div>
  );
}

export default Dashboard;
