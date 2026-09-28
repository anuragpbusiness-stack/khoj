// app.js - UI Controller for KHOJ Dark Editorial Culture & Ideas App
let currentModalType = 'wall-note';
let isAudioPlaying = false;
let audioPlayTimer = null;
let currentAudioSeconds = 1997; // 33:17
const totalAudioSeconds = 6240; // 104:00
let audioSpeed = 1.0;
let currentActiveChapter = "14:20";

document.addEventListener('DOMContentLoaded', () => {
  const network = new NetworkManager();
  const store = new SharedStore(network);

  // Status elements
  const syncDot = document.getElementById('sync-dot');
  const syncStatusText = document.getElementById('sync-status-text');
  const partnerDot = document.getElementById('partner-dot');
  const partnerStatusText = document.getElementById('partner-status-text');
  const pingReadout = document.getElementById('ping-readout');
  const toastContainer = document.getElementById('toast-container');

  function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // Social Network presence & sync status
  network.onStatus((status, details) => {
    switch (status) {
      case 'connecting':
        if (syncStatusText) syncStatusText.textContent = 'FEED SYNCED';
        break;
      case 'waiting':
        if (syncStatusText) syncStatusText.textContent = 'FEED SYNCED';
        if (partnerDot) partnerDot.className = 'partner-dot offline';
        if (partnerStatusText) partnerStatusText.textContent = 'PARTNER OFFLINE';
        break;
      case 'connected':
        if (syncStatusText) syncStatusText.textContent = 'FEED LIVE';
        if (partnerDot) partnerDot.className = 'partner-dot';
        if (partnerStatusText) partnerStatusText.textContent = 'PARTNER ONLINE';
        showToast('✦ Partner joined your shared feed!');
        break;
      case 'latency':
        if (details.latency && pingReadout) {
          pingReadout.style.display = 'inline-block';
          pingReadout.textContent = `${details.latency}MS`;
        }
        break;
      case 'disconnected':
      case 'error':
        if (syncStatusText) syncStatusText.textContent = 'FEED SAVED (LOCAL)';
        if (partnerDot) partnerDot.className = 'partner-dot offline';
        if (partnerStatusText) partnerStatusText.textContent = 'PARTNER OFFLINE';
        break;
    }
  });

  // Auto-connect with vision.aa
  network.connectWithPassword('vision.aa');

  // Refresh button & keyboard shortcuts (Ctrl+R / F5 / Cmd+R)
  const btnRefresh = document.getElementById('btn-refresh');
  const refreshIcon = document.getElementById('refresh-icon');

  function triggerRefresh() {
    if (refreshIcon) refreshIcon.classList.add('spinning');
    showToast('⟳ Refreshing app & applying all changes...');
    setTimeout(() => {
      window.location.reload();
    }, 250);
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', triggerRefresh);
  }

  // Search trigger button & shortcut (Ctrl+K / Cmd+K)
  const btnSearchTrigger = document.getElementById('btn-search-trigger');
  if (btnSearchTrigger) {
    btnSearchTrigger.addEventListener('click', () => openSearchModal());
  }

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R')) {
      e.preventDefault();
      triggerRefresh();
    } else if (e.key === 'F5') {
      e.preventDefault();
      triggerRefresh();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      openSearchModal();
    } else if (e.key === 'Escape') {
      closeSearchModal();
      closeMediaPlayer();
      closeAddModal();
    }
  });

  // Navigation tab switching
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.getAttribute('data-tab');
      switchTab(target);
    });
  });

  // Search input live querying
  const searchInput = document.getElementById('search-main-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      performSearch(e.target.value.trim());
    });
  }

  // Render initial static editorial data + reactive user data
  function renderAll() {
    renderFeed(store.state);
    renderConversations(store.state);
    renderPeople(store.state);
    renderAtomicIdeas(store.state);
    renderBooks(store.state);
    renderEvents();
    renderLiveIdeaWall(store.state);
    renderCircles();
  }

  store.onChange(() => {
    renderAll();
  });

  renderAll();

  // Expose to window for inline onclick handlers
  window.AppAPI = {
    network,
    store,
    showToast
  };
});

