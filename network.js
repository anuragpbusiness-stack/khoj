// network.js - Real-Time Presence & Direct Messaging via Global EMQX MQTT
class NetworkManager {
  constructor() {
    this.mqttClient = null;
    this.sessionId = 'u_' + Math.random().toString(36).substr(2, 9);
    this.partnerId = null;
    this.partnerOnline = false;
    this.lastPartnerSeen = 0;
    this.currentPassword = 'vision.aa';
    this.topicHash = null;
    this.presenceTopic = null;
    this.messageTopic = null;

    this.listeners = new Map();
    this.statusListeners = [];
    this.heartbeatTimer = null;
    this.watchdogTimer = null;
    this.isConnecting = false;

    // Send immediate offline signal when user closes or reloads tab
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.publishOffline();
      });
      window.addEventListener('pagehide', () => {
        this.publishOffline();
      });
    }
  }

  onStatus(callback) {
    this.statusListeners.push(callback);
  }

  notifyStatus(status, details = {}) {
    this.statusListeners.forEach(cb => {
      try { cb(status, details); } catch (e) { console.error('Error in status listener:', e); }
    });
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
  }

  emit(event, payload) {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach(h => {
      try { h(payload); } catch (e) { console.error('Error in event handler:', e); }
    });
  }

  send(event, payload = {}) {
    if (this.mqttClient && this.mqttClient.connected && this.messageTopic) {
      const msg = JSON.stringify({
        sender: this.sessionId,
        event: event,
        payload: payload,
        timestamp: Date.now()
      });
      this.mqttClient.publish(this.messageTopic, msg, { qos: 1 });
    }
  }

  async hashPassword(password) {
    const msgBuffer = new TextEncoder().encode("khoj-presence-salt-" + password.trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 20);
  }

  getMqttLib() {
    if (typeof window !== 'undefined' && window.mqtt) return window.mqtt;
    if (typeof globalThis !== 'undefined' && globalThis.mqtt) return globalThis.mqtt;
    if (typeof require !== 'undefined') {
      try { return require('mqtt'); } catch (e) {}
    }
    return null;
  }

  async connectWithPassword(password = 'vision.aa') {
    this.destroy();
    this.isConnecting = true;
    this.currentPassword = (password || 'vision.aa').trim();
    this.topicHash = await this.hashPassword(this.currentPassword);
    this.presenceTopic = `u2_khoj_${this.topicHash}/presence`;
    this.messageTopic = `u2_khoj_${this.topicHash}/msg`;

    const mqttLib = this.getMqttLib();
    if (!mqttLib) {
      console.warn('MQTT library not loaded. Retrying in 500ms...');
      setTimeout(() => this.connectWithPassword(password), 500);
      return;
    }

    this.notifyStatus('connecting', { message: 'Connecting to real-time network...' });

    try {
      // Connect to global enterprise WebSocket broker with Last Will and Testament (LWT)
      this.mqttClient = mqttLib.connect('wss://broker.emqx.io:8084/mqtt', {
        clientId: 'client_' + this.sessionId,
        clean: true,
        reconnectPeriod: 2500,
        keepalive: 15,
        will: {
          topic: this.presenceTopic,
          payload: JSON.stringify({
            sender: this.sessionId,
            type: 'presence',
            status: 'offline',
            timestamp: Date.now()
          }),
          qos: 1,
          retain: false
        }
      });

      this.mqttClient.on('connect', () => {
        console.log('⚡ Real-time presence connected. Subscribing to:', this.presenceTopic);
        this.isConnecting = false;

        this.mqttClient.subscribe(this.presenceTopic, { qos: 1 });
        this.mqttClient.subscribe(this.messageTopic, { qos: 1 });

        // Initially we are waiting for partner
        if (!this.partnerOnline) {
          this.notifyStatus('waiting', { message: 'Waiting for partner...' });
        }

        // Immediately announce online presence and query if partner is already online
        this.publishPresence('online', true);

        // Start heartbeat & watchdog loops
        this.startHeartbeat();
        this.startWatchdog();
      });

      this.mqttClient.on('message', (topic, payload) => {
        try {
          const data = JSON.parse(payload.toString());
          if (!data || data.sender === this.sessionId) {
            // Ignore own messages
            return;
          }

          if (topic === this.presenceTopic) {
            this.handlePresenceMessage(data);
          } else if (topic === this.messageTopic) {
            if (data.event) {
              this.emit(data.event, data.payload);
            }
          }
        } catch (err) {
          console.warn('Error parsing incoming message:', err);
        }
      });

      this.mqttClient.on('close', () => {
        this.handleDisconnect();
      });

      this.mqttClient.on('error', (err) => {
        console.warn('MQTT Network error:', err.message);
      });

    } catch (err) {
      console.error('Could not initialize presence:', err);
      this.notifyStatus('error', { message: 'Network connection failed' });
    }
  }

  handlePresenceMessage(data) {
    if (data.status === 'offline') {
      if (this.partnerId === data.sender || this.partnerOnline) {
        console.log('⚡ Partner signed off:', data.sender);
        this.partnerOnline = false;
        this.partnerId = null;
        this.notifyStatus('waiting', { message: 'Partner went offline.' });
      }
      return;
    }

    if (data.status === 'online') {
      const now = Date.now();
      this.lastPartnerSeen = now;
      this.partnerId = data.sender;
      
      const latency = Math.max(8, Math.min(450, Math.round((now - (data.timestamp || now)))));

      if (!this.partnerOnline) {
        console.log('⚡ Partner came online:', data.sender);
        this.partnerOnline = true;
        this.notifyStatus('connected', { partnerId: data.sender, latency });
      }

      this.notifyStatus('latency', { latency });

      // If partner is asking who is online (isPing), reply immediately with a pong!
      if (data.isPing) {
        this.publishPresence('online', false, true);
      }
    }
  }

  publishPresence(status, isPing = false, isPong = false) {
    if (this.mqttClient && this.mqttClient.connected && this.presenceTopic) {
      const payload = JSON.stringify({
        sender: this.sessionId,
        type: 'presence',
        status: status,
        isPing: isPing,
        isPong: isPong,
        timestamp: Date.now()
      });
      this.mqttClient.publish(this.presenceTopic, payload, { qos: 1 });
    }
  }

  publishOffline() {
    if (this.mqttClient && this.mqttClient.connected && this.presenceTopic) {
      try {
        const payload = JSON.stringify({
          sender: this.sessionId,
          type: 'presence',
          status: 'offline',
          timestamp: Date.now()
        });
        this.mqttClient.publish(this.presenceTopic, payload, { qos: 1 });
      } catch (e) {}
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    // Send active presence heartbeat every 3 seconds
    this.heartbeatTimer = setInterval(() => {
      if (this.mqttClient && this.mqttClient.connected) {
        this.publishPresence('online');
      }
    }, 3000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  startWatchdog() {
    this.stopWatchdog();
    // Check every second if partner's heartbeat stopped (> 6.5s)
    this.watchdogTimer = setInterval(() => {
      if (this.partnerOnline) {
        const elapsed = Date.now() - this.lastPartnerSeen;
        if (elapsed > 6500) {
          console.log('⚡ Partner heartbeat timeout elapsed:', elapsed);
          this.partnerOnline = false;
          this.partnerId = null;
          this.notifyStatus('waiting', { message: 'Partner went offline.' });
        }
      }
    }, 1000);
  }

  stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  handleDisconnect() {
    this.partnerOnline = false;
    this.notifyStatus('waiting', { message: 'Disconnected from network' });
  }

  destroy() {
    this.publishOffline();
    this.stopHeartbeat();
    this.stopWatchdog();
    if (this.mqttClient) {
      try { this.mqttClient.end(true); } catch (e) {}
      this.mqttClient = null;
    }
    this.partnerOnline = false;
    this.partnerId = null;
    this.isConnecting = false;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = NetworkManager;
} else {
  window.NetworkManager = NetworkManager;
}
