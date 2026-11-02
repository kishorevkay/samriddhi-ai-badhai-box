// All copy from "AI Badhai Box · Webpage Copy" (PDF v2, 2026-10-29; text in COPY_SOURCE_BADHAAI_v2.txt). Follow the copy word for word.
// Each domain's "What's inside" is listed exactly as the copy gives it: Marketing has the long form, the others the short form.
window.LOADED = ["Theory modules", "Practical demos", "Projects", "Assignments", "Quizzes", "Templates", "Mind maps", "Tool demos", "Capstones"];
// Scroll 6 carousel: the nine items from the copy, names only (the drafted one-liners in carousel/TILE_LINES.md are not in the copy).
// Images: carousel/tiles/T*.png → run ./sync_tiles.sh → assets/tiles/T*.webp. A missing image shows a placeholder.
window.TILES = [
  { t: "Theory modules", img: "T1_theory_modules" },
  { t: "Practical demos", img: "T2_practical_demos" },
  { t: "Projects", img: "T3_projects" },
  { t: "Assignments", img: "T4_assignments" },
  { t: "Quizzes", img: "T5_quizzes" },
  { t: "Templates", img: "T6_templates" },
  { t: "Mind maps", img: "T7_mind_maps" },
  { t: "Tool demos", img: "T8_tool_demos" },
  { t: "Capstones", img: "T9_capstones" }
];

// The box (course sheet "AI Badhai Box courses", 2026-11-02). Everyone gets the essential, the AI learning pick and the common
// Executive PG; the rest comes from the chosen domain. pick = how many are drawn at random from each pool; every drawn course can be
// swapped for another one from its pool. offer = the badge per section. info = learning hours · eligibility · mode of delivery, shown once per section.
window.BOX = {
  essential: "Microsoft Generative AI Essentials",
  ai: ["Introduction to Agentic Systems", "AI Fundamentals: LLM Training Considerations"],
  common: { t: "Executive PG in Applied AI and Agentic AI" },
  pick: { short: 2, ai: 1, free: 3, flagship: 1 },
  info: {
    essential: ["6 hrs", "High School", "Self-paced"],
    mastery: ["40 hrs", "Undergrad", "Self-paced"],
    short: ["2 hrs each", "High School", "Self-paced"],
    ai: ["2 hrs", "High School", "Self-paced"],
    free: ["6 hrs each", "Undergrad", "Self-paced"],
    bigger: [null, "Graduate or Higher", "Blended"]
  },
  // offer badge per section (sheet column A)
  offer: { essential: "Completely Free - 100% Off", mastery: "Flat 75% Off", short: "100% Off", ai: "100% Off", free: "FREE", bigger: "Scholarships Available" },
  note: "Program-specific details might differ and will be shared over email."
};

