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
      circles: [],
      chat: []
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

  getUserId() {
    if (typeof window !== 'undefined' && window.localStorage) {
      let id = localStorage.getItem('khoj_user_uid');
      if (!id) {
        id = 'uid_' + Math.random().toString(36).substr(2, 8) + '_' + Date.now().toString(36);
        localStorage.setItem('khoj_user_uid', id);
      }
      return id;
    }
    return 'uid_local';
  }

  canDelete(item) {
    if (!item) return false;
    const myUid = this.getUserId();
    // Only the user who created/uploaded this item can remove it
    return !item.ownerId || item.ownerId === myUid;
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
    const myUid = this.getUserId();
    const itemId = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    this.state.vision.unshift({
      id: itemId,
      title: title || 'Untitled Vision',
      description: description || '',
      category: category,
      created: Date.now(),
      author: author,
      ownerId: myUid
    });
    this.logFeedUpload({
      feedItemId: itemId,
      type: category === 'Atomic Idea' ? 'ATOMIC IDEA' : (category === 'Wall Note' ? 'LIVE WALL NOTE' : 'VISION'),
      title: title || 'Untitled Vision',
      body: description || '',
      meta: category,
      author: author,
      ownerId: myUid
    });
    this.broadcastUpdate();
  }

  removeVisionItem(id) {
    const item = (this.state.vision || []).find(v => v.id === id);
    if (item && !this.canDelete(item)) {
      console.warn('Unauthorized removal: only the uploader can delete this note/idea');
      return false;
    }
    this.state.vision = (this.state.vision || []).filter(v => v.id !== id);
    this.state.feed = (this.state.feed || []).filter(f => f.id !== id && f.feedItemId !== id);
    this.broadcastUpdate();
    return true;
  }

  // Podcasts mutations
  addPodcastItem(title, url, takeaways, author = 'You') {
    if (!this.state.podcasts) this.state.podcasts = [];
    const myUid = this.getUserId();
    const itemId = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    this.state.podcasts.unshift({
      id: itemId,
      title: title || 'Untitled Podcast',
      url: url || '',
      takeaways: takeaways || '',
      created: Date.now(),
      author: author,
      ownerId: myUid
    });
    this.logFeedUpload({
      feedItemId: itemId,
      type: 'PODCAST',
      title: title || 'Untitled Podcast',
      body: takeaways || '',
      meta: url || 'Audio / Video Episode',
      author: author,
      ownerId: myUid
    });
    this.broadcastUpdate();
  }

  removePodcastItem(id) {
    const item = (this.state.podcasts || []).find(p => p.id === id);
    if (item && !this.canDelete(item)) {
      console.warn('Unauthorized removal: only the uploader can delete this podcast');
      return false;
    }
    this.state.podcasts = (this.state.podcasts || []).filter(p => p.id !== id);
    this.state.feed = (this.state.feed || []).filter(f => f.id !== id && f.feedItemId !== id);
    this.broadcastUpdate();
    return true;
  }

  // Books mutations
  addBookItem(title, authorName, notes, status = 'Currently Reading', author = 'You') {
    if (!this.state.books) this.state.books = [];
    const myUid = this.getUserId();
    const itemId = 'b_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    this.state.books.unshift({
      id: itemId,
      title: title || 'Untitled Book',
      author: authorName || 'Unknown Author',
      notes: notes || '',
      status: status,
      created: Date.now(),
      author: author,
      ownerId: myUid
    });
    this.logFeedUpload({
      feedItemId: itemId,
      type: 'BOOK',
      title: `${title} (by ${authorName || 'Unknown'})`,
      body: notes || '',
      meta: status,
      author: author,
      ownerId: myUid
    });
    this.broadcastUpdate();
  }

  removeBookItem(id) {
    const item = (this.state.books || []).find(b => b.id === id);
    if (item && !this.canDelete(item)) {
      console.warn('Unauthorized removal: only the uploader can delete this book');
      return false;
    }
    this.state.books = (this.state.books || []).filter(b => b.id !== id);
    this.state.feed = (this.state.feed || []).filter(f => f.id !== id && f.feedItemId !== id);
    this.broadcastUpdate();
    return true;
  }

  logFeedUpload(entry) {
    if (!this.state.feed) this.state.feed = [];
    const myUid = entry.ownerId || this.getUserId();
    this.state.feed.unshift({
      id: 'feed_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      feedItemId: entry.feedItemId || null,
      type: entry.type || 'UPLOAD',
      title: entry.title || '',
      body: entry.body || '',
      meta: entry.meta || '',
      author: entry.author || 'You',
      ownerId: myUid,
      timestamp: Date.now()
    });
  }

  removeFeedPost(id) {
    const item = (this.state.feed || []).find(f => f.id === id);
    if (item && !this.canDelete(item)) {
      console.warn('Unauthorized removal: only the uploader can delete this post');
      return false;
    }
    this.state.feed = (this.state.feed || []).filter(f => f.id !== id);
    this.broadcastUpdate();
    return true;
  }

  // People mutations
  addPersonItem(name, role, quote, author = 'You') {
    if (!this.state.people) this.state.people = [];
    const myUid = this.getUserId();
    const itemId = 'person_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    this.state.people.unshift({
      id: itemId,
      name: name || 'Unnamed Person',
      role: role || 'Builder & Thinker',
      quote: quote || '',
      created: Date.now(),
      author: author,
      ownerId: myUid
    });
    this.logFeedUpload({
      feedItemId: itemId,
      type: 'PERSON',
      title: name || 'Unnamed Person',
      body: quote || '',
      meta: role || 'Builder Profile',
      author: author,
      ownerId: myUid
    });
    this.broadcastUpdate();
  }

  removePersonItem(id) {
    const item = (this.state.people || []).find(p => p.id === id);
    if (item && !this.canDelete(item)) {
      console.warn('Unauthorized removal: only the uploader can delete this person profile');
      return false;
    }
    this.state.people = (this.state.people || []).filter(p => p.id !== id);
    this.state.feed = (this.state.feed || []).filter(f => f.id !== id && f.feedItemId !== id);
    this.broadcastUpdate();
    return true;
  }

  // Events mutations
  addEventItem(title, cityDate, desc, author = 'You') {
    if (!this.state.events) this.state.events = [];
    const myUid = this.getUserId();
    const itemId = 'ev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    this.state.events.unshift({
      id: itemId,
      title: title || 'Untitled Gathering',
      city: cityDate || 'Location TBA',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase(),
      year: new Date().getFullYear().toString(),
      venue: cityDate || 'TBA',
      stats: 'Curated Gathering',
      desc: desc || '',
      created: Date.now(),
      author: author,
      ownerId: myUid
    });
    this.logFeedUpload({
      feedItemId: itemId,
      type: 'EVENT',
      title: title || 'Untitled Gathering',
      body: desc || '',
      meta: cityDate || 'Salon / Gathering',
      author: author,
      ownerId: myUid
    });
    this.broadcastUpdate();
  }

  removeEventItem(id) {
    const item = (this.state.events || []).find(e => e.id === id);
    if (item && !this.canDelete(item)) {
      console.warn('Unauthorized removal: only the uploader can delete this event');
      return false;
    }
    this.state.events = (this.state.events || []).filter(e => e.id !== id);
    this.state.feed = (this.state.feed || []).filter(f => f.id !== id && f.feedItemId !== id);
    this.broadcastUpdate();
    return true;
  }

  // Circles mutations
  addCircleItem(name, domain, desc, author = 'You') {
    if (!this.state.circles) this.state.circles = [];
    const myUid = this.getUserId();
    const itemId = 'circ_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    this.state.circles.unshift({
      id: itemId,
      name: name || 'Untitled Circle',
      tag: domain || 'DOMAIN ROOM',
      desc: desc || '',
      members: '2 Members (Private)',
      activeDiscussions: '1 Active Discussion',
      created: Date.now(),
      author: author,
      ownerId: myUid
    });
    this.logFeedUpload({
      feedItemId: itemId,
      type: 'CIRCLE',
      title: name || 'Untitled Circle',
      body: desc || '',
      meta: domain || 'Private Circle',
      author: author,
      ownerId: myUid
    });
    this.broadcastUpdate();
  }

  removeCircleItem(id) {
    const item = (this.state.circles || []).find(c => c.id === id);
    if (item && !this.canDelete(item)) {
      console.warn('Unauthorized removal: only the creator can delete this circle');
      return false;
    }
    this.state.circles = (this.state.circles || []).filter(c => c.id !== id);
    this.state.feed = (this.state.feed || []).filter(f => f.id !== id && f.feedItemId !== id);
    this.broadcastUpdate();
    return true;
  }

  // Chat mutations
  sendChatMessage(text, context) {
    if (!this.state.chat) this.state.chat = [];
    const myUid = this.getUserId();
    const msgId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const msg = {
      id: msgId,
      text: text || '',
      ownerId: myUid,
      timestamp: Date.now(),
      context: context || null  // { type, title, id } — optional reference to an upload
    };
    this.state.chat.push(msg);
    // Keep last 200 messages only
    if (this.state.chat.length > 200) {
      this.state.chat = this.state.chat.slice(-200);
    }
    this.broadcastUpdate();
    return msg;
  }

  deleteChatMessage(id) {
    const msg = (this.state.chat || []).find(m => m.id === id);
    if (msg && !this.canDelete(msg)) return false;
    this.state.chat = (this.state.chat || []).filter(m => m.id !== id);
    this.broadcastUpdate();
    return true;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SharedStore;
} else {
  window.SharedStore = SharedStore;
}
