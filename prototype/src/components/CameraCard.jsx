import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Eye, EyeOff, FlipHorizontal, VideoOff, Maximize2, Minimize2, Power, PauseCircle } from 'lucide-react';
import { Pose as PoseModule } from '@mediapipe/pose';

// MediaPipe 33 Pose Landmark standard connections
const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Arms & Shoulders
  [11, 23], [12, 24], [23, 24],                   // Torso & Hips
  [23, 25], [24, 26], [25, 27], [26, 28],          // Legs
  [0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 6],   // Face features
  [9, 10], [15, 17], [15, 19], [15, 21],          // Hands & Wrists
  [16, 18], [16, 20], [16, 22]
];

export default function CameraCard({
  camId,
  tagLabel,
  tagClass,
  title,
  availableDevices,
  selectedDeviceId,
  onSelectDevice,
  onFpsUpdate,
  systemActive = true
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPoweredOn, setIsPoweredOn] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [isMirrored, setIsMirrored] = useState(false); // Unmirrored by default as requested
  const [fitCover, setFitCover] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [fps, setFps] = useState(0);
  const [poseReady, setPoseReady] = useState(false);

  // Sync state refs to prevent stale closure traps in MediaPipe callback
  const showSkeletonRef = useRef(showSkeleton);
  const isMirroredRef = useRef(isMirrored);

  useEffect(() => {
    showSkeletonRef.current = showSkeleton;
  }, [showSkeleton]);

  useEffect(() => {
    isMirroredRef.current = isMirrored;
  }, [isMirrored]);

  const poseRef = useRef(null);
  const animFrameId = useRef(null);
  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const isProcessingRef = useRef(false);

  // Initialize MediaPipe Pose instance with async readiness tracking
  useEffect(() => {
    let isMounted = true;

    async function initPoseEngine() {
      try {
        const PoseConstructor = window.Pose || PoseModule;
        const poseInstance = new PoseConstructor({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        });

        poseInstance.setOptions({
          modelComplexity: 1, // Full accuracy pose detection model
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.3,
          minTrackingConfidence: 0.3,
        });

        poseInstance.onResults((results) => {
          if (isMounted) {
            handlePoseResults(results);
          }
        });

        await poseInstance.initialize();
        if (isMounted) {
          poseRef.current = poseInstance;
          setPoseReady(true);
        }
      } catch (err) {
        console.error(`Failed to initialize MediaPipe Pose for ${title}:`, err);
      }
    }

    initPoseEngine();

    return () => {
      isMounted = false;
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      if (poseRef.current) {
        try {
          poseRef.current.close();
        } catch (e) {}
        poseRef.current = null;
      }
    };
  }, []);

  // Handle WebRTC stream initialization whenever selectedDeviceId, isPoweredOn, or systemActive changes
  useEffect(() => {
    let activeStream = null;

    async function startCamera() {
      setErrorMsg(null);

      // Stop existing tracks if powered off or system stopped
      if (!systemActive || !isPoweredOn || !selectedDeviceId) {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        setStream(null);
        setIsStreaming(false);
        setFps(0);
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        return;
      }

      try {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        // Multi-level camera acquisition strategy
        if (selectedDeviceId && selectedDeviceId !== 'default') {
          try {
            activeStream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: selectedDeviceId } }
            });
          } catch (e1) {
            try {
              activeStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: selectedDeviceId }
              });
            } catch (e2) {
              console.warn(`Exact match failed for ${title}, falling back:`, e2);
            }
          }
        }

        // Fallback to standard video stream ONLY for Cam 1 (Laptop Built-in Camera)
        if (!activeStream && camId === 'cam1') {
          activeStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        setStream(activeStream);

        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(e => console.warn('Auto-play blocked:', e));
            setIsStreaming(true);
          };
          if (videoRef.current.readyState >= 2) {
            videoRef.current.play().catch(e => console.warn('Auto-play blocked:', e));
            setIsStreaming(true);
          }
        }
      } catch (err) {
        console.error(`Error opening camera for ${title}:`, err);
        setErrorMsg('Camera access denied or device in use.');
        setIsStreaming(false);
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedDeviceId, isPoweredOn, systemActive]);

  // Frame processing loop for MediaPipe Pose
  useEffect(() => {
    let isMounted = true;

    async function processFrame() {
      if (!isMounted) return;

      const video = videoRef.current;
      if (
        systemActive &&
        isPoweredOn &&
        isStreaming &&
        poseReady &&
        poseRef.current &&
        video &&
        video.readyState >= 2 &&
        video.videoWidth > 0
      ) {
        if (!isProcessingRef.current) {
          isProcessingRef.current = true;
          try {
            await poseRef.current.send({ image: video });
          } catch (e) {
            // Skip frame on busy loop
          } finally {
            isProcessingRef.current = false;
          }

          // Calculate FPS
          const now = performance.now();
          frameCountRef.current++;
          if (now - lastTimeRef.current >= 1000) {
            const currentFps = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current));
            setFps(currentFps);
            if (onFpsUpdate) onFpsUpdate(currentFps);
            frameCountRef.current = 0;
            lastTimeRef.current = now;
          }
        }
      }

      if (systemActive && isPoweredOn && isStreaming && poseReady) {
        animFrameId.current = requestAnimationFrame(processFrame);
      }
    }

    if (systemActive && isPoweredOn && isStreaming && poseReady) {
      animFrameId.current = requestAnimationFrame(processFrame);
    }

    return () => {
      isMounted = false;
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isStreaming, isPoweredOn, systemActive, poseReady]);

  // Render Skeleton Overlay on Canvas
  const handlePoseResults = (results) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video || !systemActive || !isPoweredOn) return;

    const ctx = canvas.getContext('2d');
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    if (isMirroredRef.current) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    if (showSkeletonRef.current && results && results.poseLandmarks && results.poseLandmarks.length > 0) {
      const landmarks = results.poseLandmarks;

      // 1. Draw glowing green skeleton connector lines across all 3 feeds
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 8;

      for (const [i, j] of POSE_CONNECTIONS) {
        const lm1 = landmarks[i];
        const lm2 = landmarks[j];
        if (lm1 && lm2) {
          ctx.beginPath();
          ctx.moveTo(lm1.x * width, lm1.y * height);
          ctx.lineTo(lm2.x * width, lm2.y * height);
          ctx.stroke();
        }
      }

      // 2. Draw glowing white keypoint joint circles across all 3 feeds
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;

      for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i];
        if (lm) {
          ctx.beginPath();
          ctx.arc(lm.x * width, lm.y * height, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#10b981';
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  };

  const isFeedActive = systemActive && isPoweredOn && isStreaming && !errorMsg;

  return (
    <div className={`clean-card camera-card card-${camId}`}>
      {/* Card Header */}
      <div className="camera-card-header">
        <div className="camera-title-group">
          <span className={`camera-tag ${tagClass}`}>{tagLabel}</span>
          <h3 className="camera-name">{title}</h3>
        </div>

        {/* Row 2: Device Dropdown + Power Button Side by Side */}
        <div className="camera-header-row2">
          <div className="device-select-wrapper">
            <select
              className="device-select"
              value={selectedDeviceId || ''}
              onChange={(e) => onSelectDevice(e.target.value)}
              disabled={!systemActive || !isPoweredOn}
            >
              {!selectedDeviceId || availableDevices.length === 0 ? (
                <option value="">No camera selected / Offline</option>
              ) : (
                availableDevices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Camera Device ${idx + 1}`}
                  </option>
                ))
              )}
            </select>
            <ChevronDown size={14} className="select-arrow" />
          </div>

          {/* Cam ON/OFF Power Toggle beside dropdown */}
          <button
            className={`toggle-btn power-toggle-btn ${isPoweredOn && systemActive ? 'active' : ''}`}
            onClick={() => setIsPoweredOn(!isPoweredOn)}
            disabled={!systemActive}
            title="Toggle individual camera feed power ON/OFF"
          >
            <Power size={14} style={{ color: isPoweredOn && systemActive ? '#059669' : '#e11d48' }} />
            <span>{isPoweredOn ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Video Viewport Stage */}
      <div className="video-viewport">
        {!systemActive ? (
          <div className="video-placeholder">
            <div className="placeholder-icon" style={{ borderColor: '#fda4af', color: '#e11d48' }}>
              <PauseCircle size={28} />
            </div>
            <p style={{ color: '#e11d48', fontWeight: 700, fontSize: '0.85rem' }}>MONITORING STOPPED</p>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Click "Start Monitoring" in header to resume</p>
          </div>
        ) : !isPoweredOn ? (
          <div className="video-placeholder">
            <div className="placeholder-icon" style={{ borderColor: '#cbd5e1', color: '#64748b' }}>
              <Power size={28} />
            </div>
            <p style={{ color: '#475569', fontWeight: 700, fontSize: '0.85rem' }}>CAMERA OFF</p>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Click "ON" button above to activate feed</p>
          </div>
        ) : errorMsg ? (
          <div className="video-placeholder">
            <div className="placeholder-icon">
              <VideoOff size={26} />
            </div>
            <p style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.85rem' }}>{errorMsg}</p>
            <p style={{ fontSize: '0.75rem' }}>Select another device from dropdown above</p>
          </div>
        ) : !selectedDeviceId ? (
          <div className="video-placeholder">
            <div className="placeholder-icon">
              <VideoOff size={26} />
            </div>
            <p style={{ color: '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>NO CAMERA CONNECTED</p>
            <p style={{ fontSize: '0.75rem' }}>Select device or plug USB camera</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className={`feed-video ${isMirrored ? 'mirrored' : ''} ${fitCover ? 'fit-cover' : ''}`}
              playsInline
              muted
            />

            <canvas ref={canvasRef} className={`skeleton-canvas ${fitCover ? 'fit-cover' : ''}`} />

            {/* Viewport HUD Elements */}
            <div className="hud-badge hud-top-left">
              <span className="status-dot-green" style={{ backgroundColor: isFeedActive ? '#10b981' : '#ef4444' }} />
              <span>{isFeedActive ? 'LIVE FEED' : 'CONNECTING...'}</span>
            </div>

            <div className="hud-badge hud-top-right">
              {showSkeleton ? 'SKELETON ON' : 'RAW FEED'}
            </div>

            <div className="hud-badge hud-bottom-left">
              <span>{fps} FPS</span> | <span>{fitCover ? 'Crop/Fill' : 'Uncropped Fit'}</span>
            </div>
          </>
        )}
      </div>

      {/* Card Footer Controls */}
      <div className="camera-card-footer">
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Skeleton Overlay Toggle */}
          <button
            className={`toggle-btn ${showSkeleton ? 'active' : ''}`}
            onClick={() => setShowSkeleton(!showSkeleton)}
            disabled={!systemActive || !isPoweredOn}
          >
            {showSkeleton ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>Skeleton</span>
          </button>

          {/* Mirror Toggle */}
          <button
            className={`toggle-btn ${isMirrored ? 'active' : ''}`}
            onClick={() => setIsMirrored(!isMirrored)}
            disabled={!systemActive || !isPoweredOn}
            title="Mirror feed horizontal flip"
          >
            <FlipHorizontal size={14} />
            <span>Mirror</span>
          </button>

          {/* Fit / Fill Toggle */}
          <button
            className={`toggle-btn ${fitCover ? 'active' : ''}`}
            onClick={() => setFitCover(!fitCover)}
            disabled={!systemActive || !isPoweredOn}
            title="Toggle video fit mode (Fit = full uncropped view, Fill = crop to card)"
          >
            {fitCover ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{fitCover ? 'Crop/Fill' : 'Full Fit'}</span>
          </button>
        </div>

        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {camId === 'cam1' ? 'Target: Front View' : (camId === 'cam2' ? 'Target: Left-Side View' : 'Target: Right-Side View')}
        </span>
      </div>
    </div>
  );
}
