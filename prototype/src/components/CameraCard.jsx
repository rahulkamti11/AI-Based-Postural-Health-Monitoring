import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Eye, EyeOff, FlipHorizontal, VideoOff, Maximize2, Minimize2 } from 'lucide-react';
import { Pose } from '@mediapipe/pose';

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
  subtitle,
  availableDevices,
  selectedDeviceId,
  onSelectDevice,
  onFpsUpdate
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [isMirrored, setIsMirrored] = useState(false);
  const [fitCover, setFitCover] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [fps, setFps] = useState(0);

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

  // Initialize MediaPipe Pose instance
  useEffect(() => {
    let poseInstance = null;

    try {
      poseInstance = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`
      });

      poseInstance.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      poseInstance.onResults((results) => {
        handlePoseResults(results);
      });

      poseRef.current = poseInstance;
    } catch (err) {
      console.error('Failed to initialize MediaPipe Pose:', err);
    }

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      if (poseInstance) poseInstance.close();
    };
  }, []);

  // Handle stream initialization whenever selectedDeviceId changes
  useEffect(() => {
    let activeStream = null;

    async function startCamera() {
      setErrorMsg(null);
      try {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        // Multi-level robust camera acquisition strategy
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
              console.warn(`Exact match failed for ${title}, falling back to default video:`, e2);
            }
          }
        }

        // Fallback to standard video stream (works for built-in PC cameras & USB devices)
        if (!activeStream) {
          activeStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        setStream(activeStream);

        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(e => console.warn('Auto-play blocked:', e));
            setIsStreaming(true);
          };
        }
      } catch (err) {
        console.error(`Error opening camera for ${title}:`, err);
        setErrorMsg('Camera access denied or device in use by another application.');
        setIsStreaming(false);
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedDeviceId]);

  // Frame processing loop for MediaPipe Pose
  useEffect(() => {
    let isMounted = true;

    async function processFrame() {
      if (!isMounted) return;

      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0 && poseRef.current && isStreaming) {
        if (!isProcessingRef.current) {
          isProcessingRef.current = true;
          try {
            await poseRef.current.send({ image: video });
          } catch (e) {
            // Ignore frame skip errors during device switching
          }
          isProcessingRef.current = false;

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

      animFrameId.current = requestAnimationFrame(processFrame);
    }

    if (isStreaming) {
      animFrameId.current = requestAnimationFrame(processFrame);
    }

    return () => {
      isMounted = false;
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isStreaming]);

  // Render Skeleton Overlay on Canvas
  const handlePoseResults = (results) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) return;

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

    if (showSkeletonRef.current && results && results.poseLandmarks) {
      const landmarks = results.poseLandmarks;

      // 1. Draw glowing skeleton connector lines
      ctx.lineWidth = 4;
      ctx.strokeStyle = camId === 'cam1' ? '#4f46e5' : (camId === 'cam2' ? '#8b5cf6' : '#059669');
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 8;

      for (const [i, j] of POSE_CONNECTIONS) {
        const lm1 = landmarks[i];
        const lm2 = landmarks[j];
        if (lm1 && lm2 && (lm1.visibility ?? 1) > 0.3 && (lm2.visibility ?? 1) > 0.3) {
          ctx.beginPath();
          ctx.moveTo(lm1.x * width, lm1.y * height);
          ctx.lineTo(lm2.x * width, lm2.y * height);
          ctx.stroke();
        }
      }

      // 2. Draw glowing keypoint joint circles
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 10;

      for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i];
        if (lm && (lm.visibility ?? 1) > 0.3) {
          ctx.beginPath();
          ctx.arc(lm.x * width, lm.y * height, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  };

  return (
    <div className={`clean-card camera-card card-${camId}`}>
      {/* Card Header */}
      <div className="camera-card-header">
        <div className="camera-title-group">
          <span className={`camera-tag ${tagClass}`}>{tagLabel}</span>
          <div>
            <h3 className="camera-name">{title}</h3>
            <p className="camera-subtitle">{subtitle}</p>
          </div>
        </div>

        {/* Device Select Dropdown (Row 2 - Full Width Below Title) */}
        <div className="device-select-wrapper">
          <select
            className="device-select"
            value={selectedDeviceId || ''}
            onChange={(e) => onSelectDevice(e.target.value)}
          >
            {availableDevices.length === 0 ? (
              <option value="">No cameras detected</option>
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
      </div>

      {/* Video Viewport Stage */}
      <div className="video-viewport">
        {errorMsg ? (
          <div className="video-placeholder">
            <div className="placeholder-icon">
              <VideoOff size={26} />
            </div>
            <p style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.85rem' }}>{errorMsg}</p>
            <p style={{ fontSize: '0.75rem' }}>Select another device from dropdown above</p>
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
              <span className="status-dot-green" style={{ backgroundColor: isStreaming ? '#10b981' : '#ef4444' }} />
              <span>{isStreaming ? 'LIVE FEED' : 'CONNECTING...'}</span>
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
          <button
            className={`toggle-btn ${showSkeleton ? 'active' : ''}`}
            onClick={() => setShowSkeleton(!showSkeleton)}
          >
            {showSkeleton ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>Skeleton</span>
          </button>

          <button
            className={`toggle-btn ${isMirrored ? 'active' : ''}`}
            onClick={() => setIsMirrored(!isMirrored)}
            title="Mirror feed horizontal flip"
          >
            <FlipHorizontal size={14} />
            <span>Mirror</span>
          </button>

          <button
            className={`toggle-btn ${fitCover ? 'active' : ''}`}
            onClick={() => setFitCover(!fitCover)}
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
