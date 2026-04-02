// GET  /api/history?session={sessionId}  — returns last 10 analyses for a session
// DELETE /api/history?id={analysisId}   — deletes a specific analysis

const { createClient } = require('@supabase/supabase-js');

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  // ── GET: Fetch analysis history for a session ──────────────────────────
  if (event.httpMethod === 'GET') {
    const sessionId = event.queryStringParameters?.session;
    if (!sessionId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing required parameter: session' }),
      };
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('analyses')
        .select(
          'id, file_name, slide_count, overall_score, created_at, report_json'
        )
        .eq('user_session', sessionId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Strip large report_json from list view — only keep summary fields
      const analyses = (data || []).map((row) => ({
        id: row.id,
        fileName: row.file_name,
        slideCount: row.slide_count,
        overallScore: row.overall_score,
        createdAt: row.created_at,
        summary: row.report_json?.executiveSummary || row.report_json?.summary || null,
        presentationType: row.report_json?.presentationType || null,
        estimatedTime: row.report_json?.estimatedPresentationTime || null,
      }));

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          analyses,
          total: analyses.length,
          sessionId,
        }),
      };
    } catch (error) {
      console.error('History fetch error:', error);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Failed to fetch history', details: error.message }),
      };
    }
  }

  // ── DELETE: Remove a specific analysis ────────────────────────────────
  if (event.httpMethod === 'DELETE') {
    const analysisId = event.queryStringParameters?.id;
    const sessionId = event.queryStringParameters?.session;

    if (!analysisId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing required parameter: id' }),
      };
    }

    try {
      const supabase = getSupabase();

      // Build the delete query — scope to session if provided (security measure)
      let query = supabase.from('analyses').delete().eq('id', analysisId);
      if (sessionId) {
        query = query.eq('user_session', sessionId);
      }

      const { error, count } = await query;
      if (error) throw error;

      // Also clean up any shared reports linked to this analysis
      await supabase
        .from('shared_reports')
        .delete()
        .eq('analysis_id', analysisId)
        .then(() => {}); // fire and forget

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          message: 'Analysis deleted successfully',
          id: analysisId,
        }),
      };
    } catch (error) {
      console.error('History delete error:', error);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Failed to delete analysis', details: error.message }),
      };
    }
  }

  return {
    statusCode: 405,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: 'Method not allowed. Use GET or DELETE.' }),
  };
};
