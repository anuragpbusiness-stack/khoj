// store.js - Ultra-Fast Real-Time & Retained Cloud Sync for 2 Users
class SharedStore {
  constructor(network) {
    this.network = network;
    this.storageKey = 'two_user_space_data_v3';
    this.changeListeners = [];
    this.mqttClient = null;
    this.topic = null;

    // Initial state template - Clean pristine state
    this.state = {
      lastUpdated: 0,
      feed: [],
      vision: [],
      podcasts: [],
      books: [],
      people: [],
      events: [],
      circles: []
    };

    this.loadLocal();
    this.initMqttSync('vision.aa');
    this.setupNetworkP2PSync();
  }

  loadLocal() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          this.state = { ...this.state, ...parsed };
        }
      }
      // Ensure all mock/sample IDs are purged
      if (this.state.feed) {
        this.state.feed = this.state.feed.filter(f => f.id && !f.id.startsWith('feed_sample_'));
      }
    } catch (e) {
      console.warn('Could not load local state:', e);
    }
  }

  saveLocal() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Could not save local state:', e);
    }
    this.notify();
  }

  onChange(listener) {
    this.changeListeners.push(listener);
    // Call immediately with current state
    listener(this.state);
  }

  notify() {
    this.changeListeners.forEach(cb => cb(this.state));
  }

  async initMqttSync(password) {
    // Generate private topic from password
    const msgBuffer = new TextEncoder().encode("mqtt-salt-" + password.trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const topicHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
    this.topic = `u2_sanctuary_${topicHash}`;

    const getMqtt = () => {
      if (typeof window !== 'undefined' && window.mqtt) return window.mqtt;
      if (typeof require !== 'undefined') {
        try { return require('mqtt'); } catch (e) {}
      }
      return null;
    };

    const mqttLib = getMqtt();
    if (!mqttLib) {
      console.warn('MQTT library not loaded yet');
      return;
    }

    try {
      // Connect to global secure WebSocket broker
      this.mqttClient = mqttLib.connect('wss://broker.emqx.io:8084/mqtt', {
        clientId: 'u2_' + Math.random().toString(16).substr(2, 8),
        clean: true,
        reconnectPeriod: 3000
      });

      this.mqttClient.on('connect', () => {
        console.log('⚡ High-speed cloud sync connected. Subscribing to topic:', this.topic);
        this.mqttClient.subscribe(this.topic, { qos: 1 });
      });

      this.mqttClient.on('message', (t, payload) => {
        if (t !== this.topic) return;
        try {
          const incomingState = JSON.parse(payload.toString());
          if (incomingState && incomingState.lastUpdated > this.state.lastUpdated) {
            console.log('⚡ Received newer state from cloud/partner:', incomingState);
            this.state = incomingState;
            this.saveLocal();
            if (window.AppAPI && window.AppAPI.showToast) {
              window.AppAPI.showToast('⚡ Instant Live Sync: Content updated!');
            }
          }
        } catch (err) {
          console.error('Error parsing MQTT message:', err);
        }
      });

      this.mqttClient.on('error', (err) => {
        console.warn('MQTT error:', err.message);
      });
    } catch (err) {
      console.warn('Could not initialize MQTT:', err);
    }
  }

  setupNetworkP2PSync() {
    if (!this.network) return;

    // WebRTC Direct fallback
    this.network.on('__state_direct_update__', (incomingState) => {
      if (incomingState && incomingState.lastUpdated > this.state.lastUpdated) {
        this.state = incomingState;
        this.saveLocal();
      }
    });
  }

  // Broadcast change immediately to both Cloud (retained) and Direct P2P
  broadcastUpdate() {
    this.state.lastUpdated = Date.now();
    this.saveLocal();

    const payloadStr = JSON.stringify(this.state);

    // 1. Publish to Cloud Broker with retain:true (so partner receives it in milliseconds now or whenever they open the app)
    if (this.mqttClient && this.mqttClient.connected && this.topic) {
      this.mqttClient.publish(this.topic, payloadStr, { retain: true, qos: 1 });
    }

    // 2. Also send over direct WebRTC DataChannel if peer connection is active
    if (this.network) {
      this.network.send('__state_direct_update__', this.state);
    }
  }

  // Vision mutations
  addVisionItem(title, description, category = 'General', author = 'You') {
    if (!this.state.vision) this.state.vision = [];
    this.state.vision.unshift({
      id: 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: title || 'Untitled Vision',
      description: description || '',
      category: category,
      created: Date.now(),
      author: author
    });
    this.logFeedUpload({
      type: category === 'Atomic Idea' ? 'ATOMIC IDEA' : (category === 'Wall Note' ? 'LIVE WALL NOTE' : 'VISION'),
      title: title || 'Untitled Vision',
      body: description || '',
      meta: category,
      author: author
    });
    this.broadcastUpdate();
  }

  removeVisionItem(id) {
    this.state.vision = (this.state.vision || []).filter(v => v.id !== id);
    this.broadcastUpdate();
  }

  // Podcasts mutations
  addPodcastItem(title, url, takeaways, author = 'You') {
    if (!this.state.podcasts) this.state.podcasts = [];
    this.state.podcasts.unshift({
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: title || 'Untitled Podcast',
      url: url || '',
      takeaways: takeaways || '',
      created: Date.now(),
      author: author
    });
    this.logFeedUpload({
      type: 'PODCAST',
      title: title || 'Untitled Podcast',
      body: takeaways || '',
      meta: url || 'Audio / Video Episode',
      author: author
    });
    this.broadcastUpdate();
  }

  removePodcastItem(id) {
    this.state.podcasts = (this.state.podcasts || []).filter(p => p.id !== id);
    this.broadcastUpdate();
  }

  // Books mutations
  addBookItem(title, authorName, notes, status = 'Currently Reading', author = 'You') {
    if (!this.state.books) this.state.books = [];
    this.state.books.unshift({
      id: 'b_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: title || 'Untitled Book',
      author: authorName || 'Unknown Author',
      notes: notes || '',
      status: status,
      created: Date.now(),
      author: author
    });
    this.logFeedUpload({
      type: 'BOOK',
      title: `${title} (by ${authorName || 'Unknown'})`,
      body: notes || '',
      meta: status,
      author: author
    });
    this.broadcastUpdate();
  }

  removeBookItem(id) {
    this.state.books = (this.state.books || []).filter(b => b.id !== id);
    this.broadcastUpdate();
  }

  logFeedUpload(entry) {
    if (!this.state.feed) this.state.feed = [];
    this.state.feed.unshift({
      id: 'feed_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type: entry.type || 'UPLOAD',
      title: entry.title || '',
      body: entry.body || '',
      meta: entry.meta || '',
      author: entry.author || 'You',
      timestamp: Date.now()
    });
  }

  removeFeedPost(id) {
    this.state.feed = (this.state.feed || []).filter(f => f.id !== id);
    this.broadcastUpdate();
  }

  // People mutations
  addPersonItem(name, role, quote, author = 'You') {
    if (!this.state.people) this.state.people = [];
    this.state.people.unshift({
      id: 'person_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: name || 'Unnamed Person',
      role: role || 'Builder & Thinker',
      quote: quote || '',
      created: Date.now(),
      author: author
    });
    this.logFeedUpload({
      type: 'PERSON',
      title: name || 'Unnamed Person',
      body: quote || '',
      meta: role || 'Builder Profile',
      author: author
    });
    this.broadcastUpdate();
  }

  removePersonItem(id) {
    this.state.people = (this.state.people || []).filter(p => p.id !== id);
    this.broadcastUpdate();
  }

  // Events mutations
  addEventItem(title, cityDate, desc, author = 'You') {
    if (!this.state.events) this.state.events = [];
    this.state.events.unshift({
      id: 'ev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: title || 'Untitled Gathering',
      city: cityDate || 'Location TBA',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase(),
      year: new Date().getFullYear().toString(),
      venue: cityDate || 'TBA',
      stats: 'Curated Gathering',
      desc: desc || '',
      created: Date.now(),
      author: author
    });
    this.logFeedUpload({
      type: 'EVENT',
      title: title || 'Untitled Gathering',
      body: desc || '',
      meta: cityDate || 'Salon / Gathering',
      author: author
    });
    this.broadcastUpdate();
  }

  removeEventItem(id) {
    this.state.events = (this.state.events || []).filter(e => e.id !== id);
    this.broadcastUpdate();
  }

  // Circles mutations
  addCircleItem(name, domain, desc, author = 'You') {
    if (!this.state.circles) this.state.circles = [];
    this.state.circles.unshift({
      id: 'circ_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: name || 'Untitled Circle',
      tag: domain || 'DOMAIN ROOM',
      desc: desc || '',
      members: '2 Members (Private)',
      activeDiscussions: '1 Active Discussion',
      created: Date.now(),
      author: author
    });
    this.logFeedUpload({
      type: 'CIRCLE',
      title: name || 'Untitled Circle',
      body: desc || '',
      meta: domain || 'Private Circle',
      author: author
    });
    this.broadcastUpdate();
  }

  removeCircleItem(id) {
    this.state.circles = (this.state.circles || []).filter(c => c.id !== id);
    this.broadcastUpdate();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SharedStore;
} else {
  window.SharedStore = SharedStore;
}
