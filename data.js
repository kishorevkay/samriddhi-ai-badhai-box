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

// groups render in order. k = label, t = title, d = description, m = badge (coupon: true = coupon colour),
// items = bullet list, intro = line above the bullets, note/tag = closing line and badge (bigger move), wide = full row
window.DOMAINS = [
  { id: "data", name: "Data & AI", icon: "chart", tile: "d1_data_ai", edition: "DATA & AI EDITION",
    curated: "Curated for Data & AI.", line: "Learning for where data can take you next.",
    groups: [
      { k: "Mastery track", items: ["Data Science & Analytics Mastery Track"] },
      { k: "Short courses", items: ["Python for Data Science & AI", "Building an ETL Pipeline", "Fundamentals of Applied Statistics", "Statistics for Beginners"] },
      { k: "Free courses", wide: true, items: ["Fundamentals of Deep Learning & Neural Networks", "Introduction to Data Analysis using Excel", "Introduction to NLP", "Unsupervised Learning: Clustering", "Advanced SQL for Analysis", "Introduction to Tableau"] },
      { k: "For the bigger move", big: true, items: ["Executive Post Graduate Certificate Programme in Data Science & AI from IIITB", "Master of Science in Data Science from Liverpool John Moores University"] }
    ] },
  { id: "tech", name: "Tech & AI", icon: "code", tile: "d2_tech_ai", edition: "TECH & AI EDITION",
    curated: "Curated for Tech & AI.", line: "Learning for what you want to build next.",
    groups: [
      { k: "Mastery track", items: ["Software Development Mastery Track"] },
      { k: "Short courses", items: ["Machine Learning Fundamentals", "ML Fundamentals: NLP", "ML Fundamentals: Object Detection", "Workflow Orchestration with Google Cloud Composer"] },
      { k: "Free courses", wide: true, items: ["Fundamentals of Cloud Computing", "Data Structures & Algorithms", "Core Java Basics", "React.js for Beginners", "Node.js for Beginners", "Fundamentals of Cybersecurity"] },
      { k: "For the bigger move", big: true, items: ["Executive PG in Forward Deployed AI Engineering, IIIT Bangalore", "Chief Technology Officer & AI Leadership Programme", "Doctor of Technology in Applied & Agentic AI, GGU"] }
    ] },
  { id: "mkt", name: "Marketing & AI", icon: "spark", tile: "d3_marketing_ai", edition: "MARKETING & AI EDITION",
    curated: "Curated for Marketing & AI.", line: "A mix of Marketing & AI learning, from courses you can start right away to deeper programmes for the bigger move.",
    groups: [
      { k: "The essential", t: "Microsoft AI Essentials", d: "A foundation in Generative AI to get started.", m: "100% off this course" },
      { k: "The mastery track", t: "Content & Marketing Mastery Track", d: "A deeper learning path built around Marketing.", m: "₹15,000 off the Content & Marketing Mastery Track", coupon: true },
      { k: "Short courses", d: "Skills to sharpen what you do right now.", items: ["Paid Digital Marketing", "Organic Digital Marketing", "Social Media Marketing", "Data-driven Marketing"] },
      { k: "AI learning", d: "Because whatever comes next will probably have AI in it.", items: ["Introduction to Agentic Systems", "AI Fundamentals: LLM Training Considerations"] },
      { k: "Free courses", wide: true, d: "A few more skills to explore at your own pace.", items: ["Complete Guide to Content Marketing", "Fundamentals of Marketing", "Ultimate Guide to Email Marketing", "Basics of SEO", "Introduction to Social Media Marketing", "Web Analytics for Beginners"] },
      { k: "For the bigger move", big: true, t: "Advanced Certificate in AI-Powered Digital Marketing & Communication", by: "MICA",
        note: "A flagship programme with a scholarship opportunity for when the next move calls for something bigger.", tag: "Speak to a counsellor about available scholarships." }
    ] },
  { id: "mgmt", name: "Management & AI", icon: "compass", tile: "d4_management_ai", edition: "MANAGEMENT & AI EDITION",
    curated: "Curated for Management & AI.", line: "Learning for where you want to lead next.",
    groups: [
      { k: "Mastery track", items: ["Managerial Excellence Mastery Track"] },
      { k: "Short courses", items: ["Leading Teams and Organisations", "Management Fundamentals: Strategy", "Management Fundamentals: Managerial Communication", "Solving Problems: Guesstimates"] },
      { k: "Free courses", wide: true, items: ["Business Analytics Fundamentals", "Introduction to Design Thinking", "Business Communication Masterclass", "Economics Masterclass", "Introduction to HR Analytics", "How to Sell Anything"] },
      { k: "For the bigger move", big: true, intro: "Explore these programmes", items: ["Strategic AI for Business Professionals, IIM Kozhikode", "General Management for Young Leaders, IIM Bangalore", "MBA, Golden Gate University", "DBA in Emerging Technologies"] }
    ] }
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
