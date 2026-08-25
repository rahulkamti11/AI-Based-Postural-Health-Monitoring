/**
 * WebSocket Client Service
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
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
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
        this.scheduleReconnect();
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
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const postureSocket = new PostureWebSocketClient();
