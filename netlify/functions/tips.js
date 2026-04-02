// GET /api/tips?category=design|content|delivery|structure
// Returns curated presentation tips organized by category

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const TIPS_LIBRARY = [
  // ─── DESIGN ──────────────────────────────────────────────────────────────
  {
    id: 'd001',
    category: 'design',
    title: 'Follow the 3-Color Rule',
    description:
      'Limit your entire presentation to a maximum of 3 primary colors. A tight color palette creates visual cohesion and signals intentional design.',
    example:
      'Use your brand primary for headings, a neutral (white/light gray) for backgrounds, and an accent color sparingly for highlights and CTAs.',
    difficulty: 'easy',
  },
  {
    id: 'd002',
    category: 'design',
    title: 'Use Only 2 Fonts',
    description:
      'Pick one font for headings (bold, high contrast) and one for body text (legible at small sizes). Mixing more than 2 fonts creates visual noise.',
    example:
      "Montserrat Bold for headlines + Inter Regular for body text is a classic, professional pairing.",
    difficulty: 'easy',
  },
  {
    id: 'd003',
    category: 'design',
    title: "Embrace Whitespace — It's Not Wasted Space",
    description:
      'Empty space around elements is a design tool. It directs the eye, reduces cognitive load, and makes important content feel more impactful.',
    example:
      'If a slide feels crowded, remove 30% of the content and increase the margins. The remaining content will feel more powerful.',
    difficulty: 'easy',
  },
  {
    id: 'd004',
    category: 'design',
    title: 'Maintain Consistent Alignment',
    description:
      'Every element on every slide should align to a grid. Misaligned text and images signal laziness and distract from your message.',
    example:
      'Use your software\'s "Align" and "Distribute" tools. A common grid: 80px margin on all sides, 24px gutters between columns.',
    difficulty: 'easy',
  },
  {
    id: 'd005',
    category: 'design',
    title: 'Size Elements by Importance',
    description:
      'The most important element on a slide should be the largest. Use font size, scale, and contrast to create a clear visual hierarchy.',
    example:
      'Headline: 40-48pt. Subheadline: 24-28pt. Body: 18-20pt. Never go below 18pt — anything smaller is unreadable from 3 meters away.',
    difficulty: 'easy',
  },
  {
    id: 'd006',
    category: 'design',
    title: "Replace Clip Art with Real Photography",
    description:
      'Generic clip art dates your slides immediately. High-quality photography (even free stock images) dramatically elevates perceived quality.',
    example:
      'Unsplash.com and Pexels.com offer thousands of professional-quality images for free. Search for images that evoke emotion, not just "illustrate" the point.',
    difficulty: 'easy',
  },
  {
    id: 'd007',
    category: 'design',
    title: 'Use Full-Bleed Images for Impact',
    description:
      'Extend an image across the entire slide background with text overlaid. This creates cinematic, high-impact slides that command attention.',
    example:
      'Use a dark overlay (black at 40-50% opacity) on the image before adding white text — this ensures readability while keeping visual richness.',
    difficulty: 'medium',
  },
  {
    id: 'd008',
    category: 'design',
    title: 'Apply the 6×6 Rule to Bullet Slides',
    description:
      'No more than 6 bullet points per slide, and no more than 6 words per bullet. This forces you to distill ideas to their essence.',
    example:
      "Instead of 'Our platform reduces operational costs through advanced ML-based process automation', write: 'Cut costs 40% with ML automation'.",
    difficulty: 'medium',
  },
  {
    id: 'd009',
    category: 'design',
    title: 'Design for the Back Row',
    description:
      'Assume your audience is 5 meters away. If someone sitting at the back cannot read your slide clearly, it needs to be redesigned.',
    example:
      'Print your slide on paper and hold it at arm\'s length. If you can\'t read it easily, the font is too small or the contrast is too low.',
    difficulty: 'easy',
  },
  {
    id: 'd010',
    category: 'design',
    title: 'Use Icons Instead of Bullet Points',
    description:
      'Replace boring bullet points with simple icons paired with short text labels. This adds visual interest while maintaining scannability.',
    example:
      'Noun Project, Flaticon, and Heroicons offer thousands of free, consistent icon sets. Use one icon style throughout for cohesion.',
    difficulty: 'medium',
  },
  {
    id: 'd011',
    category: 'design',
    title: 'Add Subtle Slide Numbers',
    description:
      'Always include slide numbers in a consistent position (bottom right is standard). They help the audience reference slides during Q&A.',
    example:
      'Format: "7 / 24" shows current slide and total. Place in bottom-right corner at 12-14pt in a low-contrast color so they don\'t dominate.',
    difficulty: 'easy',
  },
  {
    id: 'd012',
    category: 'design',
    title: 'Ensure Color Accessibility (WCAG Contrast)',
    description:
      'Text must have a contrast ratio of at least 4.5:1 against its background. Low contrast excludes audience members with visual impairments.',
    example:
      'Use WebAIM\'s Contrast Checker (webaim.org/resources/contrastchecker) to verify. Dark gray (#333) on white passes; light gray (#999) on white fails.',
    difficulty: 'medium',
  },
  {
    id: 'd013',
    category: 'design',
    title: "One Big Idea Per Slide",
    description:
      'Each slide should communicate exactly one idea. If a slide needs two sections or two main points, split it into two slides.',
    example:
      'Ask yourself: "What is the single most important thing I want the audience to remember from this slide?" If you can\'t answer in one sentence, simplify.',
    difficulty: 'easy',
  },

  // ─── CONTENT ─────────────────────────────────────────────────────────────
  {
    id: 'c001',
    category: 'content',
    title: 'Lead with the Conclusion',
    description:
      'State your key finding or recommendation at the top of each slide — not at the bottom. Audiences often scan slides before you speak; give them the insight first.',
    example:
      'Instead of showing a chart and explaining it, write "Revenue grew 3× in 12 months" as the slide headline, then show the chart as supporting evidence.',
    difficulty: 'easy',
  },
  {
    id: 'c002',
    category: 'content',
    title: 'Use the SCR Framework for Each Slide',
    description:
      'Structure each slide as: Situation (what\'s the context?), Complication (what\'s the problem?), Resolution (what\'s your answer?). This is McKinsey\'s consulting narrative structure.',
    example:
      'Slide: "Our churn rate is 8% (Situation). Customers leave because onboarding takes too long (Complication). We redesigned onboarding to reduce time-to-value from 14 days to 3 (Resolution)."',
    difficulty: 'medium',
  },
  {
    id: 'c003',
    category: 'content',
    title: 'Use Data to Support, Not to Fill',
    description:
      'Every data point should support a specific claim. If you cannot state in one sentence why a number is on the slide, remove it.',
    example:
      'Don\'t show a table of 20 metrics. Instead, show the 2-3 metrics that directly prove your point, and reference the rest as "available in the appendix".',
    difficulty: 'medium',
  },
  {
    id: 'c004',
    category: 'content',
    title: "Build an Appendix for Deep Dives",
    description:
      'Move complex data, methodology details, and supporting research to an appendix. Keep the main deck flowing while having backup material for Q&A.',
    example:
      'Label appendix slides clearly (e.g., "Appendix A: Full Financial Model"). During Q&A, say "Great question — I have more detail on slide A3."',
    difficulty: 'easy',
  },
  {
    id: 'c005',
    category: 'content',
    title: 'Start with the Problem, Not the Solution',
    description:
      'Audiences connect with problems before they can appreciate solutions. Spend the first 15-20% of your presentation establishing why the problem matters.',
    example:
      'Before showing your product features, spend 2-3 slides documenting the painful status quo your audience experiences daily.',
    difficulty: 'medium',
  },
  {
    id: 'c006',
    category: 'content',
    title: 'Use Analogies to Explain Complex Concepts',
    description:
      'When introducing technical or abstract concepts, anchor them to something familiar. A well-chosen analogy can do the work of three explanatory slides.',
    example:
      '"Our API is like a waiter at a restaurant — it takes your order (request), goes to the kitchen (server), and brings back exactly what you asked for (response)."',
    difficulty: 'medium',
  },
  {
    id: 'c007',
    category: 'content',
    title: 'Cite Your Sources',
    description:
      'Every statistic, quote, or external claim should have a source attribution. Unverified claims undermine your credibility — even if the data is accurate.',
    example:
      'Add a small footnote: "Source: Gartner, 2024" or "Source: Internal data, Q3 2024". Keep it small (10-12pt) and position it at the bottom of the slide.',
    difficulty: 'easy',
  },
  {
    id: 'c008',
    category: 'content',
    title: "Tailor Content for Your Specific Audience",
    description:
      'Before writing a single slide, define your audience\'s role, knowledge level, and primary concern. Every slide should address what they care about — not what you find interesting.',
    example:
      'For a CFO: lead with ROI and payback period. For an engineering team: lead with architecture and integration complexity. Same product, different angle.',
    difficulty: 'medium',
  },
  {
    id: 'c009',
    category: 'content',
    title: "Use Numbers Precisely — Avoid Vague Claims",
    description:
      '"Significantly improved" is meaningless. "Reduced load time from 4.2s to 0.8s (81% faster)" is powerful. Specific numbers build credibility.',
    example:
      'Audit every adjective like "fast", "large", "significant" and replace it with a specific, verifiable number.',
    difficulty: 'easy',
  },
  {
    id: 'c010',
    category: 'content',
    title: "Write Slide Titles as Action Statements",
    description:
      'Transform passive titles ("Q3 Financial Results") into action statements that communicate the key insight ("Q3 Revenue Exceeded Forecast by 18%").',
    example:
      'Passive: "Customer Feedback Analysis"\nActive: "87% of Customers Would Recommend Us to Colleagues"',
    difficulty: 'easy',
  },
  {
    id: 'c011',
    category: 'content',
    title: "Include a Compelling Executive Summary Slide",
    description:
      'For presentations over 10 slides, add a second slide after the title that summarizes all key conclusions in 3-5 bullet points. Senior stakeholders often read only this slide.',
    example:
      '"Bottom Line Up Front (BLUF)": 3-5 bullets, each starting with a number or key verb. The full deck provides supporting evidence for each point.',
    difficulty: 'medium',
  },
  {
    id: 'c012',
    category: 'content',
    title: 'Use Competitive Comparison Tables Strategically',
    description:
      'Comparison tables are powerful in sales and pitch decks — but only if you control the criteria. Choose comparison dimensions that genuinely favor your solution.',
    example:
      'List 5-7 evaluation criteria. Show competitors with mixed checkmarks to appear objective. Ensure your solution has clear advantages in the 2-3 highest-priority criteria.',
    difficulty: 'hard',
  },
  {
    id: 'c013',
    category: 'content',
    title: "End Every Presentation with a Clear Next Step",
    description:
      'Never end on "Thank you / Questions". End with a specific, time-bound call to action that tells the audience exactly what you want them to do next.',
    example:
      '"Schedule a 30-minute pilot discussion by [date]" or "Approve the $50K budget by Friday so we can start in Q1".',
    difficulty: 'easy',
  },

  // ─── DELIVERY ────────────────────────────────────────────────────────────
  {
    id: 'v001',
    category: 'delivery',
    title: 'Use the 1-Minute-Per-Slide Rule',
    description:
      'As a baseline, budget 1 minute per slide for a standard business presentation. Adjust based on complexity, but use this to diagnose if your deck is too long.',
    example:
      'A 30-minute presentation slot should have no more than 20-25 slides (allowing 5-10 minutes for questions).',
    difficulty: 'easy',
  },
  {
    id: 'v002',
    category: 'delivery',
    title: 'Never Read Your Slides Word for Word',
    description:
      'Slides are visual anchors, not scripts. Reading from them signals that you\'re unprepared and forces the audience to choose between reading and listening to you.',
    example:
      'Write 3 bullet points on the slide; deliver a 60-second story about each point from memory. The slide is a reminder, not a teleprompter.',
    difficulty: 'medium',
  },
  {
    id: 'v003',
    category: 'delivery',
    title: 'Use Speaker Notes for Complex Slides',
    description:
      'Move detailed explanations, statistics, and talking points to speaker notes. This keeps slides clean while ensuring you don\'t forget key points during delivery.',
    example:
      'In PowerPoint/Keynote, write full sentences in speaker notes that you\'d actually say. Practice presenting with presenter view enabled.',
    difficulty: 'easy',
  },
  {
    id: 'v004',
    category: 'delivery',
    title: 'Pause After Key Points',
    description:
      'After making a critical point, pause for 2-3 seconds before moving on. The silence creates emphasis and gives the audience time to process the information.',
    example:
      'After showing a dramatic statistic, say the number, pause, make eye contact with different audience members, then continue. The pause is powerful.',
    difficulty: 'medium',
  },
  {
    id: 'v005',
    category: 'delivery',
    title: 'Open with a Hook in the First 30 Seconds',
    description:
      'The first 30 seconds determine whether the audience will engage. Open with a surprising statistic, a short story, a bold statement, or a provocative question.',
    example:
      '"Before I start — how many of you have lost a customer in the last 90 days?" (Pause while hands go up.) "Today I\'m going to show you how to stop that from happening."',
    difficulty: 'medium',
  },
  {
    id: 'v006',
    category: 'delivery',
    title: "Rehearse Out Loud, Not Just in Your Head",
    description:
      'Silent mental rehearsal gives you false confidence. Speaking out loud reveals filler words, awkward transitions, and timing issues that mental rehearsal misses.',
    example:
      'Record yourself on your phone. Watch it back without cringing. Focus on pacing, filler words ("um", "like", "you know"), and whether your energy is appropriate.',
    difficulty: 'medium',
  },
  {
    id: 'v007',
    category: 'delivery',
    title: 'Manage Q&A with the PREP Framework',
    description:
      'Answer questions using: Point (direct answer), Reason (why), Example (evidence), Point again (restate). This ensures concise, complete answers even under pressure.',
    example:
      'Q: "Why is your pricing so high?"\nP: "Our pricing reflects premium support."\nR: "Because enterprise customers need SLA guarantees."\nE: "Our largest client reduced downtime 60%."\nP: "That\'s why we position as premium."',
    difficulty: 'hard',
  },
  {
    id: 'v008',
    category: 'delivery',
    title: 'Use Confident Body Language',
    description:
      'Stand with feet shoulder-width apart, maintain eye contact with different audience members, and use open hand gestures. Your body language communicates confidence before you say a word.',
    example:
      'The "power pose" before presenting (2 minutes of expansive posture) has been shown to reduce cortisol and increase perceived confidence. Try it in a private space before going on.',
    difficulty: 'medium',
  },
  {
    id: 'v009',
    category: 'delivery',
    title: 'Signal Slide Transitions Verbally',
    description:
      'Before advancing a slide, say a transitional phrase that prepares the audience. This prevents the jarring effect of the screen changing unexpectedly.',
    example:
      '"Now, the interesting thing about that data is..." (advance slide). Or "Let me show you what that looks like in practice..." (advance slide).',
    difficulty: 'easy',
  },
  {
    id: 'v010',
    category: 'delivery',
    title: 'Practice the First and Last 2 Minutes Until Perfect',
    description:
      'Openings and closings are remembered most. These segments should be rehearsed until they\'re nearly word-perfect — everything in between can be more fluid.',
    example:
      'Script your exact opening 3 sentences and your exact closing CTA. Memorize them. The confidence this creates will carry through the rest of the presentation.',
    difficulty: 'medium',
  },
  {
    id: 'v011',
    category: 'delivery',
    title: 'Adapt Your Energy to the Room',
    description:
      'Read the room constantly. If energy is low, increase yours. If the audience seems overwhelmed, slow down. A great presenter adjusts in real time.',
    example:
      'Insert 2 "check-in" questions into your deck: "Does this match what you\'re seeing?" or "Is this level of detail useful?" These reset engagement and gather feedback.',
    difficulty: 'hard',
  },
  {
    id: 'v012',
    category: 'delivery',
    title: 'Have a Technical Backup Plan',
    description:
      'Always have a PDF backup of your slides on a USB drive and accessible via email. Technology fails at the worst moments.',
    example:
      'Export your presentation as a PDF, upload to Google Drive or email to yourself. If slides fail, you can present from a browser.',
    difficulty: 'easy',
  },

  // ─── STRUCTURE ───────────────────────────────────────────────────────────
  {
    id: 's001',
    category: 'structure',
    title: 'Follow the Classic 3-Act Structure',
    description:
      'Every great presentation follows: Setup (what\'s the situation?), Confrontation (what\'s the problem/challenge?), Resolution (here\'s the solution and path forward).',
    example:
      'Act 1 (20%): The world today, the problem, the cost of inaction.\nAct 2 (50%): The solution, how it works, the evidence.\nAct 3 (30%): The impact, ROI, and call to action.',
    difficulty: 'medium',
  },
  {
    id: 's002',
    category: 'structure',
    title: 'Use Section Dividers Between Chapters',
    description:
      'For presentations over 12 slides, add section title slides that act as chapter breaks. This helps audiences track where they are in the narrative.',
    example:
      'Use a full-bleed colored slide with the section name in large type: "Part 2: Our Solution". Keep these visually distinct from content slides.',
    difficulty: 'easy',
  },
  {
    id: 's003',
    category: 'structure',
    title: 'Build a Logical "So What?" Chain',
    description:
      'Every slide should answer "so what?" — if you remove it, the story should still make sense. Slides that don\'t advance the narrative should be cut or moved to the appendix.',
    example:
      'Review your deck and ask "so what?" after each slide. If you can\'t answer in 10 words, that slide may not earn its place in the main deck.',
    difficulty: 'medium',
  },
  {
    id: 's004',
    category: 'structure',
    title: "Use the 'Tell Them Three Times' Rule",
    description:
      'Introduce your key message (tell them what you\'ll tell them), deliver it (tell them), then reinforce it in the closing (tell them what you told them).',
    example:
      'Slide 2: "Today I\'ll show you three ways to cut customer acquisition costs."\nSlides 5-7: Present each method.\nLast slide: "In summary, these three approaches will cut your CAC by 40%."',
    difficulty: 'easy',
  },
  {
    id: 's005',
    category: 'structure',
    title: 'Match Structure to Decision Type',
    description:
      'Different decisions require different structures. Choosing between options? Use a comparison structure. Driving action? Use a problem-solution structure. Educating? Use a sequential/modular structure.',
    example:
      'If you want approval for a budget: Problem → Impact of Inaction → Solution → Cost/ROI → Ask.\nIf comparing vendors: Criteria → Evaluation → Recommendation → Next Steps.',
    difficulty: 'hard',
  },
  {
    id: 's006',
    category: 'structure',
    title: 'Limit to 7 Slides for Attention Span',
    description:
      'Cognitive research shows audiences begin to disengage after 7-10 slides of continuous content. Use this as a guide: if your deck is 20 slides, consider whether it can be 10 key slides + appendix.',
    example:
      'Challenge: Reduce a 20-slide deck to a 7-slide "executive summary" version. You\'ll discover what\'s truly essential and what\'s filler.',
    difficulty: 'hard',
  },
  {
    id: 's007',
    category: 'structure',
    title: 'Place the Agenda After the Opening Hook',
    description:
      'Show a brief agenda slide (3-4 items max) after your opening hook, not before. The hook creates desire; the agenda shows how you\'ll deliver.',
    example:
      'Hook slide → Agenda slide ("Here\'s how we\'ll get there: 1. The Problem, 2. Our Approach, 3. The Business Case, 4. Next Steps") → Main content.',
    difficulty: 'easy',
  },
  {
    id: 's008',
    category: 'structure',
    title: "Use 'Pyramid Principle' for Executive Presentations",
    description:
      'Barbara Minto\'s Pyramid Principle: start with the governing thought (answer), support with 3 key arguments, support each argument with facts. Executives want conclusions first.',
    example:
      'Slide 1: "We should acquire CompanyX for $50M" (the answer).\nSlides 2-4: Argument 1 (market access), Argument 2 (technology synergy), Argument 3 (talent acquisition).\nSlides 5-15: Supporting data for each argument.',
    difficulty: 'hard',
  },
  {
    id: 's009',
    category: 'structure',
    title: 'Build Progressive Disclosure with Animations',
    description:
      'Reveal complex diagrams or process flows element by element. This controls audience attention and prevents them from reading ahead of your explanation.',
    example:
      'For a 5-step process diagram: start with step 1 visible, reveal each subsequent step as you explain it. Use "Appear" animation (not "Fly In" — keep it subtle).',
    difficulty: 'medium',
  },
  {
    id: 's010',
    category: 'structure',
    title: "Separate 'Must Know' from 'Nice to Know'",
    description:
      'Classify every slide as either critical to the decision/understanding or supplementary. Only critical slides belong in the main deck; supplementary slides go in the appendix.',
    example:
      'Use a two-pass review: first pass, mark each slide M (must know) or N (nice to know). Second pass, move all N slides to an appendix.',
    difficulty: 'medium',
  },
  {
    id: 's011',
    category: 'structure',
    title: "Design Your Closing Slide as a 'Leaving Slide'",
    description:
      'The last slide visible during Q&A is your most-viewed slide. Make it contain your most important information, not just "Thank You" or a blank.',
    example:
      'Closing slide should show: your key takeaway message, your contact details, the specific ask/CTA, and optionally your company\'s key differentiators or tagline.',
    difficulty: 'medium',
  },
  {
    id: 's012',
    category: 'structure',
    title: 'Use a "Before/After" Structure for Transformation Stories',
    description:
      'When presenting a change, improvement, or transformation, structure the content as Before (current painful state) → Bridge (your intervention) → After (improved future state).',
    example:
      '"Before: Sales team spent 40% of time on manual data entry.\nOur Solution: AI-powered CRM auto-populates 80% of fields.\nAfter: Sales reps now spend 40% more time on actual selling."',
    difficulty: 'easy',
  },
];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const category = event.queryStringParameters?.category;
  const difficulty = event.queryStringParameters?.difficulty;
  const limit = parseInt(event.queryStringParameters?.limit || '50', 10);
  const random = event.queryStringParameters?.random === 'true';

  let tips = [...TIPS_LIBRARY];

  // Filter by category
  const validCategories = ['design', 'content', 'delivery', 'structure'];
  if (category) {
    if (!validCategories.includes(category)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        }),
      };
    }
    tips = tips.filter((t) => t.category === category);
  }

  // Filter by difficulty
  if (difficulty) {
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(difficulty)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: `Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}`,
        }),
      };
    }
    tips = tips.filter((t) => t.difficulty === difficulty);
  }

  // Shuffle if random requested
  if (random) {
    tips = tips.sort(() => Math.random() - 0.5);
  }

  // Apply limit
  tips = tips.slice(0, Math.min(limit, 100));

  // Summary counts by category
  const categoryCounts = validCategories.reduce((acc, cat) => {
    acc[cat] = TIPS_LIBRARY.filter((t) => t.category === cat).length;
    return acc;
  }, {});

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      tips,
      meta: {
        total: tips.length,
        totalInLibrary: TIPS_LIBRARY.length,
        categoryCounts,
        filters: { category: category || null, difficulty: difficulty || null },
      },
    }),
  };
};