// Tab Switcher
function switchTab(tabId) {
  const sections = document.querySelectorAll('.tab-section');
  sections.forEach(sec => sec.style.display = 'none');
  const targetSec = document.getElementById(`tab-${tabId}`);
  if (targetSec) targetSec.style.display = 'block';

  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    if (tab.getAttribute('data-tab') === tabId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 1. Chronological Activity Feed Render (Strictly date & time timestamped)
function renderFeed(state) {
  const container = document.getElementById('feed-stream-container');
  if (!container) return;

  const posts = state.feed || [];
  if (posts.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 50px 20px; color: var(--text-tertiary); background: var(--surface-1); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 6px;">
        <h4 style="font-family: var(--font-display); font-size: 24px; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; color: var(--text-primary);">NO UPLOADS YET</h4>
        <p style="font-family: var(--font-serif); font-size: 17px; font-style: italic; color: var(--text-secondary);">
          Upload a Podcast, Book, Atomic Idea, or Note from the tabs above. Everything uploaded will appear here in chronological order with exact date and time.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = posts.map(item => {
    const isPartner = item.author === 'Partner';
    const itemType = (item.type || item.tag || 'DISPATCH').toUpperCase();
    
    const dateObj = new Date(item.timestamp || Date.now());
    const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const titleText = item.title || item.text || 'Untitled Upload';
    const bodyText = item.body || (item.title ? item.text : '') || '';
    const metaInfo = item.meta ? `· ${item.meta}` : '';

    return `
      <article class="feed-card">
        <div class="feed-card-header">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="feed-author-badge ${isPartner ? 'partner' : ''}">${item.author.toUpperCase()}</span>
            <span class="tag-badge">${itemType}</span>
            <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary);">${metaInfo}</span>
          </div>
          <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary);">
            ${formattedDate} · ${formattedTime}
          </div>
        </div>

        <div style="margin-bottom: 12px;">
          <h3 style="font-family: var(--font-display); font-size: 22px; text-transform: uppercase; line-height: 1.05; margin-bottom: 8px; letter-spacing: 0.4px; color: var(--text-primary);">
            ${titleText}
          </h3>
          ${bodyText ? `<div class="feed-content" style="margin-bottom: 0;">"${bodyText}"</div>` : ''}
        </div>

        <div class="feed-footer">
          <span style="color: var(--deep-green); font-weight: 600;">● SYNCED LIVE</span>
          <div style="display: flex; gap: 8px;">
            <button class="btn-secondary" style="padding: 4px 10px; font-size: 11px;" onclick="pinToWall('${itemType}', '${(titleText + ' - ' + bodyText).replace(/'/g, "\\'")}')">PIN TO WALL</button>
            <button style="background:none; border:none; color: var(--text-tertiary); font-weight:700; cursor:pointer;" onclick="deleteFeedPost('${item.id}')">✕</button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function deleteFeedPost(id) {
  window.AppAPI.store.removeFeedPost(id);
  window.AppAPI.showToast('Dispatch removed from feed');
}

// 2. Conversations & Podcasts Render
function renderConversations(state) {
  const container = document.getElementById('conversations-archive-grid');
  if (!container) return;

  const editorialConvs = window.INITIAL_EDITORIAL_DATA ? window.INITIAL_EDITORIAL_DATA.conversations : [];
  const userPodcasts = state.podcasts || [];

  const userHtml = userPodcasts.map(p => `
    <article class="conversation-card">
      <div class="card-top-tag">
        <span class="tag-badge">SHARED BY PARTNER</span>
        <button style="background:none;border:none;color:var(--text-tertiary);cursor:pointer;font-weight:700;" onclick="deletePodcast('${p.id}')">✕</button>
      </div>
      <div class="card-body">
        <div>
          <h3 class="card-title">${p.title}</h3>
          <p class="card-desc"><b>Takeaways:</b> ${p.takeaways || 'No takeaways provided.'}</p>
          ${p.url ? `<p style="font-family: var(--font-mono); font-size: 11px; margin-top: 8px;"><a href="${p.url}" target="_blank" style="color: var(--text-primary);">Open Source Link ↗</a></p>` : ''}
        </div>
        <div class="card-footer-action">
          <span>ADDED: ${new Date(p.created).toLocaleDateString()}</span>
          <button class="btn-primary" style="padding: 6px 14px; font-size: 13px;" onclick="openMediaPlayer('listen', '00:00', '${p.title}')">LISTEN</button>
        </div>
      </div>
    </article>
  `).join('');

  const editorialHtml = editorialConvs.map(item => `
    <article class="conversation-card">
      <div class="card-top-tag">
        <span class="tag-badge">${item.tag} #${item.number}</span>
        <span>${item.duration}</span>
      </div>
      <div class="card-image-hero">
        <img src="${item.image}" alt="${item.title}">
      </div>
      <div class="card-body">
        <div>
          <h3 class="card-title">${item.title}</h3>
          <p class="card-desc">${item.summary}</p>
        </div>
        <div class="card-footer-action">
          <span>FEATURING: ${item.guests}</span>
          <button class="btn-primary" style="padding: 6px 14px; font-size: 13px;" onclick="openMediaPlayer('listen', '00:00', '${item.title}', '${item.tag} #${item.number} · ${item.guests} · ${item.duration}')">LISTEN</button>
        </div>
      </div>
    </article>
  `).join('');

  container.innerHTML = userHtml + editorialHtml;
}

// 3. People Directory Render (Intellectual Identity - Master Brief Section 23)
function renderPeople(state) {
  const container = document.getElementById('people-directory-grid');
  if (!container) return;

  const people = window.INITIAL_EDITORIAL_DATA ? window.INITIAL_EDITORIAL_DATA.people : [];

  container.innerHTML = people.map(p => `
    <div class="person-poster">
      <div class="person-cutout-wrap">
        <img src="${p.image}" alt="${p.name}">
        <span class="person-badge">${p.field}</span>
      </div>
      <h3 class="person-name">${p.name}</h3>
      <div class="person-field">${p.role || 'BUILDER & THINKER'}</div>
      <div class="person-quote">"${p.quote}"</div>
      
      <div style="font-family: var(--font-mono); font-size: 11px; margin-top: auto; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 10px; color: var(--text-tertiary);">
        <div style="margin-bottom: 4px;"><b>FEATURED IN:</b> ${p.conversationsCount || 4} CONVERSATIONS · ${p.ideasCount || 12} IDEAS · ${p.eventsCount || 3} EVENTS</div>
        <div><b>PROJECTS:</b> ${p.projects.join(', ')}</div>
      </div>
    </div>
  `).join('');
}

// 4. Atomic Ideas Render (Master Brief Section 22)
function renderAtomicIdeas(state) {
  const container = document.getElementById('atomic-ideas-grid');
  if (!container) return;

  const ideas = window.INITIAL_EDITORIAL_DATA ? window.INITIAL_EDITORIAL_DATA.atomicIdeas : [];
  const userIdeas = (state.vision || []).filter(v => v.category === 'Atomic Idea');

  const userHtml = userIdeas.map((u, i) => `
    <div class="atomic-idea-card">
      <div>
        <div class="idea-header">
          <span class="idea-badge">PARTNER IDEA</span>
          <button style="background:none;border:none;cursor:pointer;color:var(--text-tertiary);font-weight:700;" onclick="deleteIdea('${u.id}')">✕</button>
        </div>
        <h3 class="idea-title">${u.title}</h3>
        <div class="idea-quote">"${u.description}"</div>
      </div>
      <div class="idea-footer">
        <span>Dual-synced live</span>
        <button class="btn-secondary" style="padding: 4px 10px; font-size: 11px;" onclick="pinToWall('${u.title}', '${u.description}')">PIN TO WALL</button>
      </div>
    </div>
  `).join('');

  const editorialHtml = ideas.map(idea => `
    <div class="atomic-idea-card">
      <div>
        <div class="idea-header">
          <span class="idea-badge">IDEA #${idea.number}</span>
          <span style="color: var(--text-tertiary);">${idea.source}</span>
        </div>
        <h3 class="idea-title">${idea.title}</h3>
        <div class="idea-quote">"${idea.quote}"</div>
      </div>
      <div class="idea-footer">
        <span>${idea.connections}</span>
        <button class="btn-secondary" style="padding: 4px 10px; font-size: 11px;" onclick="pinToWall('${idea.title}', '${idea.quote}')">PIN TO WALL</button>
      </div>
    </div>
  `).join('');

  container.innerHTML = userHtml + editorialHtml;
}

// 5. Books Render
function renderBooks(state) {
  const container = document.getElementById('books-grid');
  if (!container) return;

  const canonicalBooks = window.INITIAL_EDITORIAL_DATA ? window.INITIAL_EDITORIAL_DATA.books : [];
  const userBooks = state.books || [];

  const userHtml = userBooks.map(b => `
    <div class="atomic-idea-card">
      <div>
        <div class="idea-header">
          <span class="idea-badge">${b.status}</span>
          <button style="background:none;border:none;cursor:pointer;color:var(--text-tertiary);font-weight:700;" onclick="deleteBook('${b.id}')">✕</button>
        </div>
        <h3 class="idea-title">${b.title}</h3>
        <div style="font-family: var(--font-mono); font-size: 11px; margin-bottom: 12px; font-weight: 600; color: var(--text-tertiary);">BY ${b.author}</div>
        <div class="idea-quote">"${b.notes}"</div>
      </div>
      <div class="idea-footer">
        <span>SHARED BY PARTNER</span>
        <button class="btn-secondary" style="padding: 4px 10px; font-size: 11px;" onclick="pinToWall('${b.title}', '${b.notes}')">PIN TO WALL</button>
      </div>
    </div>
  `).join('');

  const canonHtml = canonicalBooks.map(b => `
    <div class="atomic-idea-card">
      <div>
        <div class="idea-header">
          <span class="idea-badge">${b.status}</span>
          <span>CANON</span>
        </div>
        <h3 class="idea-title">${b.title}</h3>
        <div style="font-family: var(--font-mono); font-size: 11px; margin-bottom: 12px; font-weight: 600; color: var(--text-tertiary);">BY ${b.author}</div>
        <div class="idea-quote">"${b.quote}"</div>
        <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-top: 10px;"><b>Core takeaway:</b> ${b.takeaway}</p>
      </div>
      <div class="idea-footer">
        <span>RECOMMENDED</span>
        <button class="btn-secondary" style="padding: 4px 10px; font-size: 11px;" onclick="pinToWall('${b.title}', '${b.quote}')">PIN TO WALL</button>
      </div>
    </div>
  `).join('');

  container.innerHTML = userHtml + canonHtml;
}

// 6. Events Posters Render (Digital Posters - Master Brief Section 25)
function renderEvents() {
  const container = document.getElementById('events-posters-grid');
  if (!container) return;

  const events = window.INITIAL_EDITORIAL_DATA ? window.INITIAL_EDITORIAL_DATA.events : [];
  container.innerHTML = events.map(ev => `
    <div class="event-poster-card">
      <div>
        <div class="event-date-large">${ev.date}</div>
        <div class="event-city-tag">${ev.city} · ${ev.year}</div>
        <h3 class="event-title-huge">${ev.title}</h3>
        <div class="event-desc">"${ev.desc}"</div>
        <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary); margin-bottom: 14px;">
          📍 ${ev.venue}
        </div>
      </div>
      <div class="event-stats-strip">
        <span>${ev.stats}</span>
        <button class="btn-primary" style="padding: 6px 14px; font-size: 12px;" onclick="window.AppAPI.showToast('🎟️ RSVP Confirmed for ${ev.title}')">ATTEND →</button>
      </div>
    </div>
  `).join('');
}

// 7. Collaborative Live Idea Wall (Signature Interaction - Master Brief Section 32)
function renderLiveIdeaWall(state) {
  const container = document.getElementById('interactive-wall-container');
  if (!container) return;

  const notes = (state.vision || []).filter(v => v.category === 'Wall Note' || !v.category);

  if (notes.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: var(--text-tertiary);">
        <div style="font-size: 40px; margin-bottom: 16px;">✦</div>
        <h3 style="font-family: var(--font-display); font-size: 26px; text-transform: uppercase; color: var(--text-primary); letter-spacing: 0.5px;">THE WALL IS BLANK</h3>
        <p style="font-family: var(--font-serif); font-size: 17px; font-style: italic; color: var(--text-secondary); margin-top: 6px;">
          Click "+ PIN TO WALL" above to pin your first vision note, quote, or raw question. It appears live on both screens.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = notes.map((note) => {
    return `
      <div class="tape-pin-note">
        <div class="note-author">PINNED · ${new Date(note.created).toLocaleDateString()}</div>
        <h4 style="font-family: var(--font-display); font-size: 18px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.4px; color: var(--text-primary);">${note.title}</h4>
        <div class="note-text">"${note.description}"</div>
        <div class="note-actions">
          <span style="color: var(--deep-green);">● LIVE SYNCED</span>
          <button class="btn-delete-note" onclick="deleteWallNote('${note.id}')">REMOVE</button>
        </div>
      </div>
    `;
  }).join('');
}

// 8. Circles Render
function renderCircles() {
  const container = document.getElementById('circles-grid');
  if (!container) return;

  const circles = window.INITIAL_EDITORIAL_DATA ? window.INITIAL_EDITORIAL_DATA.circles : [];
  container.innerHTML = circles.map(c => `
    <div class="conversation-card">
      <div class="card-top-tag">
        <span class="tag-badge">${c.tag}</span>
        <span>${c.members}</span>
      </div>
      <div class="card-body">
        <div>
          <h3 class="card-title">${c.name}</h3>
          <p class="card-desc">${c.desc}</p>
        </div>
        <div class="card-footer-action">
          <span>${c.activeDiscussions}</span>
          <button class="btn-primary" style="padding: 6px 14px; font-size: 13px;" onclick="window.AppAPI.showToast('Joined circle discussion!')">ENTER CIRCLE →</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Intellectual Search Implementation (Master Brief Section 26)
function openSearchModal() {
  const backdrop = document.getElementById('search-modal-backdrop');
  if (backdrop) {
    backdrop.style.display = 'flex';
    const input = document.getElementById('search-main-input');
    if (input) {
      input.value = '';
      input.focus();
      performSearch('');
    }
  }
}

function closeSearchModal() {
  const backdrop = document.getElementById('search-modal-backdrop');
  if (backdrop) backdrop.style.display = 'none';
}

function performSearch(query) {
  const q = query.toLowerCase();
  const data = window.INITIAL_EDITORIAL_DATA;
  const store = window.AppAPI ? window.AppAPI.store.state : {};

  const allConvs = [...(data ? data.conversations : []), ...(store.podcasts || [])];
  const allPeople = data ? data.people : [];
  const allIdeas = [...(data ? data.atomicIdeas : []), ...((store.vision || []).filter(v => v.category === 'Atomic Idea'))];
  const allBooks = [...(data ? data.books : []), ...(store.books || [])];
  const allEvents = data ? (data.events || []) : [];
  const allCircles = data ? data.circles : [];

  const matchedConvs = allConvs.filter(c => (c.title || '').toLowerCase().includes(q) || (c.summary || c.takeaways || '').toLowerCase().includes(q));
  const matchedPeople = allPeople.filter(p => (p.name || '').toLowerCase().includes(q) || (p.field || '').toLowerCase().includes(q) || (p.quote || '').toLowerCase().includes(q));
  const matchedIdeas = allIdeas.filter(i => (i.title || '').toLowerCase().includes(q) || (i.quote || i.description || '').toLowerCase().includes(q));
  const matchedBooks = allBooks.filter(b => (b.title || '').toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q));
  const matchedEvents = allEvents.filter(e => (e.title || '').toLowerCase().includes(q) || (e.city || '').toLowerCase().includes(q));
  const matchedCircles = allCircles.filter(c => (c.name || '').toLowerCase().includes(q) || (c.desc || '').toLowerCase().includes(q));

  // Update counter badges
  document.getElementById('stat-convs').textContent = `${matchedConvs.length} CONVERSATIONS`;
  document.getElementById('stat-people').textContent = `${matchedPeople.length} PEOPLE`;
  document.getElementById('stat-ideas').textContent = `${matchedIdeas.length} IDEAS`;
  document.getElementById('stat-books').textContent = `${matchedBooks.length} BOOKS`;
  document.getElementById('stat-events').textContent = `${matchedEvents.length} EVENTS`;
  document.getElementById('stat-circles').textContent = `${matchedCircles.length} CIRCLES`;

  const resultsContainer = document.getElementById('search-results-list');
  let html = '';

  matchedConvs.forEach(c => {
    html += `
      <div class="search-result-item" onclick="closeSearchModal(); switchTab('conversations'); openMediaPlayer('listen', '00:00', '${c.title}')">
        <div>
          <span class="search-item-type">CONVERSATION</span>
          <div class="search-item-title">${c.title}</div>
        </div>
        <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary);">LISTEN →</span>
      </div>
    `;
  });

  matchedPeople.forEach(p => {
    html += `
      <div class="search-result-item" onclick="closeSearchModal(); switchTab('people');">
        <div>
          <span class="search-item-type">PERSON</span>
          <div class="search-item-title">${p.name} · ${p.field}</div>
        </div>
        <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary);">PROFILE →</span>
      </div>
    `;
  });

  matchedIdeas.forEach(i => {
    html += `
      <div class="search-result-item" onclick="closeSearchModal(); switchTab('ideas');">
        <div>
          <span class="search-item-type">ATOMIC IDEA</span>
          <div class="search-item-title">${i.title}</div>
        </div>
        <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary);">VIEW →</span>
      </div>
    `;
  });

  matchedBooks.forEach(b => {
    html += `
      <div class="search-result-item" onclick="closeSearchModal(); switchTab('books');">
        <div>
          <span class="search-item-type">BOOK</span>
          <div class="search-item-title">${b.title} BY ${b.author}</div>
        </div>
        <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary);">CANON →</span>
      </div>
    `;
  });

  matchedEvents.forEach(e => {
    html += `
      <div class="search-result-item" onclick="closeSearchModal(); switchTab('events');">
        <div>
          <span class="search-item-type">EVENT</span>
          <div class="search-item-title">${e.title} · ${e.city} (${e.date})</div>
        </div>
        <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary);">RSVP →</span>
      </div>
    `;
  });

  matchedCircles.forEach(c => {
    html += `
      <div class="search-result-item" onclick="closeSearchModal(); switchTab('circles');">
        <div>
          <span class="search-item-type">CIRCLE</span>
          <div class="search-item-title">${c.name}</div>
        </div>
        <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary);">JOIN →</span>
      </div>
    `;
  });

  if (!html) {
    html = `<div style="text-align: center; padding: 30px; color: var(--text-tertiary); font-family: var(--font-serif); font-style: italic;">No records found matching "${query}".</div>`;
  }

  resultsContainer.innerHTML = html;
}

// Media Player: Watch / Listen / Read Modal Implementation (Master Brief Sections 20, 21, 35, 36)
function openMediaPlayer(mode = 'listen', startChapter = '00:00', title = null, meta = null) {
  const modal = document.getElementById('player-modal-backdrop');
  if (!modal) return;

  const data = window.INITIAL_EDITORIAL_DATA.featuredStory;
  document.getElementById('player-title').textContent = title || data.title;
  document.getElementById('player-meta').textContent = meta || `${data.format} · ${data.guests.map(g => g.name).join(' × ')} · ${data.duration}`;

  renderChaptersList(data.chapters, startChapter);
  renderTranscriptList(data.transcript);

  setPlayerMode(mode);
  modal.style.display = 'flex';
}

function closeMediaPlayer() {
  const modal = document.getElementById('player-modal-backdrop');
  if (modal) modal.style.display = 'none';
  if (isAudioPlaying) toggleAudioPlay();
}

function setPlayerMode(mode) {
  const watchView = document.getElementById('player-mode-watch-view');
  const listenView = document.getElementById('player-mode-listen-view');
  const readView = document.getElementById('player-mode-read-view');

  const btnWatch = document.getElementById('player-btn-watch');
  const btnListen = document.getElementById('player-btn-listen');
  const btnRead = document.getElementById('player-btn-read');

  [btnWatch, btnListen, btnRead].forEach(btn => btn.classList.remove('active'));
  watchView.style.display = 'none';
  listenView.style.display = 'none';
  readView.style.display = 'none';

  if (mode === 'watch') {
    watchView.style.display = 'block';
    btnWatch.classList.add('active');
  } else if (mode === 'read') {
    readView.style.display = 'block';
    btnRead.classList.add('active');
  } else {
    listenView.style.display = 'block';
    btnListen.classList.add('active');
  }
}

function renderChaptersList(chapters, activeTime) {
  const container = document.getElementById('player-chapters-list');
  if (!container || !chapters) return;

  container.innerHTML = chapters.map(ch => `
    <div class="chapter-row ${ch.time === activeTime ? 'active' : ''}" onclick="selectChapter('${ch.time}')">
      <span style="font-weight: 600; color: ${ch.time === activeTime ? '#FFFFFF' : 'var(--text-tertiary)'};">${ch.time}</span>
      <span>${ch.title}</span>
      <span style="color: var(--text-tertiary); font-size: 11px;">JUMP ↗</span>
    </div>
  `).join('');
}

function renderTranscriptList(transcript) {
  const container = document.getElementById('player-transcript-container');
  if (!container || !transcript) return;

  container.innerHTML = transcript.map(tr => `
    <div class="transcript-entry ${tr.highlight ? 'highlighted' : ''}">
      <div class="transcript-speaker-row">
        <span><b>${tr.speaker.toUpperCase()}</b> · ${tr.time}</span>
        <button class="btn-extract-idea" onclick="extractTranscriptAsIdea('${tr.speaker}', '${tr.text.replace(/'/g, "\\'")}')">⚡ EXTRACT AS ATOMIC IDEA</button>
      </div>
      <div class="transcript-text">"${tr.text}"</div>
    </div>
  `).join('');
}

function selectChapter(time) {
  currentActiveChapter = time;
  const parts = time.split(':');
  currentAudioSeconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  updateAudioDisplay();

  const rows = document.querySelectorAll('.chapter-row');
  rows.forEach(r => {
    if (r.textContent.includes(time)) {
      r.classList.add('active');
    } else {
      r.classList.remove('active');
    }
  });
  window.AppAPI.showToast(`Navigated to chapter ${time}`);
}

function extractTranscriptAsIdea(speaker, text) {
  const title = `INSIGHT FROM ${speaker.toUpperCase()}`;
  window.AppAPI.store.addVisionItem(title, text, 'Atomic Idea');
  window.AppAPI.showToast('💡 Extracted as Atomic Idea & synced live!');
}

function toggleAudioPlay() {
  const btn = document.getElementById('audio-play-pause-btn');
  isAudioPlaying = !isAudioPlaying;

  if (isAudioPlaying) {
    btn.textContent = '⏸ PAUSE';
    btn.style.background = '#E4E4E7';
    audioPlayTimer = setInterval(() => {
      currentAudioSeconds = Math.min(totalAudioSeconds, currentAudioSeconds + Math.floor(audioSpeed));
      updateAudioDisplay();
    }, 1000);
  } else {
    btn.textContent = '▶ PLAY';
    btn.style.background = '#FFFFFF';
    clearInterval(audioPlayTimer);
  }
}

function updateAudioDisplay() {
  const curTimeEl = document.getElementById('audio-current-time');
  const fillEl = document.getElementById('audio-scrubber-fill');
  if (!curTimeEl || !fillEl) return;

  const mins = Math.floor(currentAudioSeconds / 60);
  const secs = currentAudioSeconds % 60;
  curTimeEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const pct = (currentAudioSeconds / totalAudioSeconds) * 100;
  fillEl.style.width = `${pct}%`;
}

function skipAudio(seconds) {
  currentAudioSeconds = Math.max(0, Math.min(totalAudioSeconds, currentAudioSeconds + seconds));
  updateAudioDisplay();
}

function handleScrub(e) {
  const track = document.getElementById('audio-scrubber');
  const rect = track.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
  currentAudioSeconds = Math.floor(ratio * totalAudioSeconds);
  updateAudioDisplay();
}

function setSpeed(speed, el) {
  audioSpeed = speed;
  document.querySelectorAll('.speed-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  window.AppAPI.showToast(`Playback speed set to ${speed}x`);
}

// Content Modal Handlers
function openAddModal(type) {
  currentModalType = type;
  const modal = document.getElementById('add-modal-backdrop');
  const heading = document.getElementById('modal-heading');
  const title = document.getElementById('modal-input-title');
  const sub = document.getElementById('modal-input-sub');
  const text = document.getElementById('modal-input-text');

  title.value = '';
  sub.value = '';
  text.value = '';

  if (type === 'podcast') {
    heading.textContent = '+ SHARE PODCAST EPISODE';
    title.placeholder = 'Podcast Title / Episode Name';
    sub.placeholder = 'Spotify / YouTube / Apple URL';
    text.placeholder = 'Key takeaways, timestamps, or why we must listen...';
  } else if (type === 'book') {
    heading.textContent = '+ ADD BOOK TO CANON';
    title.placeholder = 'Book Title';
    sub.placeholder = 'Author Name';
    text.placeholder = 'Memorable quotes, key summary, or cognitive models...';
  } else if (type === 'idea') {
    heading.textContent = '+ CAPTURE ATOMIC IDEA';
    title.placeholder = 'Idea Headline / Provocation';
    sub.placeholder = 'Source / Conversation / Context';
    text.placeholder = 'The atomic truth, insight, or counter-intuitive principle...';
  } else {
    heading.textContent = '+ PIN NOTE TO LIVE WALL';
    title.placeholder = 'Note Title or Question';
    sub.placeholder = 'Category (Vision, Question, Strategy)';
    text.placeholder = 'Your message, raw thought, or long-term target...';
  }

  modal.style.display = 'flex';
  title.focus();
}

function closeAddModal() {
  document.getElementById('add-modal-backdrop').style.display = 'none';
}

function submitModalContent() {
  const title = document.getElementById('modal-input-title').value.trim();
  const sub = document.getElementById('modal-input-sub').value.trim();
  const text = document.getElementById('modal-input-text').value.trim();

  if (!title) {
    if (window.AppAPI && window.AppAPI.showToast) {
      window.AppAPI.showToast('⚠️ Please provide a title.');
    }
    return;
  }

  const store = window.AppAPI.store;

  if (currentModalType === 'podcast') {
    store.addPodcastItem(title, sub, text);
    window.AppAPI.showToast('🎙️ Podcast episode broadcasted live to partner!');
  } else if (currentModalType === 'book') {
    store.addBookItem(title, sub, text, 'Recommended');
    window.AppAPI.showToast('📚 Book added and synced live to partner!');
  } else if (currentModalType === 'idea') {
    store.addVisionItem(title, text, 'Atomic Idea');
    window.AppAPI.showToast('💡 Atomic idea captured and synced live!');
  } else {
    store.addVisionItem(title, text, 'Wall Note');
    window.AppAPI.showToast('📌 Note pinned to Live Wall and synced live!');
  }

  closeAddModal();
}

function pinToWall(title, description) {
  window.AppAPI.store.addVisionItem(title, description, 'Wall Note');
  window.AppAPI.showToast('📌 Pinned to Live Idea Wall!');
  switchTab('ideawall');
}

function deleteWallNote(id) {
  window.AppAPI.store.removeVisionItem(id);
  window.AppAPI.showToast('Note removed from wall');
}

function deletePodcast(id) {
  window.AppAPI.store.removePodcastItem(id);
  window.AppAPI.showToast('Podcast removed');
}

function deleteBook(id) {
  window.AppAPI.store.removeBookItem(id);
  window.AppAPI.showToast('Book removed');
}

function deleteIdea(id) {
  window.AppAPI.store.removeVisionItem(id);
  window.AppAPI.showToast('Idea removed');
}

// Download & Direct OS App Install Handler (Zero Modals, Zero Alerts)
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (window._getAppPending) {
    window._getAppPending = false;
    deferredPrompt.prompt();
  }
});

function handleGetAppClick() {
  const isMac = (navigator.platform && navigator.platform.toUpperCase().indexOf('MAC') >= 0) || 
                (navigator.userAgent && navigator.userAgent.toUpperCase().indexOf('MAC') >= 0);

  // 1. If native PWA install prompt is ready (Chrome / Edge / Chromium), trigger OS install sheet directly
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult && choiceResult.outcome === 'accepted') {
        if (window.AppAPI && window.AppAPI.showToast) {
          window.AppAPI.showToast('✓ KHOJ Desktop App installed!');
        }
      }
      deferredPrompt = null;
    });
  } else {
    window._getAppPending = true;
  }

  // 2. Directly trigger downloading the standalone app package (contains 1-click launchers for Windows & Mac)
  const dl = document.createElement('a');
  dl.href = 'KHOJ-App.zip';
  dl.download = isMac ? 'KHOJ-macOS-App.zip' : 'KHOJ-Windows-App.zip';
  document.body.appendChild(dl);
  dl.click();
  document.body.removeChild(dl);

  // 3. Clean feedback toast (Never browser alert!)
  if (window.AppAPI && window.AppAPI.showToast) {
    window.AppAPI.showToast(isMac ? '⚡ Starting KHOJ macOS install & package download...' : '⚡ Starting KHOJ Windows install & package download...');
  }
}

// Fallback stubs for backwards compatibility
function triggerPwaInstall() { handleGetAppClick(); }
function openDownloadModal() { handleGetAppClick(); }
function closeDownloadModal() {}


