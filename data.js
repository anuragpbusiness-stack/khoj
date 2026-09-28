// data.js - High-Signal Editorial Content for KHOJ Dark Editorial Culture App
const INITIAL_EDITORIAL_DATA = {
  featuredStory: {
    tag: "CONVERSATION",
    number: "042",
    category: "DEEPTECH & CULTURE",
    title: "WHY IS EVERYONE BUILDING THE SAME THING?",
    subtitle: "A two-hour raw inquiry into copycat capital, original Indian manufacturing, and what happens when young builders stop asking for permission.",
    guests: [
      { name: "Devansh Nair", role: "Robotics Architect, Bengaluru", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80" },
      { name: "Meera Sen", role: "Synthetics & Materials, Pune", image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80" }
    ],
    duration: "104 MIN",
    pullQuote: "Cheap capital creates lazy monopolies. The best things coming out of India right now are built in dusty industrial sheds, not glass towers.",
    chapters: [
      { time: "00:00", title: "THE UNASKED QUESTION" },
      { time: "14:20", title: "WHY SOFTWARE MARGINS BLINDED US" },
      { time: "38:45", title: "WHAT TAMIL NADU AND SURAT KNOW ABOUT HARDWARE" },
      { time: "67:10", title: "THE PSYCHOLOGY OF EARLY INDEPENDENCE" },
      { time: "92:30", title: "THE 10-YEAR PLAYBOOK" }
    ],
    transcript: [
      {
        speaker: "Devansh Nair",
        time: "00:04",
        text: "Every incubator pitch deck in 2026 starts with the exact same three buzzwords. It feels like everyone is optimizing for the same 40 people on Twitter rather than the physical reality of how a billion people move, eat, and build."
      },
      {
        speaker: "Meera Sen",
        time: "04:18",
        text: "Because software taught everyone that zero marginal cost was the only god worth worshipping. When you spend ten years believing atoms are dirty and bits are divine, you end up with three hundred delivery apps and zero semiconductor packaging plants.",
        highlight: true
      },
      {
        speaker: "Devansh Nair",
        time: "14:20",
        text: "Look at Coimbatore or Rajkot. The guys running small CNC machine shops there don't call themselves 'founders'. They don't attend networking mixers. But they export high-precision turbine blades to Stuttgart every Tuesday without fanfare."
      },
      {
        speaker: "Meera Sen",
        time: "28:50",
        text: "Cheap capital can create bad businesses. When money is effortless, founders buy growth instead of earning customer devotion. Enduring taste only survives under real constraints.",
        highlight: true
      },
      {
        speaker: "Devansh Nair",
        time: "67:10",
        text: "The moment you stop waiting for an institutional stamp of approval is the moment your actual life's work begins. That applies to writing an essay, milling an aluminum chassis, or designing a synthetic enzyme."
      }
    ]
  },

  conversations: [
    {
      id: "c1",
      number: "041",
      tag: "CONVERSATION",
      title: "THE ILLUSION OF SCALE WITHOUT SOUL",
      guests: "Kabir Varma × Tanvi Joshi",
      duration: "88 MIN",
      accent: "#E54842",
      summary: "Can a consumer brand maintain cultural density after reaching 1,000 crores? Lessons from Indian textile houses that refused venture funding.",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: "c2",
      number: "040",
      tag: "DISPUTE",
      title: "WILL SYNTHETIC MEDIA KILL REGIONAL CINEMA?",
      guests: "Arunachalam P. × Rithika Roy",
      duration: "76 MIN",
      accent: "#2A9D68",
      summary: "Malayalam cinema survived on raw screenplay discipline. A debate on whether generative pipelines will dilute narrative boldness.",
      image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: "c3",
      number: "039",
      tag: "DEEP DIVE",
      title: "WHY THE NEXT GLOBAL BRAND WILL COME FROM CHENNAI",
      guests: "Vikramaditya Iyer",
      duration: "95 MIN",
      accent: "#D8783B",
      summary: "Precision engineering, generational thrift, and quiet compounding: uncovering the quiet titans of southern industrial clusters.",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: "c4",
      number: "038",
      tag: "INQUIRY",
      title: "THE MONSOON ECONOMY & UNMAPPED CREDIT",
      guests: "Siddharth Mehta × Ananya Khanna",
      duration: "112 MIN",
      accent: "#20A99A",
      summary: "How informal trust networks in Surat and old Delhi settle billions in trade daily without legal contracts or bank guarantees.",
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80"
    }
  ],

  people: [
    {
      id: "p1",
      name: "ANANYA KHANNA",
      field: "HARDWARE SYSTEMS · BENGALURU",
      role: "FOUNDER & SYSTEMS ARCHITECT",
      quote: "Most Indian tech startups build dashboards for people in California. We are building electric motors that survive monsoon voltage spikes.",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      accent: "#E54842",
      conversationsCount: 4,
      ideasCount: 12,
      eventsCount: 3,
      projects: ["Project Shakti Motor", "Indus Microfoundry"]
    },
    {
      id: "p2",
      name: "SIDDHARTH MEHTA",
      field: "HISTORIAN & ESSAYIST · DELHI",
      role: "ECONOMIC HISTORIAN",
      quote: "India's greatest economic miracle was never 1991. It was the informal credit networks of 17th-century Surat.",
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
      accent: "#2A9D68",
      conversationsCount: 6,
      ideasCount: 19,
      eventsCount: 5,
      projects: ["The Bazaar Chronicles", "Monsoon Economics"]
    },
    {
      id: "p3",
      name: "TARA KRISHNAN",
      field: "MICROBIOLOGY & FERMENTATION · KOCHI",
      role: "BIO-SYNTHETICS RESEARCHER",
      quote: "Ancient fermentation traditions hold the blueprint for post-petroleum synthetic polymers.",
      image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
      accent: "#20A99A",
      conversationsCount: 3,
      ideasCount: 8,
      eventsCount: 2,
      projects: ["Kochi Bio-Vat", "Enzyme 42"]
    },
    {
      id: "p4",
      name: "ROHAN BANERJEE",
      field: "COMPILER ARCHITECT · HYDERABAD",
      role: "SYSTEMS PROGRAMMER",
      quote: "If you don't understand the silicon below your framework, you are just renting illusions.",
      image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
      accent: "#8068A8",
      conversationsCount: 5,
      ideasCount: 15,
      eventsCount: 4,
      projects: ["IndusVM", "BareMetal Labs"]
    }
  ],

  atomicIdeas: [
    {
      id: "idea-0182",
      number: "0182",
      accent: "#E54842",
      title: "CHEAP CAPITAL CREATES BAD BUSINESSES",
      source: "Conversation #042 · 104 mins",
      quote: "When money is effortless, founders buy growth instead of earning distribution. Constraints are the only real filter for enduring taste.",
      tags: ["Capital", "Discipline", "Strategy"],
      connections: "03 people · 04 conversations"
    },
    {
      id: "idea-0181",
      number: "0181",
      accent: "#2A9D68",
      title: "TASTE CANNOT BE OUTSOURCED TO METRICS",
      source: "Conversation #039 · 95 mins",
      quote: "The moment you optimize a creative brand purely against retention graphs, you convert a cultural artifact into commoditized grey slop.",
      tags: ["Culture", "Taste", "Philosophy"],
      connections: "05 people · 02 essays"
    },
    {
      id: "idea-0180",
      number: "0180",
      accent: "#E7C84A",
      title: "THE BEST FOUNDERS ARE CRAFTSMEN IN DISGUISE",
      source: "Conversation #036 · 72 mins",
      quote: "Watch someone who loves the grain of the wood or the timing of a circuit. They do not think in quarterly exit horizons.",
      tags: ["Craft", "Founders", "Longevity"],
      connections: "04 people · 06 books"
    },
    {
      id: "idea-0179",
      number: "0179",
      accent: "#D8783B",
      title: "SPEED IS NOT A STRATEGY WITHOUT CONVICTION",
      source: "Conversation #031 · 64 mins",
      quote: "Running 100 miles per hour off a cliff is still running off a cliff. Velocity without distinct perspective is simply expensive panic.",
      tags: ["Conviction", "Strategy"],
      connections: "02 people · 03 conversations"
    }
  ],

  books: [
    {
      id: "b1",
      title: "THE DESIGN OF EVERYDAY THINGS",
      author: "Don Norman",
      accent: "#E54842",
      status: "Currently Reading",
      takeaway: "Cognitive affordances dictate human trust before any marketing sentence is read.",
      quote: "Good design is actually a lot harder to notice than poor design."
    },
    {
      id: "b2",
      title: "ANARCHY: THE EAST INDIA COMPANY",
      author: "William Dalrymple",
      accent: "#D8783B",
      status: "Read & Highlighted",
      takeaway: "How a joint-stock corporation subverted military empires through balance-sheet supremacy.",
      quote: "We still talk about the British conquering India, but that phrase disguises a more sinister reality."
    },
    {
      id: "b3",
      title: "ZERO TO ONE",
      author: "Peter Thiel",
      accent: "#2A9D68",
      status: "Essential Canon",
      takeaway: "Competition is for losers. Monopolies with compounding secret knowledge win.",
      quote: "What important truth do very few people agree with you on?"
    }
  ],

  events: [
    {
      id: "ev1",
      date: "OCT 18",
      year: "2026",
      title: "THE NEXT INDIA",
      city: "MUMBAI",
      venue: "The Old Mill Docks, Lower Parel",
      stats: "300 ATTENDEES · 14 SPEAKERS",
      accent: "#E54842",
      desc: "An invitation-only salon debating hard industrial manufacturing, sovereign compute, and cultural patronage in the coming decade."
    },
    {
      id: "ev2",
      date: "NOV 04",
      year: "2026",
      title: "ATOMS OVER BITS",
      city: "COIMBATORE",
      venue: "Precision Machining Compound, Peelamedu",
      stats: "150 BUILDERS · 6 WORKSHOPS",
      accent: "#E7C84A",
      desc: "Hands-on assembly of brushless motors, silicon packaging modules, and precision robotics hardware."
    },
    {
      id: "ev3",
      date: "DEC 12",
      year: "2026",
      title: "THE CONTRARIAN SALON",
      city: "NEW DELHI",
      venue: "The Brick Warehouse, Mehrauli",
      stats: "80 THINKERS · 4 DEBATES",
      accent: "#20A99A",
      desc: "Closed-door arguments dissecting unspoken economic consensus, monetary history, and original publishing."
    }
  ],

  circles: [
    {
      id: "circ1",
      name: "BUILDERS IN BENGALURU & MUMBAI",
      members: "148 Members",
      activeDiscussions: "12 Active Threads",
      tag: "HARDWARE & CONSUMER",
      accent: "#E54842",
      desc: "Architects, hardware founders, and brand builders debating unit economics and manufacturing grit."
    },
    {
      id: "circ2",
      name: "SYNTHETICS & BIO-FOUNDRIES",
      members: "62 Members",
      activeDiscussions: "5 Active Threads",
      tag: "DEEPTECH",
      accent: "#20A99A",
      desc: "Fermentation engineers, enzyme researchers, and material scientists rethinking Indian supply chains."
    },
    {
      id: "circ3",
      name: "THE CONTRARIAN ESSAY CLUB",
      members: "94 Members",
      activeDiscussions: "8 Active Threads",
      tag: "CULTURE & ESSAYS",
      accent: "#8068A8",
      desc: "Weekly long-form teardowns of unexamined assumptions in Indian media, venture capital, and tech."
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = INITIAL_EDITORIAL_DATA;
} else {
  window.INITIAL_EDITORIAL_DATA = INITIAL_EDITORIAL_DATA;
}
