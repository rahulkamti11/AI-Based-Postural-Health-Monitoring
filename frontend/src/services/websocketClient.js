/**
 * WebSocket Client Service with Real-Time Keypoint Streaming
 * AI-Based Sitting Posture Detection and Postural Health Monitoring System
 */

export class PostureWebSocketClient {
  constructor(url = 'ws://localhost:8000/ws/posture') {
    this.url = url;
    this.ws = null;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.reconnectTimer = null;
    this.isConnected = false;
    this.lastSentTime = {};
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      this.intentionalDisconnect = false;
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.notifyStatus('connected');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyMessage(data);
        } catch (e) {
          console.error("Error parsing WebSocket JSON payload:", e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.notifyStatus('disconnected');
        if (!this.intentionalDisconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn("WebSocket Error:", err);
        this.notifyStatus('error');
      };
    } catch (e) {
      console.error("Failed to establish WebSocket connection:", e);
      this.scheduleReconnect();
    }
  }

  /**
   * Sends live 3D landmark keypoints from browser video feed to backend for genuine ML inference.
   * Throttle sending to ~5-10 FPS (every 100ms-200ms) for high performance.
   */
  sendLandmarks(landmarks, camId = 'front') {
    const now = Date.now();
    const last = this.lastSentTime[camId] || 0;
    if (now - last < 100) return; // Cap at 10 FPS rate
    this.lastSentTime[camId] = now;

    if (this.ws && this.ws.readyState === WebSocket.OPEN && landmarks) {
      const payload = {
        type: 'landmarks',
        camera_id: camId,
        landmarks: landmarks,
        timestamp: now / 1000.0
      };
      this.ws.send(JSON.stringify(payload));
    }
  }

  scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 3000);
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  subscribeStatus(callback) {
    this.statusListeners.add(callback);
    callback(this.isConnected ? 'connected' : 'disconnected');
    return () => this.statusListeners.delete(callback);
  }

  notifyMessage(data) {
    this.listeners.forEach(cb => cb(data));
  }

  notifyStatus(status) {
    this.statusListeners.forEach(cb => cb(status));
  }

  disconnect() {
    this.intentionalDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.notifyStatus('disconnected');
  }
}

export const postureSocket = new PostureWebSocketClient();
