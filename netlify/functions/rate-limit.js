// Rate limiting middleware helper
// NOT a Netlify function — imported by other functions
//
// Usage:
//   const { checkRateLimit } = require('./rate-limit');
//   const result = await checkRateLimit(identifier, endpoint);
//   if (!result.allowed) return { statusCode: 429, ... }

const { createClient } = require('@supabase/supabase-js');

// Configuration
const RATE_LIMITS = {
  analyze: { requestsPerHour: 3, tier: 'free' },
  share: { requestsPerHour: 10, tier: 'free' },
  history: { requestsPerHour: 60, tier: 'free' },
  tips: { requestsPerHour: 120, tier: 'free' },
  default: { requestsPerHour: 30, tier: 'free' },
};

const WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Check whether a request is within rate limits.
 *
 * @param {string} identifier  - User session ID or IP address
 * @param {string} endpoint    - Endpoint name (e.g. 'analyze', 'share')
 * @returns {{ allowed: boolean, remaining: number, resetAt: number, total: number }}
 */
async function checkRateLimit(identifier, endpoint = 'default') {
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();
  const resetAt = Date.now() + WINDOW_MS; // approximate next reset

  // If Supabase isn't configured, allow all requests
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('Rate limit check skipped: Supabase not configured');
    return {
      allowed: true,
      remaining: config.requestsPerHour - 1,
      resetAt,
      total: config.requestsPerHour,
    };
  }

  try {
    // Count requests from this identifier in the current window
    const { count, error } = await supabase
      .from('rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('identifier', identifier)
      .eq('endpoint', endpoint)
      .gte('created_at', windowStart);

    if (error) {
      console.error('Rate limit query error:', error.message);
      // Fail open — allow the request but log the error
      return { allowed: true, remaining: 1, resetAt, total: config.requestsPerHour };
    }

    const currentCount = count || 0;
    const allowed = currentCount < config.requestsPerHour;
    const remaining = Math.max(0, config.requestsPerHour - currentCount - (allowed ? 1 : 0));

    if (allowed) {
      // Record this request (fire and forget)
      supabase
        .from('rate_limits')
        .insert({
          identifier,
          endpoint,
          created_at: new Date().toISOString(),
        })
        .then(({ error: insertError }) => {
          if (insertError) console.error('Rate limit insert error:', insertError.message);
        });
    }

    // Estimate the reset time based on the oldest request in this window
    let actualResetAt = resetAt;
    if (!allowed) {
      const { data: oldest } = await supabase
        .from('rate_limits')
        .select('created_at')
        .eq('identifier', identifier)
        .eq('endpoint', endpoint)
        .gte('created_at', windowStart)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (oldest?.created_at) {
        actualResetAt = new Date(oldest.created_at).getTime() + WINDOW_MS;
      }
    }

    return {
      allowed,
      remaining,
      resetAt: actualResetAt,
      total: config.requestsPerHour,
      currentCount: currentCount + (allowed ? 1 : 0),
    };
  } catch (err) {
    console.error('Rate limit check failed:', err.message);
    // Fail open on unexpected errors
    return { allowed: true, remaining: 1, resetAt, total: config.requestsPerHour };
  }
}

/**
 * Convenience: get rate limit status without consuming a request
 *
 * @param {string} identifier
 * @param {string} endpoint
 * @returns {{ remaining: number, resetAt: number, total: number }}
 */
async function getRateLimitStatus(identifier, endpoint = 'default') {
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();
  const resetAt = Date.now() + WINDOW_MS;

  const supabase = getSupabase();
  if (!supabase) {
    return { remaining: config.requestsPerHour, resetAt, total: config.requestsPerHour };
  }

  try {
    const { count } = await supabase
      .from('rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('identifier', identifier)
      .eq('endpoint', endpoint)
      .gte('created_at', windowStart);

    const currentCount = count || 0;
    return {
      remaining: Math.max(0, config.requestsPerHour - currentCount),
      resetAt,
      total: config.requestsPerHour,
      currentCount,
    };
  } catch (err) {
    return { remaining: config.requestsPerHour, resetAt, total: config.requestsPerHour };
  }
}

/**
 * Cleanup old rate limit records (call periodically from a cron function)
 */
async function cleanupOldRecords() {
  const supabase = getSupabase();
  if (!supabase) return;

  const cutoff = new Date(Date.now() - WINDOW_MS * 2).toISOString();
  const { error } = await supabase.from('rate_limits').delete().lt('created_at', cutoff);

  if (error) {
    console.error('Rate limit cleanup error:', error.message);
  }
}

module.exports = { checkRateLimit, getRateLimitStatus, cleanupOldRecords, RATE_LIMITS };
