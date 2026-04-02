// POST /api/share { analysisId, recipientEmail? }
// Generates a shareable token and returns a public share URL

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SHARE_BASE_URL = 'https://slidesage-app.netlify.app/shared';
const TOKEN_TTL_DAYS = 7;

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

function generateShareToken() {
  // Generate a URL-safe token: 32 random bytes → hex string
  return crypto.randomBytes(32).toString('hex');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  // ── POST: Create a share link ─────────────────────────────────────────
  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Invalid JSON body' }),
      };
    }

    const { analysisId, recipientEmail } = body;

    if (!analysisId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing required field: analysisId' }),
      };
    }

    try {
      const supabase = getSupabase();

      // Verify the analysis exists
      const { data: analysis, error: fetchError } = await supabase
        .from('analyses')
        .select('id, file_name, overall_score, created_at')
        .eq('id', analysisId)
        .single();

      if (fetchError || !analysis) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Analysis not found' }),
        };
      }

      // Check if a valid share already exists for this analysis
      const now = new Date();
      const { data: existing } = await supabase
        .from('shared_reports')
        .select('share_token, expires_at')
        .eq('analysis_id', analysisId)
        .gt('expires_at', now.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existing?.share_token) {
        // Return existing valid share link
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            shareUrl: `${SHARE_BASE_URL}/${existing.share_token}`,
            shareToken: existing.share_token,
            expiresAt: existing.expires_at,
            isExisting: true,
          }),
        };
      }

      // Create new share token
      const shareToken = generateShareToken();
      const expiresAt = new Date(now.getTime() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

      const insertPayload = {
        analysis_id: analysisId,
        share_token: shareToken,
        expires_at: expiresAt.toISOString(),
        recipient_email: recipientEmail || null,
        created_at: now.toISOString(),
      };

      const { error: insertError } = await supabase
        .from('shared_reports')
        .insert(insertPayload);

      if (insertError) throw insertError;

      const shareUrl = `${SHARE_BASE_URL}/${shareToken}`;

      return {
        statusCode: 201,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          shareUrl,
          shareToken,
          expiresAt: expiresAt.toISOString(),
          expiresInDays: TOKEN_TTL_DAYS,
          analysis: {
            id: analysis.id,
            fileName: analysis.file_name,
            overallScore: analysis.overall_score,
          },
          isExisting: false,
        }),
      };
    } catch (error) {
      console.error('Share creation error:', error);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Failed to create share link', details: error.message }),
      };
    }
  }

  // ── GET: Retrieve shared report by token ──────────────────────────────
  if (event.httpMethod === 'GET') {
    const token = event.queryStringParameters?.token;

    if (!token) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing required parameter: token' }),
      };
    }

    try {
      const supabase = getSupabase();

      const { data: share, error: shareError } = await supabase
        .from('shared_reports')
        .select('analysis_id, expires_at, created_at')
        .eq('share_token', token)
        .single();

      if (shareError || !share) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Share link not found' }),
        };
      }

      // Check expiry
      if (new Date(share.expires_at) < new Date()) {
        return {
          statusCode: 410,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            error: 'Share link has expired',
            expiredAt: share.expires_at,
          }),
        };
      }

      // Fetch the full analysis
      const { data: analysis, error: analysisError } = await supabase
        .from('analyses')
        .select('id, file_name, slide_count, overall_score, report_json, created_at')
        .eq('id', share.analysis_id)
        .single();

      if (analysisError || !analysis) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Analysis data not found' }),
        };
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          analysis: {
            id: analysis.id,
            fileName: analysis.file_name,
            slideCount: analysis.slide_count,
            overallScore: analysis.overall_score,
            report: analysis.report_json,
            analyzedAt: analysis.created_at,
          },
          share: {
            token,
            createdAt: share.created_at,
            expiresAt: share.expires_at,
          },
        }),
      };
    } catch (error) {
      console.error('Share fetch error:', error);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Failed to fetch shared report', details: error.message }),
      };
    }
  }

  return {
    statusCode: 405,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: 'Method not allowed. Use POST or GET.' }),
  };
};
