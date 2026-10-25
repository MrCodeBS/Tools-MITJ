// Vercel Edge Function - Server-side access validation
// This runs on Vercel's servers, not in the browser
// Includes XSS protection and input sanitization

export const config = {
  runtime: 'edge',
};

// Sanitize and validate input to prevent XSS/injection
function sanitizeInput(input) {
  if (typeof input !== 'string') return null;
  // Only allow alphanumeric, underscore, and hyphen (valid for Clerk IDs)
  const sanitized = input.replace(/[^a-zA-Z0-9_-]/g, '');
  // Clerk session IDs are typically 30-50 chars
  if (sanitized.length < 10 || sanitized.length > 100) return null;
  return sanitized;
}

// Validate origin to prevent CSRF
function isValidOrigin(request) {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'https://tools.my-it-journey.ch',
    'https://tools-mitj.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
  ];
  return !origin || allowedOrigins.some(allowed => origin.startsWith(allowed));
}

export default async function handler(request) {
  // Security headers for all responses
  const securityHeaders = {
    'Access-Control-Allow-Origin': 'https://tools.my-it-journey.ch',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  // Only allow POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: securityHeaders,
    });
  }

  // Validate origin
  if (!isValidOrigin(request)) {
    return new Response(JSON.stringify({ access: false, error: 'Invalid origin' }), {
      status: 403,
      headers: securityHeaders,
    });
  }

  try {
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ access: false, error: 'Invalid JSON' }), {
        status: 400,
        headers: securityHeaders,
      });
    }

    // Sanitize session token
    const sessionToken = sanitizeInput(body?.sessionToken);
    if (!sessionToken) {
      return new Response(JSON.stringify({ access: false, error: 'Invalid session token' }), {
        status: 401,
        headers: securityHeaders,
      });
    }

    // Verify session with Clerk Backend API
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    
    if (!clerkSecretKey) {
      console.error('CLERK_SECRET_KEY not configured');
      return new Response(JSON.stringify({ access: false, error: 'Server configuration error' }), {
        status: 500,
        headers: securityHeaders,
      });
    }

    // Get session data
    const sessionResponse = await fetch(`https://api.clerk.com/v1/sessions/${sessionToken}`, {
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
      },
    });

    if (!sessionResponse.ok) {
      return new Response(JSON.stringify({ access: false, error: 'Invalid session' }), {
        status: 401,
        headers: securityHeaders,
      });
    }

    const sessionData = await sessionResponse.json();
    
    // Validate session is active
    if (sessionData.status !== 'active') {
      return new Response(JSON.stringify({ access: false, error: 'Session expired' }), {
        status: 401,
        headers: securityHeaders,
      });
    }

    const userId = sessionData.user_id;

    // Get user data to check paid status
    const userResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
      },
    });

    if (!userResponse.ok) {
      return new Response(JSON.stringify({ access: false, error: 'User not found' }), {
        status: 401,
        headers: securityHeaders,
      });
    }

    const userData = await userResponse.json();
    const isPaid = userData.public_metadata?.paid === true;

    // Return minimal data (avoid leaking sensitive info)
    return new Response(JSON.stringify({ 
      access: isPaid,
    }), {
      status: 200,
      headers: securityHeaders,
    });

  } catch (error) {
    console.error('Verify access error:', error.message);
    return new Response(JSON.stringify({ access: false, error: 'Server error' }), {
      status: 500,
      headers: securityHeaders,
    });
  }
}
