// network.js - Automatic 2-User Peer-to-Peer Pairing via Shared Password
class NetworkManager {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.slot = null;
    this.passwordHash = null;
    this.currentPassword = null;
    this.listeners = new Map();
    this.statusListeners = [];
    this.pingInterval = null;
    this.partnerLatency = null;
    this.isConnecting = false;
  }

  onStatus(callback) {
    this.statusListeners.push(callback);
  }

  notifyStatus(status, details = {}) {
    this.statusListeners.forEach(cb => cb(status, details));
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
  }

  emit(event, payload) {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach(h => h(payload));
  }

  send(event, payload = {}) {
    if (this.conn && this.conn.open) {
      this.conn.send({ event, payload, timestamp: Date.now() });
    } else {
      console.warn('Network: Cannot send, connection not open');
    }
  }

  async hashPassword(password) {
    const msgBuffer = new TextEncoder().encode("2u-salt-" + password.trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 18);
  }

  getPeerClass() {
    if (typeof require !== 'undefined') {
      try {
        const p = require('peerjs');
        return p.Peer || p;
      } catch (e) {}
    }
    if (window.Peer) return window.Peer;
    throw new Error('PeerJS not loaded');
  }

  async connectWithPassword(password = 'vision.aa') {
    if (!password || !password.trim()) {
      password = 'vision.aa';
    }

    this.destroy();
    this.isConnecting = true;
    this.currentPassword = password.trim();
    this.passwordHash = await this.hashPassword(this.currentPassword);

    const PeerClass = this.getPeerClass();
    const idSlot1 = `u2-${this.passwordHash}-1`;
    const idSlot2 = `u2-${this.passwordHash}-2`;

    this.notifyStatus('connecting', { message: 'Checking password and connecting...' });

    // Step 1: Try to claim Slot 1
    const trySlot1 = () => {
      this.peer = new PeerClass(idSlot1, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      });

      this.peer.on('open', () => {
        this.slot = 1;
        this.isConnecting = false;
        this.notifyStatus('waiting', { 
          message: 'Password active. Waiting for your partner to open the app (1/2 online).' 
        });
      });

      this.peer.on('connection', (incomingConn) => {
        if (this.conn && this.conn.open) {
          // Extra participant rejected
          incomingConn.on('open', () => {
            incomingConn.send({ event: '__room_full__', payload: 'Max 2 people reached' });
            setTimeout(() => incomingConn.close(), 500);
          });
          return;
        }
        this.setupConnection(incomingConn);
      });

      this.peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          // Slot 1 is already taken by your partner! We will take Slot 2 and connect to Slot 1.
          trySlot2();
        } else {
          this.isConnecting = false;
          this.notifyStatus('error', { message: err.message || 'Network error' });
        }
      });
    };

    // Step 2: If Slot 1 was taken, claim Slot 2 and connect to Slot 1
    const trySlot2 = () => {
      if (this.peer) {
        try { this.peer.destroy(); } catch (e) {}
      }

      this.peer = new PeerClass(idSlot2, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      });

      this.peer.on('open', () => {
        this.slot = 2;
        this.isConnecting = false;
        this.notifyStatus('connecting', { message: 'Partner detected! Connecting...' });

        // Connect directly to partner on Slot 1
        const outgoing = this.peer.connect(idSlot1, { reliable: true });
        this.setupConnection(outgoing);
      });

      this.peer.on('error', (err) => {
        this.isConnecting = false;
        if (err.type === 'unavailable-id') {
          this.notifyStatus('error', { 
            message: 'Access denied: 2 users are already connected with this password.' 
          });
        } else {
          this.notifyStatus('error', { message: err.message || 'Connection error' });
        }
      });
    };

    trySlot1();
  }

  setupConnection(conn) {
    this.conn = conn;

    conn.on('open', () => {
      this.notifyStatus('connected', { 
        message: 'Connected with partner (2/2 online)' 
      });
      this.startHeartbeat();
    });

    conn.on('data', (data) => {
      if (!data || !data.event) return;

      if (data.event === '__room_full__') {
        this.notifyStatus('error', { message: 'Max 2 users already connected with this password' });
        this.destroy();
        return;
      }

      if (data.event === '__ping__') {
        this.send('__pong__', { clientTime: data.payload.clientTime });
        return;
      }

      if (data.event === '__pong__') {
        const now = Date.now();
        this.partnerLatency = Math.max(1, Math.round((now - data.payload.clientTime) / 2));
        this.notifyStatus('latency', { latency: this.partnerLatency });
        return;
      }

      this.emit(data.event, data.payload);
    });

    conn.on('close', () => {
      this.stopHeartbeat();
      this.conn = null;
      if (this.slot === 1) {
        this.notifyStatus('waiting', { 
          message: 'Partner went offline. Waiting for partner (1/2 online).' 
        });
      } else {
        // If slot 2 lost connection, re-evaluate slots
        this.notifyStatus('disconnected', { message: 'Partner disconnected. Reconnecting...' });
        setTimeout(() => {
          if (this.currentPassword) this.connectWithPassword(this.currentPassword);
        }, 2000);
      }
    });

    conn.on('error', (err) => {
      console.error('Conn error:', err);
      this.notifyStatus('error', { message: 'Connection interrupted' });
    });
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.conn && this.conn.open) {
        this.send('__ping__', { clientTime: Date.now() });
      }
    }, 4000);
  }

  stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  destroy() {
    this.stopHeartbeat();
    if (this.conn) {
      try { this.conn.close(); } catch (e) {}
      this.conn = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
      this.peer = null;
    }
    this.slot = null;
    this.isConnecting = false;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = NetworkManager;
} else {
  window.NetworkManager = NetworkManager;
}
