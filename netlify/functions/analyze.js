// POST { slides: [{ slideNumber, title, content, notes }], language, fileName, userSession }
// Returns: Full structured analysis powered by GPT-4o

const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const { checkRateLimit } = require('./rate-limit');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { slides, language = 'en', fileName = 'presentation.pptx', userSession } = body;

    if (!slides || !slides.length) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'No slides provided' }),
      };
    }

    // Rate limiting
    const clientIp =
      event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      event.headers['client-ip'] ||
      'unknown';
    const identifier = userSession || clientIp;

    const rateCheck = await checkRateLimit(identifier, 'analyze');
    if (!rateCheck.allowed) {
      return {
        statusCode: 429,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Rate limit exceeded',
          remaining: 0,
          resetAt: rateCheck.resetAt,
          message: `Free tier allows 3 analyses per hour. Resets at ${new Date(rateCheck.resetAt).toISOString()}.`,
        }),
      };
    }

    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(getDemoResult(slides, fileName)),
      };
    }

    // Build slide content for the prompt
    const slidesText = slides
      .map(
        (s) =>
          `--- SLIDE ${s.slideNumber} ---\nTitle: ${s.title || '(no title)'}\nContent: ${
            s.content?.trim() || '(no text content)'
          }\nSpeaker Notes: ${s.notes?.trim() || '(none)'}`
      )
      .join('\n\n');

    const languageInstruction =
      language !== 'en'
        ? `\n\nIMPORTANT: Provide all text responses (summary, feedback, recommendations, etc.) in the language with code "${language}". Keep JSON keys in English.`
        : '';

    const systemPrompt = `You are SlideSage, an elite presentation coach with 20+ years of experience coaching Fortune 500 executives, TEDx speakers, and startup founders. You have deep expertise in visual design, storytelling, data visualization, audience psychology, and persuasion. Your feedback is always specific, actionable, and constructive — never vague or generic.${languageInstruction}`;

    const userPrompt = `Analyze this ${slides.length}-slide presentation titled "${fileName}".

${slidesText}

Return a COMPLETE analysis as a JSON object with EXACTLY this structure (no extra keys, no markdown, just raw JSON):

{
  "overallScore": <integer 0-100>,
  "executiveSummary": "<3-4 sentences: overall quality, primary strength, biggest weakness, and key recommendation>",
  "presentationType": "<one of: pitch-deck | corporate | educational | sales | keynote | training | product-demo | research | other>",
  "audienceFit": "<2-3 sentences assessing who this presentation is best suited for and how well it addresses their needs>",
  "estimatedPresentationTime": "<estimated delivery time, e.g. '8-10 minutes'>",
  "toneAnalysis": {
    "primary": "<one of: formal | casual | persuasive | inspirational | technical | conversational>",
    "secondary": "<second tone or null>",
    "notes": "<1-2 sentences on tone effectiveness>"
  },
  "strengths": [
    "<specific strength 1>",
    "<specific strength 2>",
    "<specific strength 3>"
  ],
  "weaknesses": [
    "<specific weakness 1>",
    "<specific weakness 2>",
    "<specific weakness 3>"
  ],
  "topRecommendations": [
    {
      "priority": 1,
      "title": "<short recommendation title>",
      "description": "<2-3 sentences with specific, actionable advice>",
      "impact": "<one of: high | medium | low>"
    },
    {
      "priority": 2,
      "title": "<short recommendation title>",
      "description": "<2-3 sentences with specific, actionable advice>",
      "impact": "<one of: high | medium | low>"
    },
    {
      "priority": 3,
      "title": "<short recommendation title>",
      "description": "<2-3 sentences with specific, actionable advice>",
      "impact": "<one of: high | medium | low>"
    },
    {
      "priority": 4,
      "title": "<short recommendation title>",
      "description": "<2-3 sentences with specific, actionable advice>",
      "impact": "<one of: high | medium | low>"
    },
    {
      "priority": 5,
      "title": "<short recommendation title>",
      "description": "<2-3 sentences with specific, actionable advice>",
      "impact": "<one of: high | medium | low>"
    }
  ],
  "slideAnalysis": [
    ${slides
      .map(
        (s) => `{
      "slideNumber": ${s.slideNumber},
      "title": "<slide title or best guess>",
      "scores": {
        "content": <integer 0-100>,
        "design": <integer 0-100>,
        "clarity": <integer 0-100>,
        "engagement": <integer 0-100>,
        "overall": <integer 0-100>
      },
      "feedback": "<2-3 sentences of specific, honest feedback about this slide's content, clarity, and design>",
      "quickWin": "<one specific, immediately actionable improvement for this slide>"
    }`
      )
      .join(',\n    ')}
  ]
}

Scoring guidelines:
- 90-100: Exceptional, professional quality
- 75-89: Good, minor improvements needed
- 60-74: Average, several improvements needed
- 40-59: Below average, significant work needed
- 0-39: Poor, needs major overhaul

Be honest and calibrated. Most real presentations score 55-75. Reserve 85+ for genuinely excellent work.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const analysisResult = JSON.parse(completion.choices[0].message.content);

    // Enrich with metadata
    const report = {
      ...analysisResult,
      metadata: {
        fileName,
        slideCount: slides.length,
        language,
        analyzedAt: new Date().toISOString(),
        model: 'gpt-4o',
        tokensUsed: completion.usage?.total_tokens || 0,
      },
    };

    // Save to Supabase (fire and forget — don't block the response)
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      supabase
        .from('analyses')
        .insert({
          user_session: userSession || null,
          file_name: fileName,
          slide_count: slides.length,
          overall_score: report.overallScore,
          report_json: report,
          created_at: new Date().toISOString(),
        })
        .then(({ error }) => {
          if (error) console.error('Supabase save error:', error.message);
        });
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(report),
    };
  } catch (error) {
    console.error('Analysis error:', error);

    // Handle OpenAI JSON parse errors gracefully
    if (error instanceof SyntaxError) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'AI returned malformed response. Please try again.',
          details: error.message,
        }),
      };
    }

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Analysis failed',
        details: error.message,
      }),
    };
  }
};

// Demo result when no API key is configured
function getDemoResult(slides, fileName) {
  const count = slides.length || 7;
  const feedbackBank = [
    {
      feedback:
        'Strong opening that clearly establishes the problem space. The value proposition is well-articulated, though adding a compelling statistic in the first 10 seconds would increase impact significantly.',
      quickWin: 'Add one striking statistic (e.g., market size or pain-point data) to the title slide.',
    },
    {
      feedback:
        'This slide is text-heavy and risks losing the audience early. Breaking content into 3 digestible bullet points and pairing each with a supporting visual would dramatically improve retention.',
      quickWin: 'Cut text by 50% — move detail to speaker notes and use 3 short bullets instead.',
    },
    {
      feedback:
        'Good use of data, but the chart needs clearer labeling. The key insight is buried — lead with the conclusion, then show the supporting data.',
      quickWin: 'Add a bold headline above the chart that states the insight directly (e.g., "Revenue grew 3× in 12 months").',
    },
    {
      feedback:
        'Compelling narrative here, but the slide tries to do too much. Consider splitting into two slides for better pacing and audience comprehension.',
      quickWin: 'Split this into two slides: problem on slide A, solution on slide B.',
    },
    {
      feedback:
        'Clean layout with good whitespace. The color contrast could be improved — light gray text on white background fails accessibility standards.',
      quickWin: 'Change body text color to #333333 or darker to meet WCAG AA contrast ratio.',
    },
    {
      feedback:
        'Excellent call-to-action with clear next steps. The urgency is well-established. Adding social proof (a quote or logo bar) would strengthen credibility at this critical moment.',
      quickWin: 'Add 2-3 customer logos or a short testimonial quote to this slide.',
    },
    {
      feedback:
        'This summary slide effectively recaps key points. Consider adding a memorable one-liner or tagline that the audience will take away as the single most important message.',
      quickWin: 'Add a bold, memorable closing statement in 10 words or fewer.',
    },
  ];

  return {
    overallScore: 71,
    executiveSummary:
      `"${fileName}" demonstrates solid foundational structure with a clear narrative arc. The content is relevant and well-researched, though visual consistency and information density need attention. Several slides carry too much text, which risks losing audience engagement during delivery. Focusing on visual hierarchy and reducing cognitive load will significantly elevate this presentation.`,
    presentationType: 'pitch-deck',
    audienceFit:
      'Best suited for business stakeholders and decision-makers familiar with the industry. The technical depth may be too high for a general audience, and some slides would benefit from more context for non-specialist viewers.',
    estimatedPresentationTime: `${Math.round(count * 1.5)}-${Math.round(count * 2)} minutes`,
    toneAnalysis: {
      primary: 'formal',
      secondary: 'persuasive',
      notes:
        'The tone is appropriately professional but occasionally stiff. Introducing a more conversational element in the opening and closing slides would improve audience connection.',
    },
    strengths: [
      'Clear logical flow from problem identification to solution presentation',
      'Strong data-driven arguments with relevant supporting evidence',
      'Well-defined call-to-action with measurable next steps',
    ],
    weaknesses: [
      'Inconsistent visual style across slides — fonts and colors vary without clear system',
      'Several slides are text-heavy, creating cognitive overload for the audience',
      'Missing audience engagement hooks — no questions, stories, or interactive elements',
    ],
    topRecommendations: [
      {
        priority: 1,
        title: 'Establish a Visual Design System',
        description:
          'Choose exactly 2 fonts, 3 brand colors, and 1 icon style — and apply them consistently across every slide. Visual consistency signals professionalism and makes the presentation feel polished.',
        impact: 'high',
      },
      {
        priority: 2,
        title: 'Reduce Text Density by 40%',
        description:
          'Move detailed explanations to speaker notes and keep slides to a maximum of 40 words. Audiences read OR listen — they cannot do both effectively.',
        impact: 'high',
      },
      {
        priority: 3,
        title: 'Open with a Story or Surprising Statistic',
        description:
          'Replace the current opening with a 30-second story or a single surprising number that frames the problem emotionally. This creates immediate buy-in from the audience.',
        impact: 'high',
      },
      {
        priority: 4,
        title: 'Add Social Proof Elements',
        description:
          'Include customer logos, testimonials, or case study snippets to build credibility. Social proof is especially critical for pitch decks targeting investors or enterprise clients.',
        impact: 'medium',
      },
      {
        priority: 5,
        title: 'Improve Data Visualization',
        description:
          'Replace generic bar charts with more impactful visuals — use progress indicators, comparison tables, or annotated charts that highlight the key insight. Always state the conclusion above the chart.',
        impact: 'medium',
      },
    ],
    slideAnalysis: Array.from({ length: count }, (_, i) => {
      const fb = feedbackBank[i % feedbackBank.length];
      const base = 55 + Math.floor(Math.random() * 30);
      return {
        slideNumber: i + 1,
        title: slides[i]?.title || `Slide ${i + 1}`,
        scores: {
          content: Math.min(100, base + Math.floor(Math.random() * 10)),
          design: Math.min(100, base - 5 + Math.floor(Math.random() * 15)),
          clarity: Math.min(100, base + Math.floor(Math.random() * 12)),
          engagement: Math.min(100, base - 10 + Math.floor(Math.random() * 20)),
          overall: base,
        },
        feedback: fb.feedback,
        quickWin: fb.quickWin,
      };
    }),
    metadata: {
      fileName,
      slideCount: count,
      language: 'en',
      analyzedAt: new Date().toISOString(),
      model: 'demo',
      tokensUsed: 0,
    },
  };
}
