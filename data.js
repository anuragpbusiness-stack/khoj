// data.js - High-Signal Editorial Content for KHOJ Dark Editorial Culture App
// Clean pristine initial state (zero preloaded mock items)
const INITIAL_EDITORIAL_DATA = {
  featuredStory: null,
  conversations: [],
  people: [],
  atomicIdeas: [],
  books: [],
  events: [],
  circles: []
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = INITIAL_EDITORIAL_DATA;
} else {
  window.INITIAL_EDITORIAL_DATA = INITIAL_EDITORIAL_DATA;
}
