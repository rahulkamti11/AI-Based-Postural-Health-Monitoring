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
  const [totalActiveSeconds, setTotalActiveSeconds] = useState(0);
  const [undetectedSeconds, setUndetectedSeconds] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0); // This represents 'Detected' time
  const [goodSeconds, setGoodSeconds] = useState(0);
  const [badSeconds, setBadSeconds] = useState(0);
  const [badPostureInstances, setBadPostureInstances] = useState(0);
  const [labelCounts, setLabelCounts] = useState({});

  // Continuous tracking timers
  const [continuousSittingSeconds, setContinuousSittingSeconds] = useState(0);
  const [consecutiveBadSeconds, setConsecutiveBadSeconds] = useState(0); // for Visual Modal
  const [audioAlertBadSeconds, setAudioAlertBadSeconds] = useState(0); // for Audio Alert separate tracking
  const idleSecondsRef = useRef(0); // Tracks no_person/offline duration

  const [showAudioModal, setShowAudioModal] = useState(false);
  const audioCtxRef = useRef(null);
  const beepIntervalRef = useRef(null);

  const [cam1DeviceId, setCam1DeviceId] = useState('');
  const [cam2DeviceId, setCam2DeviceId] = useState('');
  const [cam3DeviceId, setCam3DeviceId] = useState('');

  const [cam1Fps, setCam1Fps] = useState(0);
  const [cam2Fps, setCam2Fps] = useState(0);
  const [cam3Fps, setCam3Fps] = useState(0);

  const lastBadStateRef = useRef(false);
  const consecutiveGoodSecondsRef = useRef(0);
  const lastAudioTriggerRef = useRef(0);

  // Initialize Audio Context on user gesture to bypass browser autoplay block
  useEffect(() => {
    if (systemActive && !audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
  }, [systemActive]);

  const playBeep = useCallback(() => {
    if (!audioCtxRef.current) return;
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    
    try {
      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      osc.type = 'square';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.1, audioCtxRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.5);
      osc.start();
      osc.stop(audioCtxRef.current.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio beep failed:", e);
    }
  }, []);

  const startAudioAlarm = useCallback(() => {
    if (beepIntervalRef.current) return; // already playing
    playBeep(); // play first beep immediately
    beepIntervalRef.current = setInterval(playBeep, 1000); // loop every second
  }, [playBeep]);

  const stopAudioAlarm = useCallback(() => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
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
          const isVirtual = label.includes('iriun') || label.includes('droid') || label.includes('virtual');
          return !isVirtual && label.length > 0;
        }) || videoDevices.find(d => !d.label.toLowerCase().includes('iriun') && !d.label.toLowerCase().includes('droid')) || videoDevices[0];

        // Explicitly find Iriun Webcam 1 (sometimes just named "Iriun Webcam" without a number)
        const iriun1 = videoDevices.find(d => {
          const label = (d.label || '').toLowerCase();
          return label.includes('iriun') && !label.includes('2') && !label.includes('3');
        });
        
        // Explicitly find Iriun Webcam 2
        const iriun2 = videoDevices.find(d => {
          const label = (d.label || '').toLowerCase();
          return label.includes('iriun') && label.includes('2');
        });

        // Fallback logic for mobile/virtual webcams if Iriun 1/2 are not present
        const otherExternalCams = videoDevices.filter(d => 
          d.deviceId !== builtInCam?.deviceId && 
          d.deviceId !== iriun1?.deviceId && 
          d.deviceId !== iriun2?.deviceId
        );

        setCam1DeviceId(builtInCam?.deviceId || '');
        
        const c2 = iriun1 ? iriun1.deviceId : (otherExternalCams.length > 0 ? otherExternalCams.shift().deviceId : '');
        const c3 = iriun2 ? iriun2.deviceId : (otherExternalCams.length > 0 ? otherExternalCams.shift().deviceId : '');
        
        setCam2DeviceId(c2);
        setCam3DeviceId(c3);
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

  const postureDataRef = useRef(null);

  useEffect(() => {
    const unsubscribeStatus = postureSocket.subscribeStatus((status) => {
      setIsConnected(status === 'connected');
    });

    const unsubscribeMessage = postureSocket.subscribe((data) => {
      setPostureData(data);
      postureDataRef.current = data;
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
      const currentPostureData = postureDataRef.current;
      
      // Update history array at 1 Hz for the timeline graph (no sliding window limit)
      if (currentPostureData) {
        setHistory(prev => [...prev, currentPostureData]);
      }

      const isStandby = currentPostureData?.overall_quality === 'standby' || currentPostureData?.posture_label === 'offline';

        setTotalActiveSeconds(prev => prev + 1);

      // Auto-shutdown on 5 mins (300s) of inactivity (no person / offline)
      if (isStandby) {
        idleSecondsRef.current += 1;
        if (idleSecondsRef.current >= 300) {
          setSystemActive(false);
          setToastMessage("Monitoring automatically stopped due to 5 minutes of inactivity.");
          idleSecondsRef.current = 0;
        }
        return; // Pause all session tracking while in standby
      } else {
        idleSecondsRef.current = 0;
      }

      // If we reach here, system is actively monitoring someone
      setSessionSeconds(prev => prev + 1);
      setContinuousSittingSeconds(prev => prev + 1);

      const isBad = currentPostureData?.overall_quality === 'bad';

      if (isBad) {
        setBadSeconds(prev => prev + 1);
        setConsecutiveBadSeconds(prev => prev + 1);
        setAudioAlertBadSeconds(prev => prev + 1);
        consecutiveGoodSecondsRef.current = 0; // Reset good streak

        const currentLabel = currentPostureData?.posture_label || 'unknown';
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
        consecutiveGoodSecondsRef.current += 1; // Increment good streak
        
        // Hysteresis: Only reset bad clocks if good posture is maintained for 3 continuous seconds
        if (consecutiveGoodSecondsRef.current >= 3) {
          setConsecutiveBadSeconds(0);
          setAudioAlertBadSeconds(0);
          lastBadStateRef.current = false;
          
          setShowAudioModal(false);
          setShowBadPostureModal(false);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [systemActive]);

  // Audio alert check: Consecutive bad posture > 60 seconds
  useEffect(() => {
    if (!showAudioModal) {
      stopAudioAlarm(); // guarantee off if not shown
    }
  }, [showAudioModal, stopAudioAlarm]);

  useEffect(() => {
    if (audioAlertEnabled && systemActive && audioAlertBadSeconds >= 60) {
      setShowAudioModal(true);
      setShowBadPostureModal(true);
      startAudioAlarm();
    }
  }, [audioAlertBadSeconds, audioAlertEnabled, systemActive, startAudioAlarm]);

  // Visual modal alert check: Consecutive bad posture > 30 seconds
  useEffect(() => {
    if (visualAlertEnabled && systemActive && consecutiveBadSeconds >= 30) {
      setShowBadPostureModal(true);
    }
  }, [consecutiveBadSeconds, visualAlertEnabled, systemActive]);


  const frontQuality = postureData?.front_quality || 'good';
  const sideQuality = postureData?.side_quality || 'good';

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
            postureQuality={sideQuality}
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
            postureQuality={frontQuality}
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
            postureQuality={sideQuality}
            isScanning={isScanning}
          />
        </div>

        {/* Real-Time Trend Visualization Graph */}
        <PostureHistoryChart 
          historyData={history} 
          sessionSeconds={sessionSeconds}
          totalActiveSeconds={totalActiveSeconds}
          undetectedSeconds={undetectedSeconds}
          goodSeconds={goodSeconds}
          badSeconds={badSeconds}
        />

        {/* Mobile & USB Setup Guidance Banner */}
        <InfoBanner />

        {/* Sustained Bad Posture Warning Modal Popup (Combined Visual & Audio) */}
        <BadPostureModal
          isOpen={showBadPostureModal}
          onClose={() => {
            setShowBadPostureModal(false);
            setConsecutiveBadSeconds(0);
            if (showAudioModal) {
              setShowAudioModal(false);
              stopAudioAlarm();
              setAudioAlertBadSeconds(0);
            }
          }}
          postureLabel={postureData?.posture_label}
          consecutiveBadSeconds={consecutiveBadSeconds}
          isAudioPlaying={showAudioModal}
          onSilenceAudio={() => {
            setShowAudioModal(false);
            stopAudioAlarm();
            setAudioAlertBadSeconds(0);
          }}
        />

        <footer className="text-center text-xs text-slate-400 mt-8 border-t border-slate-200 pt-4">
          <p>AI Posture Health Monitoring System • Real-Time Vision & Feature Fusion Platform • Phase 1 Scope</p>
        </footer>
      </div>
    </div>
  );
}

export default Dashboard;
