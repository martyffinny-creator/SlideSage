// ============================================================
// SlideSage — Netlify Function: analyze.js
// Accepts POST with { slides: [...], language: "en" }
// Calls Anthropic Claude and returns structured analysis
// ============================================================

const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const ALLOWED_ORIGINS = [
  'https://slidesage-app.netlify.app',
  'http://localhost:3000',
  'http://localhost:8888',
];

exports.handler = async (event, context) => {
  // ── CORS Headers ─────────────────────────────────────────
  const origin = event.headers.origin || event.headers.Origin || '';
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // ── Parse Body ────────────────────────────────────────────
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const { slides, language = 'en', fileName = 'presentation.pptx', sessionId } = body;

  if (!slides || !Array.isArray(slides) || slides.length === 0) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'slides array is required and must not be empty' }),
    };
  }

  if (slides.length > 100) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Maximum 100 slides per analysis' }),
    };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set');
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Analysis service not configured. Please set ANTHROPIC_API_KEY.' }),
    };
  }

  // ── Build Prompt ──────────────────────────────────────────
  const slideSummaries = slides.map((slide, i) => {
    return `Slide ${slide.slideNumber || i + 1}${slide.title ? ` — "${slide.title}"` : ''}:\n${slide.textContent || '(no text content)'}`;
  }).join('\n\n');

  const systemPrompt = `You are an expert presentation coach with 20+ years of experience coaching executives, startup founders, and sales teams. You provide honest, specific, and actionable feedback on PowerPoint presentations.

Analyze the presentation slides provided and return ONLY a valid JSON object with this exact structure:
{
  "overallScore": <integer 0-100>,
  "summary": "<2-3 sentence executive summary of the presentation quality>",
  "slides": [
    {
      "slideNumber": <number>,
      "title": "<slide title or 'Slide N'>",
      "score": <integer 0-100>,
      "feedback": "<2-3 sentence specific, actionable feedback for this slide>"
    }
  ],
  "recommendations": [
    "<specific recommendation 1>",
    "<specific recommendation 2>",
    "<specific recommendation 3>"
  ]
}

Scoring guide:
- 90-100: Excellent — clear, compelling, well-structured
- 75-89: Good — solid with minor improvements needed
- 60-74: Fair — functional but needs work
- 40-59: Poor — significant issues affecting clarity
- 0-39: Needs major revision

Be honest, specific, and actionable. No generic praise. Every piece of feedback should be implementable.
Language for feedback: ${language}`;

  const userPrompt = `Please analyze this presentation (${slides.length} slides) from file "${fileName}":

${slideSummaries}

Return the JSON analysis only. No other text.`;

  // ── Call Claude ───────────────────────────────────────────
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt,
    });

    const content = message.content[0]?.text || '';

    // Extract JSON from response
    let analysisData;
    try {
      // Try direct parse first
      analysisData = JSON.parse(content);
    } catch {
      // Try to extract JSON block from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse AI response as JSON');
      }
      analysisData = JSON.parse(jsonMatch[0]);
    }

    // Validate structure
    if (
      typeof analysisData.overallScore !== 'number' ||
      !analysisData.summary ||
      !Array.isArray(analysisData.slides) ||
      !Array.isArray(analysisData.recommendations)
    ) {
      throw new Error('AI response missing required fields');
    }

    // Clamp score
    analysisData.overallScore = Math.max(0, Math.min(100, Math.round(analysisData.overallScore)));

    // ── Optional: log to Supabase ─────────────────────────────
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY && sessionId) {
      try {
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_KEY
        );
        await supabase.from('analyses').insert({
          user_session: sessionId,
          file_name: fileName,
          slide_count: slides.length,
          overall_score: analysisData.overallScore,
          report_json: analysisData,
          created_at: new Date().toISOString(),
        });
      } catch (supabaseError) {
        console.warn('Supabase logging failed (non-fatal):', supabaseError.message);
      }
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify(analysisData),
    };

  } catch (error) {
    console.error('Analysis error:', error);

    // Determine error type
    if (error.status === 401) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'AI service authentication failed. Please contact support.' }),
      };
    }

    if (error.status === 429) {
      return {
        statusCode: 429,
        headers: { ...corsHeaders, 'Retry-After': '60' },
        body: JSON.stringify({ error: 'Too many requests. Please wait a moment and try again.' }),
      };
    }

    if (error.status === 529 || error.message?.includes('overloaded')) {
      return {
        statusCode: 503,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'AI service is temporarily busy. Please try again in 30 seconds.' }),
      };
    }

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Analysis failed. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      }),
    };
  }
};
