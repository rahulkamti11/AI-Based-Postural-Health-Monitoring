import React, { useState, useEffect, useCallback, useRef } from 'react';
import { postureSocket } from '../services/websocketClient';
import Header from '../components/Header';
import CameraCard from '../components/CameraCard';
import InfoBanner from '../components/InfoBanner';
import BadPostureModal from '../components/BadPostureModal';
import { CameraStatus } from '../components/CameraStatus';
import { PostureLiveView } from '../components/PostureLiveView';
import { PostureHistoryChart } from '../components/PostureHistoryChart';

export function Dashboard() {
  const [postureData, setPostureData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [history, setHistory] = useState([]);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [systemActive, setSystemActive] = useState(false);

  // Togglable alert options
  const [audioAlertEnabled, setAudioAlertEnabled] = useState(true);
  const [visualAlertEnabled, setVisualAlertEnabled] = useState(true);
  const [showVideoFeeds, setShowVideoFeeds] = useState(true);
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

  const [isScanning, setIsScanning] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Smart camera device auto-mapping
  const refreshDevices = useCallback(async () => {
    setIsScanning(true);
    try {
      // Simulate a slight delay so the rotation is visible and UX feels like a "scan"
      await new Promise(resolve => setTimeout(resolve, 800));

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

      setAvailableDevices(prevDevices => {
        const diff = videoDevices.length - prevDevices.length;
        if (diff > 0) {
          showToast(`Scan complete: Found ${diff} new camera(s)!`);
        } else if (diff < 0) {
          showToast(`Scan complete: ${Math.abs(diff)} camera(s) disconnected.`);
        } else {
          showToast(`Scan complete: No new cameras found.`);
        }
        return videoDevices;
      });

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
      showToast('Error scanning for cameras.');
    } finally {
      setIsScanning(false);
    }
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    refreshDevices();
  }, []);

  useEffect(() => {
    if (systemActive) {
      postureSocket.connect();
    } else {
      postureSocket.disconnect();
      setPostureData(null);
    }
  }, [systemActive]);

  useEffect(() => {
    const unsubscribeStatus = postureSocket.subscribeStatus((status) => {
      setIsConnected(status === 'connected');
    });

    const unsubscribeMessage = postureSocket.subscribe((data) => {
      setPostureData(data);
      if (data.timestamp && data.features_used) {
        // Flatten the features for the charts and views
        const flatFeatures = { 
          ...(data.features_used.front || {}), 
          ...(data.features_used.left || {}), 
          ...(data.features_used.right || {}) 
        };
        const dataWithFeatures = { ...data, features: flatFeatures };
        setHistory((prev) => {
          const updated = [...prev, dataWithFeatures];
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

      const isBad = postureData?.overall_quality === 'bad';

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

  // Audio alert check: Consecutive bad posture > 60 seconds
  useEffect(() => {
    if (audioAlertEnabled && systemActive && consecutiveBadSeconds > 60) {
      if (Date.now() - lastAudioTriggerRef.current > 60000) {
        playChimeSound();
        lastAudioTriggerRef.current = Date.now();
      }
    }
  }, [consecutiveBadSeconds, audioAlertEnabled, systemActive, playChimeSound]);

  // Visual modal alert check: Consecutive bad posture > 30 seconds
  useEffect(() => {
    if (visualAlertEnabled && systemActive && consecutiveBadSeconds >= 30) {
      setShowBadPostureModal(true);
    }
  }, [consecutiveBadSeconds, visualAlertEnabled, systemActive]);


  const postureQuality = postureData?.overall_quality || 'good';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans px-4 md:px-8 pb-8 pt-24">
      <div className="app-container">
        {/* Master Control Header */}
        <Header
          systemActive={systemActive}
          onToggleSystem={() => setSystemActive(prev => !prev)}
          audioAlertEnabled={audioAlertEnabled}
          onToggleAudioAlert={() => setAudioAlertEnabled(prev => !prev)}
          visualAlertEnabled={visualAlertEnabled}
          onToggleVisualAlert={() => setVisualAlertEnabled(prev => !prev)}
          showVideoFeeds={showVideoFeeds}
          onToggleVideoFeeds={() => setShowVideoFeeds(prev => !prev)}
          isConnected={isConnected}
          onRefreshDevices={refreshDevices}
          availableDevicesCount={availableDevices.length}
          isScanning={isScanning}
        />

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-right fade-in duration-300">
            <div className="bg-slate-800 text-white text-sm font-semibold px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        {/* Top Consolidated Overview & Telemetry Section */}
        <PostureLiveView 
          postureData={systemActive ? postureData : null} 
          systemActive={systemActive} 
          sessionSeconds={sessionSeconds}
          goodSeconds={goodSeconds}
          badSeconds={badSeconds}
        />

        {/* 3-Camera Preview Grid with Dynamic Green/Red Skeleton Overlays */}
        <div 
          className="camera-grid mb-6"
          style={!showVideoFeeds ? { position: 'absolute', opacity: 0, pointerEvents: 'none', transform: 'scale(0)' } : {}}
        >
          <CameraCard
            camId="cam2"
            tagLabel="CAM 2"
            tagClass="tag-cam2"
            title="Target: Left-Side View"
            availableDevices={availableDevices}
            selectedDeviceId={cam2DeviceId}
            onSelectDevice={setCam2DeviceId}
            onFpsUpdate={setCam2Fps}
            systemActive={systemActive}
            postureQuality={postureQuality}
            isScanning={isScanning}
          />

          <CameraCard
            camId="cam1"
            tagLabel="CAM 1"
            tagClass="tag-cam1"
            title="Target: Front View"
            availableDevices={availableDevices}
            selectedDeviceId={cam1DeviceId}
            onSelectDevice={setCam1DeviceId}
            onFpsUpdate={setCam1Fps}
            systemActive={systemActive}
            postureQuality={postureQuality}
            isScanning={isScanning}
          />

          <CameraCard
            camId="cam3"
            tagLabel="CAM 3"
            tagClass="tag-cam3"
            title="Target: Right-Side View"
            availableDevices={availableDevices}
            selectedDeviceId={cam3DeviceId}
            onSelectDevice={setCam3DeviceId}
            onFpsUpdate={setCam3Fps}
            systemActive={systemActive}
            postureQuality={postureQuality}
            isScanning={isScanning}
          />
        </div>

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