// sub = the line under the domain card; focus = what the mastery track is "built around"; flagship = the bigger-move pool (t = programme, by = institution)
window.DOMAINS = [
  { id: "data", name: "Data & AI", focus: "Data & AI", sub: "Data, analytics, ML & AI", icon: "chart", tile: "d1_data_ai", edition: "DATA & AI EDITION",
    curated: "Curated for Data & AI.", line: "A mix of Data & AI learning, from short courses you can start right away to comprehensive programmes designed for long-term career growth.",
    mastery: "Microsoft Data Science & Analytics Mastery Track",
    short: ["Python for Data Science & AI", "Building an ETL Pipeline", "Fundamentals of Applied Statistics", "Statistics for Beginners"],
    free: ["Fundamentals of Deep Learning & Neural Networks", "Introduction to Data Analysis using Excel", "Introduction to NLP", "Unsupervised Learning: Clustering", "Advanced SQL for Analysis", "Introduction to Tableau"],
    flagship: [{ t: "Executive Post Graduate Certificate Programme in Data Science & AI", by: "IIIT Bangalore" }, { t: "Master of Science in Data Science", by: "Liverpool John Moores University" }] },
  { id: "tech", name: "Tech & AI", focus: "Tech & AI", sub: "Coding, automation & AI", icon: "code", tile: "d2_tech_ai", edition: "TECH & AI EDITION",
    curated: "Curated for Tech & AI.", line: "A mix of Tech & AI learning, from short courses you can start right away to comprehensive programmes designed for long-term career growth.",
    mastery: "Microsoft Software Development Mastery Track",
    short: ["Machine Learning Fundamentals", "ML Fundamentals: NLP", "ML Fundamentals: Object Detection", "Workflow Orchestration with Google Cloud Composer"],
    free: ["Fundamentals of Cloud Computing", "Data Structures & Algorithms", "Core Java Basics", "React.js for Beginners", "Node.js for Beginners", "Fundamentals of Cybersecurity"],
    flagship: [{ t: "Executive PG in Forward Deployed AI Engineering", by: "IIIT Bangalore" }, { t: "Chief Technology Officer & AI Leadership Programme" }, { t: "Doctor of Technology in Applied & Agentic AI", by: "Golden Gate University" }] },
  { id: "mkt", name: "Marketing & AI", focus: "Marketing", sub: "Content, growth & AI", icon: "spark", tile: "d3_marketing_ai", edition: "MARKETING & AI EDITION",
    curated: "Curated for Marketing & AI.", line: "A mix of Marketing & AI learning, from short courses you can start right away to comprehensive programmes designed for long-term career growth.",
    mastery: "Microsoft Content & Marketing Mastery Track",
    short: ["Paid Digital Marketing", "Organic Digital Marketing", "Social Media Marketing", "Data-driven Marketing"],
    free: ["Complete Guide to Content Marketing", "Fundamentals of Marketing", "Ultimate Guide to Email Marketing", "Basics of SEO", "Introduction to Social Media Marketing", "Web Analytics for Beginners"],
    flagship: [{ t: "Advanced Certificate in AI-Powered Digital Marketing & Communication", by: "MICA" }] },
  { id: "mgmt", name: "Management & AI", focus: "Management", sub: "Leadership, strategy & AI", icon: "compass", tile: "d4_management_ai", edition: "MANAGEMENT & AI EDITION",
    curated: "Curated for Management & AI.", line: "A mix of Management & AI learning, from short courses you can start right away to comprehensive programmes designed for long-term career growth.",
    mastery: "Microsoft Managerial Excellence Mastery Track",
    short: ["Leading Teams and Organisations", "Management Fundamentals: Strategy", "Management Fundamentals: Managerial Communication", "Solving Problems: Guesstimates"],
    free: ["Business Analytics Fundamentals", "Introduction to Design Thinking", "Business Communication Masterclass", "Economics Masterclass", "Introduction to HR Analytics", "How to Sell Anything"],
    flagship: [{ t: "DBA in Emerging Technologies (Gen & Agentic AI)" }, { t: "MBA", by: "Golden Gate University" }, { t: "Strategic AI for Business Professionals", by: "IIM Kozhikode" }, { t: "General Management for Young Leaders (YLP)", by: "IIM Bangalore" }] }
];

// Scroll 4 curation lines. {d} = domain name. Each line can drop a card into the box (drop: card colour key).
window.CURATION = {
  self: [
    ["Looking at where you want to go.", null], ["Finding the right AI skills.", "ai"], ["Choosing courses in {d}.", "mastery"],
    ["Adding something you can start right away.", "short"], ["Adding something for the bigger career move.", "bigger"],
    ["Getting it ready for the next:\n“Aur beta, aage kya?”", "free"], ["Your AI Badhai Box is ready. ✨", "done"]
  ],
  other: [
    ["Finding the right AI skills.", "ai"], ["Choosing courses in {d}.", "mastery"],
    ["Adding something they can start right away.", "short"], ["Adding something for the bigger career move.", "bigger"],
    ["Getting it ready for the next:\n“Aur beta, aage kya?”", "free"], ["Their AI Badhai Box is ready. ✨", "done"]
  ]
};
