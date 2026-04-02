const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { name, email, subject, message } = JSON.parse(event.body);

    // Validate required fields
    if (!name || !email || !message) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Name, email, and message are required' }) };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid email address' }) };
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { error } = await supabase
      .from('contact_messages')
      .insert({ name, email, subject: subject || 'General Inquiry', message });

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: "Thanks! We'll get back to you within 24 hours." })
    };

  } catch (error) {
    console.error('Contact form error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to send message' }) };
  }
};
