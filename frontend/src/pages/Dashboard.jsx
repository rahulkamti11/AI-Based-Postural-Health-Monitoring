import React, { useState, useEffect, useCallback, useRef } from 'react';
import { postureSocket } from '../services/websocketClient';
import Header from '../components/Header';
import CameraCard from '../components/CameraCard';
import InfoBanner from '../components/InfoBanner';
import SessionSummary from '../components/SessionSummary';
import BadPostureModal from '../components/BadPostureModal';
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

  // Togglable alert options
  const [audioAlertEnabled, setAudioAlertEnabled] = useState(true);
  const [visualAlertEnabled, setVisualAlertEnabled] = useState(true);
  const [showBadPostureModal, setShowBadPostureModal] = useState(false);

  // Session Analytics State
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [goodSeconds, setGoodSeconds] = useState(0);
  const [badSeconds, setBadSeconds] = useState(0);
  const [badPostureInstances, setBadPostureInstances] = useState(0);
  const [labelCounts, setLabelCounts] = useState({});

  // Continuous tracking timers
  const [continuousSittingSeconds, setContinuousSittingSeconds] = useState(0);
  const [consecutiveBadSeconds, setConsecutiveBadSeconds] = useState(0);

  const [cam1DeviceId, setCam1DeviceId] = useState('');
  const [cam2DeviceId, setCam2DeviceId] = useState('');
  const [cam3DeviceId, setCam3DeviceId] = useState('');

  const [cam1Fps, setCam1Fps] = useState(0);
  const [cam2Fps, setCam2Fps] = useState(0);
  const [cam3Fps, setCam3Fps] = useState(0);

  const lastBadStateRef = useRef(false);
  const lastAudioTriggerRef = useRef(0);

  // Web Audio API chime generator for 60s continuous sitting alert
  const playChimeSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.warn("Audio chime play error:", e);
    }
  }, []);

  // Smart camera device auto-mapping
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
        // Auto-assign laptop built-in camera to Cam 1
        const builtInCam = videoDevices.find(d => {
          const label = (d.label || '').toLowerCase();
          const isVirtual = label.includes('iriun') || label.includes('droidcam') || label.includes('virtual');
          return !isVirtual;
        }) || videoDevices[0];

        // Auto-assign mobile/virtual webcams to Cam 2 & Cam 3
        const externalCams = videoDevices.filter(d => d.deviceId !== builtInCam.deviceId);

        setCam1DeviceId(builtInCam.deviceId);
        setCam2DeviceId(externalCams.length > 0 ? externalCams[0].deviceId : '');
        setCam3DeviceId(externalCams.length > 1 ? externalCams[1].deviceId : '');
      } else {
        setCam1DeviceId('default');
        setCam2DeviceId('');
        setCam3DeviceId('');
      }
    } catch (err) {
      console.error('Error scanning video devices:', err);
    }
  }, []);

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

  // Main 1-second interval timer for session analytics & alerts
  useEffect(() => {
    if (!systemActive) return;

    const timer = setInterval(() => {
      setSessionSeconds(prev => prev + 1);
      setContinuousSittingSeconds(prev => prev + 1);

      const isBad = postureData?.posture_quality === 'bad';

      if (isBad) {
        setBadSeconds(prev => prev + 1);
        setConsecutiveBadSeconds(prev => prev + 1);

        const currentLabel = postureData?.posture_label || 'unknown';
        setLabelCounts(prev => ({
          ...prev,
          [currentLabel]: (prev[currentLabel] || 0) + 1
        }));

        if (!lastBadStateRef.current) {
          setBadPostureInstances(prev => prev + 1);
          lastBadStateRef.current = true;
        }
      } else {
        setGoodSeconds(prev => prev + 1);
        setConsecutiveBadSeconds(0);
        lastBadStateRef.current = false;
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [systemActive, postureData]);

  // Audio alert check: Continuous sitting > 60 seconds
  useEffect(() => {
    if (audioAlertEnabled && systemActive && continuousSittingSeconds > 60) {
      if (Date.now() - lastAudioTriggerRef.current > 60000) {
        playChimeSound();
        lastAudioTriggerRef.current = Date.now();
      }
    }
  }, [continuousSittingSeconds, audioAlertEnabled, systemActive, playChimeSound]);

  // Visual modal alert check: Consecutive bad posture > 30 seconds
  useEffect(() => {
    if (visualAlertEnabled && systemActive && consecutiveBadSeconds >= 30) {
      setShowBadPostureModal(true);
    }
  }, [consecutiveBadSeconds, visualAlertEnabled, systemActive]);

  // Compute most frequent bad posture label
  const getMostFrequentBadLabel = () => {
    let maxCount = 0;
    let topLabel = 'None';
    Object.entries(labelCounts).forEach(([lbl, count]) => {
      if (lbl !== 'neutral_spinal_alignment' && count > maxCount) {
        maxCount = count;
        topLabel = lbl;
      }
    });
    return topLabel;
  };

  const postureQuality = postureData?.posture_quality || 'good';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="app-container">
        {/* Master Control Header */}
        <Header
          systemActive={systemActive}
          onToggleSystem={() => setSystemActive(prev => !prev)}
          onRefreshDevices={refreshDevices}
          availableDevicesCount={availableDevices.length}
          audioAlertEnabled={audioAlertEnabled}
          onToggleAudioAlert={() => setAudioAlertEnabled(prev => !prev)}
          visualAlertEnabled={visualAlertEnabled}
          onToggleVisualAlert={() => setVisualAlertEnabled(prev => !prev)}
        />

        {/* Active Session Ergonomic Analytics Summary */}
        <SessionSummary
          sessionSeconds={sessionSeconds}
          goodSeconds={goodSeconds}
          badSeconds={badSeconds}
          badPostureInstances={badPostureInstances}
          mostFrequentBadLabel={getMostFrequentBadLabel()}
        />

        {/* 3-Camera Preview Grid with Dynamic Green/Red Skeleton Overlays */}
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
            postureQuality={postureQuality}
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
            postureQuality={postureQuality}
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
            postureQuality={postureQuality}
          />
        </div>

        {/* Dynamic Camera Degradation Status */}
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

        {/* Sustained Bad Posture (>30s) Warning Modal Popup */}
        <BadPostureModal
          isOpen={showBadPostureModal}
          onClose={() => setShowBadPostureModal(false)}
          postureLabel={postureData?.posture_label}
          consecutiveBadSeconds={consecutiveBadSeconds}
        />

        <footer className="text-center text-xs text-slate-400 mt-8 border-t border-slate-200 pt-4">
          <p>AI Posture Health Monitoring System • Real-Time Vision & Feature Fusion Platform • Phase 1 Scope</p>
        </footer>
      </div>
    </div>
  );
}

export default Dashboard;
